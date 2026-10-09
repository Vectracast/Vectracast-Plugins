import {
  defineExtension,
  defineSearchCommand,
  openApplicationAction,
  openURLAction,
  type Application,
  type Action,
  type FanBarStatus,
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

const refresh: Action = {
  id: "refresh",
  title: "刷新 FanBar 状态",
  type: "fanbar.refresh",
  text: "",
  icon: "arrow.clockwise",
};
const presetNames = ["静音", "均衡", "性能", "极速"];

function statusItems(status: FanBarStatus): ResultItem[] {
  const manual = status.fans.some((fan) => fan.isManual);
  const rows: ResultItem[] = [
    {
      id: "fanbar-status",
      title: manual ? "FanBar 手动控制中" : "FanBar 自动控制中",
      subtitle: status.fans.length
        ? status.fans
            .map(
              (fan) =>
                `风扇 ${fan.index + 1} · ${fan.currentRPM} RPM${fan.isManual ? " · 手动" : ""}`,
            )
            .join("  ")
        : "未检测到风扇",
      icon: manual ? "fanblades.fill" : "fanblades",
      actions: [
        refresh,
        {
          id: "restore",
          title: "恢复自动控制",
          type: "fanbar.restore",
          text: "",
          icon: "arrow.uturn.backward",
        },
      ],
    },
  ];
  presetNames.forEach((title, raw) =>
    rows.push({
      id: `preset-${raw}`,
      title: `切换到${title}预设`,
      subtitle: "使用 FanBar 已配置的温度曲线",
      icon:
        raw === 0
          ? "speaker.slash.fill"
          : raw === 3
            ? "flame.fill"
            : "gauge.with.dots.needle.67percent",
      actions: [
        {
          id: `preset-${raw}`,
          title: `应用${title}预设`,
          type: "fanbar.preset",
          text: String(raw),
          icon: "checkmark.circle",
          shortcut:
            raw === 0 ? { key: "1", modifiers: ["command"] } : undefined,
        },
      ],
    }),
  );
  rows.push({
    id: "eighty-percent",
    title: "风扇运行到 80%",
    subtitle: "按每个风扇的硬件上限计算目标转速",
    icon: "speedometer",
    actions: [
      {
        id: "eighty",
        title: "设置为 80%",
        type: "fanbar.eighty",
        text: "",
        icon: "speedometer",
      },
    ],
  });
  return rows;
}

export default defineExtension({
  commands: [
    defineSearchCommand({
      id: "fanbar",
      async query({ query, applications, fanbar }) {
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
        try {
          const status = await fanbar.status();
          const items = statusItems(status);
          items[0].actions = [
            ...items[0].actions,
            ...matches.flatMap(appActions),
          ];
          return { items };
        } catch (error) {
          return {
            items: [
              {
                id: "fanbar-unavailable",
                title: "FanBar 控制服务不可用",
                subtitle: String(
                  error instanceof Error ? error.message : error,
                ),
                icon: "exclamationmark.triangle",
                actions: [...matches.flatMap(appActions), refresh],
              },
            ],
          };
        }
      },
    }),
  ],
});
