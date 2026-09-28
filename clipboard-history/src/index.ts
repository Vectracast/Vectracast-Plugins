import { defineExtension, defineSearchCommand, copyHistoryAction, pasteHistoryAction, removeHistoryAction, clearHistoryAction } from "@platform/sdk";

export default defineExtension({ commands: [defineSearchCommand({
  id: "history",
  async query(ctx) {
    const history = await ctx.clipboard.history();
    const terms = ctx.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const kind = (entry: typeof history[number]) => entry.kind === "image" ? "image" : /^https?:\/\/\S+$/i.test(entry.text.trim()) ? "link" : "text";
    const matches = history.filter(entry => {
      const content = (entry.text + " " + entry.source).toLocaleLowerCase();
      return (!ctx.filter || ctx.filter === "all" || kind(entry) === ctx.filter) && terms.every(term => content.includes(term));
    }).sort((a, b) => b.timestamp - a.timestamp);
    if (!matches.length) return { items: [{
      id: "empty", title: history.length ? "没有匹配的记录" : "还没有剪贴板记录",
      subtitle: "复制文本或图片后重新打开查看", icon: "clipboard", actions: history.length ? [clearHistoryAction()] : [],
      preview: { text: history.length ? "试试其他关键词或内容类型。" : "复制文本或图片后，会在这里显示。\n\n记录仅保存在本机，保留 7 天。" },
    }] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return { items: matches.slice(0, 40).map(entry => {
      const isImage = kind(entry) === "image";
      const preview = entry.text.replace(/\s+/g, " ").trim();
      const date = new Date(entry.timestamp);
      const pad = (n: number) => String(n).padStart(2, "0");
      const time = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
      const group = midnight.getTime() === today.getTime() ? "今天" : midnight.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime() ? "昨天" : `${pad(date.getMonth() + 1)} 月 ${pad(date.getDate())} 日`;
      return {
        id: entry.id, title: isImage ? `图片 (${entry.width}×${entry.height})` : preview.length > 120 ? preview.slice(0, 120) + "…" : preview,
        subtitle: `${entry.source} · ${time}`, group,
        icon: isImage ? "photo" : kind(entry) === "link" ? "link" : "doc",
        preview: isImage ? { historyImageID: entry.id } : { text: entry.text },
        metadata: [
          {label:"来源", value:entry.source},
          {label:"内容类型",value:isImage ? "图片" : kind(entry) === "link" ? "链接" : "文本"},
          ...(isImage ? [{label:"尺寸",value:`${entry.width} × ${entry.height}`},{label:"大小",value:`${((entry.byteCount ?? 0) / 1024).toFixed(1)} KB`}] : [{label:"字符数",value:String(Array.from(entry.text).length)},{label:"词数",value:String(entry.text.trim() ? entry.text.trim().split(/\s+/).length : 0)}]),
          {label:"复制时间",value:time},
        ],
        actions: [copyHistoryAction(entry), pasteHistoryAction(entry), removeHistoryAction(entry), clearHistoryAction()],
      };
    }) };
  },
})] });
