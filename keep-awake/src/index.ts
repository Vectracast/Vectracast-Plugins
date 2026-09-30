import { defineExtension, defineSearchCommand, type Action, type ResultItem } from "@platform/sdk";

const refresh: Action = { id: "refresh", title: "刷新电源状态", type: "power.refresh", text: "", icon: "arrow.clockwise" };
const notice = "保持唤醒会全局禁用系统休眠，电池供电时同样生效。退出应用、停用或卸载插件不会恢复设置，请先选择「恢复原设置」。建议接电并保持通风，不要将仍在运行的电脑放进包内。合盖和网络行为受机型、系统与网络环境影响，不保证持续联网。";

export default defineExtension({ commands: [defineSearchCommand({
  id: "awake",
  async query({ query, power }) {
    let state;
    try { state = await power.status(); }
    catch (error) {
      return { items: [{ id: "unavailable", title: "暂时无法读取电源状态", subtitle: String(error instanceof Error ? error.message : error), icon: "exclamationmark.circle", actions: [refresh] }] };
    }
    const supply = state.powerSource === "ac" ? "已连接电源" : state.powerSource === "battery" ? "正在使用电池" : "供电状态未知";
    const rows: ResultItem[] = [{
      id: "status", title: state.sleepDisabled ? "系统休眠已禁用" : "系统休眠未禁用", icon: state.sleepDisabled ? "sun.max" : "moon",
      subtitle: `${supply} · ${state.canRestore ? "已保存原设置，可恢复" : state.sleepDisabled ? "由其他工具设置" : "按系统原有策略休眠"}`,
      actions: [refresh],
    }];
    if (!state.sleepDisabled) rows.push({
      id: "enable", title: "开启合盖保持唤醒", icon: "cup.and.saucer",
      subtitle: "需要管理员授权 · 全局生效，退出后仍保持 · 建议接电并通风",
      actions: [{ id: "enable", title: "开启保持唤醒", type: "power.enable", text: "", icon: "sun.max" }],
    });
    if (state.canRestore) rows.push({
      id: "restore", title: "恢复原设置", icon: "arrow.uturn.backward",
      subtitle: "恢复开启前的休眠开关 · 取消或失败后也可通过此项恢复",
      actions: [{ id: "restore", title: "恢复原设置", type: "power.restore", text: "", icon: "arrow.uturn.backward" }],
    });
    else if (state.sleepDisabled) rows.push({
      id: "external", title: "请在原工具中恢复休眠", subtitle: "当前状态不是本插件开启，没有可用的原设置备份", icon: "info.circle", actions: [refresh],
    });
    rows.push({ id: "notice", title: "使用说明与注意事项", subtitle: "电池模式也会生效；停用或卸载前请先恢复原设置", icon: "info.circle", detail: notice, actions: [{ id: "help", title: "查看说明", type: "view.detail", text: "" }] });
    const term = query.trim().toLocaleLowerCase();
    return { items: term ? rows.filter(row => `${row.title} ${row.subtitle ?? ""}`.toLocaleLowerCase().includes(term)) : rows };
  },
})] });
