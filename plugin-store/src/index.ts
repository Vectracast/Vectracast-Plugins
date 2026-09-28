import {
  defineExtension,
  defineSearchCommand,
  showDetailAction,
  installPluginAction,
  openURLAction,
  type Action,
  type ResultItem,
  type CatalogPlugin,
} from "@platform/sdk";

const refresh: Action = {
  id: "refresh",
  title: "刷新插件目录",
  type: "catalog.refresh",
  text: "",
  icon: "arrow.clockwise",
  shortcut: { key: "r", modifiers: ["command"] },
  section: "catalog",
};
function newer(a: string, b: string): boolean {
  const x = a.split(".").map(Number),
    y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}
function item(plugin: CatalogPlugin): ResultItem {
  const m = plugin.manifest;
  const update =
    plugin.installedVersion && newer(m.version, plugin.installedVersion);
  const state = !plugin.compatible
    ? "需要新版应用"
    : update
      ? "可更新"
      : plugin.installedVersion
        ? "已安装"
        : "可安装";
  const commands = m.commands
    .map(
      (c) =>
        `${c.title}\n${c.id}${c.keywords.length ? " · " + c.keywords.join(" / ") : ""}`,
    )
    .join("\n\n");
  const actions: Action[] = [showDetailAction()];
  if (plugin.compatible && (!plugin.installedVersion || update))
    actions.push(installPluginAction(plugin));
  actions.push(
    {
      ...openURLAction("readme", "查看 README", plugin.readmeURL),
      section: "links",
    },
    openURLAction("source", "查看源代码", plugin.sourceURL),
    {
      id: "copy-url",
      title: "复制插件链接",
      type: "clipboard.copy",
      text: plugin.sourceURL,
      icon: "doc.on.clipboard",
      section: "links",
    },
    refresh,
  );
  return {
    id: m.id,
    title: m.name,
    subtitle: m.description,
    icon: m.icon,
    catalogID: plugin.handle,
    group: update ? "可更新" : plugin.installedVersion ? "已安装" : "发现插件",
    preview: {
      text: `${m.description}\n\n命令\n${commands}\n\n权限\n${plugin.permissions || "无外部能力"}\n\n发布说明\n${plugin.releaseNotes || "暂无更新说明"}`,
    },
    metadata: [
      { label: "版本", value: m.version },
      { label: "状态", value: state },
      { label: "最低应用版本", value: plugin.minimumAppVersion },
      { label: "插件 ID", value: m.id },
      ...(plugin.installedVersion
        ? [{ label: "已安装版本", value: plugin.installedVersion }]
        : []),
    ],
    actions,
  };
}
export default defineExtension({
  commands: [
    defineSearchCommand({
      id: "store",
      async query(ctx) {
        try {
          const catalog = await ctx.catalog.list();
          const terms = ctx.query
            .trim()
            .toLocaleLowerCase()
            .split(/\s+/)
            .filter(Boolean);
          const matches = catalog.plugins
            .filter((p) => {
              const category =
                !ctx.filter ||
                ctx.filter === "all" ||
                (ctx.filter === "installed"
                  ? !!p.installedVersion
                  : p.categories.includes(ctx.filter));
              const haystack = [
                p.manifest.id,
                p.manifest.name,
                p.manifest.description,
                ...p.manifest.commands.flatMap((c) => [
                  c.id,
                  c.title,
                  ...c.keywords,
                ]),
              ]
                .join(" ")
                .toLocaleLowerCase();
              return category && terms.every((t) => haystack.includes(t));
            })
            .map(item);
          const order = ["可更新", "发现插件", "已安装"];
          matches.sort(
            (a, b) =>
              order.indexOf(a.group!) - order.indexOf(b.group!) ||
              a.title.localeCompare(b.title, "zh-CN"),
          );
          if (matches.length) return { items: matches.slice(0, 50) };
          return {
            items: [
              {
                id: "empty",
                title: catalog.plugins.length
                  ? "没有匹配的插件"
                  : "目录中暂无插件",
                subtitle: "试试其他关键词或分类",
                icon: "magnifyingglass",
                actions: [refresh],
              },
            ],
          };
        } catch (error) {
          return {
            items: [
              {
                id: "unavailable",
                title: "暂时无法读取插件商店",
                subtitle:
                  error instanceof Error ? error.message : String(error),
                icon: "exclamationmark.circle",
                preview: {
                  text: "请检查网络连接和插件仓库设置。\n\n尚未发布目录时，需先在插件仓库创建包含 index.json 和安装包的正式 Release。",
                },
                actions: [refresh],
              },
            ],
          };
        }
      },
    }),
  ],
});
