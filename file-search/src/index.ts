import { defineExtension, defineSearchCommand, type FileEntry, type ResultItem } from "@platform/sdk";
const icons: Record<string, string> = {folder:"folder", document:"doc.text", image:"photo", audio:"music.note", video:"film", other:"doc"};
const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
function score(file: FileEntry, query: string) {
  const name = normalize(file.name);
  return name === query ? 0 : name.startsWith(query) ? 1 : 2;
}
export default defineExtension({commands:[defineSearchCommand({
  id: "files",
  async query(ctx) {
    const query = ctx.query.trim();
    const message = (title: string, subtitle: string): {items: ResultItem[]} => ({items:[{id:"status", title, subtitle, icon:"doc.text.magnifyingglass", actions:[]}]});
    if (!query) return message("输入文件名开始搜索", "搜索用户目录中的文件与文件夹 · 支持中文、英文和扩展名");
    if (query.length > 200) return message("文件名过长", "请将搜索内容缩短到 200 字以内");
    const kind = ctx.filter || "all";
    const snapshot = await ctx.files.search(query, kind);
    const normalized = normalize(query);
    const files = snapshot.files.filter(file => normalize(file.name).includes(normalized) && (kind === "all" || file.kind === kind))
      .sort((a,b) => score(a,normalized)-score(b,normalized) || b.modified-a.modified || a.path.localeCompare(b.path));
    if (!files.length) return message(snapshot.timedOut ? "搜索暂未完成" : "没有找到匹配文件", snapshot.timedOut ? "Spotlight 响应较慢，请稍后重试或输入更具体的文件名" : snapshot.limited ? "匹配范围较大，请输入更具体的文件名" : "仅搜索用户目录内 Spotlight 已索引的文件；可缩短文件名或切换类型");
    const limited = snapshot.limited || files.length > 50;
    return {items:files.slice(0,50).map((file): ResultItem => ({
      id:file.id, fileID:file.id, title:file.name, subtitle:file.path,
      group:limited ? "搜索结果 · 前 50 项" : "搜索结果",
      icon:icons[file.kind] || "doc",
      actions:[
        {id:"open",title:file.kind === "folder" ? "打开文件夹" : "打开文件",type:"file.open",text:file.id,icon:"arrow.up.forward.app",shortcut:{key:"return",modifiers:[]}},
        {id:"reveal",title:"在 Finder 中显示",type:"file.reveal",text:file.id,icon:"folder",shortcut:{key:"return",modifiers:["command"]}},
        {id:"path",title:"复制路径",type:"clipboard.copy",text:file.path,icon:"doc.on.clipboard",shortcut:{key:"c",modifiers:["command","shift"]}},
        {id:"name",title:"复制名称",type:"clipboard.copy",text:file.name,icon:"doc.on.doc"}
      ]
    }))};
  }
})]});
