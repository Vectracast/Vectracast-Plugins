import {
  defineExtension,
  defineSearchCommand,
  openApplicationAction,
  openURLAction,
  type Application,
  type ResultItem,
} from "@platform/sdk";

const sourceURL = "https://github.com/helson-lin/FanBar";
const releaseURL = `${sourceURL}/releases/latest`;

function isFanBar(app: Application): boolean {
  const bundle = app.bundleIdentifier.toLocaleLowerCase();
  const name = app.name.toLocaleLowerCase();
  return (
    bundle === "local.fanbar.app" ||
    bundle.includes("fanbar") ||
    name.includes("fanbar")
  );
}

function appActions(app: Application) {
  return [
    openApplicationAction(app),
    openURLAction("source", "查看 FanBar 项目", sourceURL),
    openURLAction("release", "查看最新版本", releaseURL),
  ];
}

function unavailable(): ResultItem {
  return {
    id: "fanbar-not-installed",
    title: "未检测到 FanBar",
    subtitle: "安装 FanBar 后可以从这里快速打开风扇控制面板",
    icon: "fanblades.fill",
    actions: [
      openURLAction("source", "查看 FanBar 项目", sourceURL),
      openURLAction("release", "查看最新版本", releaseURL),
    ],
  };
}

export default defineExtension({
  commands: [
    defineSearchCommand({
      id: "fanbar",
      async query({ query, applications }) {
        const input = query.trim().toLocaleLowerCase();
        const aliases = new Set([
          "fanbar",
          "fan",
          "风扇",
          "散热",
          "cooling",
          "temperature",
        ]);
        const installed = (await applications.list()).filter(isFanBar);
        if (!installed.length) return { items: [unavailable()] };

        const matches = installed.filter((app) => {
          if (!input || aliases.has(input)) return true;
          return `${app.name} ${app.bundleIdentifier} ${app.searchTerms.join(" ")}`
            .toLocaleLowerCase()
            .includes(input);
        });
        if (!matches.length) {
          return {
            items: [
              {
                id: "fanbar-no-match",
                title: "没有匹配的 FanBar 应用",
                subtitle: "可输入 fanbar、风扇或散热，或者清空搜索查看 FanBar",
                icon: "fanblades.fill",
                actions: [],
              },
            ],
          };
        }
        return {
          items: matches.map((app): ResultItem => ({
            id: app.id,
            title: app.name,
            subtitle: "FanBar · 风扇、温度和散热策略",
            icon: "fanblades.fill",
            applicationId: app.id,
            detail:
              "FanBar 是独立的菜单栏风扇控制器。选择“打开应用”进入 FanBar 面板。",
            actions: appActions(app),
          })),
        };
      },
    }),
  ],
});
