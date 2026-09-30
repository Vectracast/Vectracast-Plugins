import { defineExtension, defineSearchCommand, openApplicationAction, type Action, type Application } from "@platform/sdk";
function rank(app: Application, query: string, sensitivity: string): number {
  const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const compact = (text: string) => text.replace(/[\s'’]+/gu, "");
  const schemes = new Set(app.urlSchemes?.map(scheme => scheme.toLowerCase()) ?? []);
  const rendersHTML = app.documentTypes?.some(type => ["public.html", "public.xhtml", "html", "htm", "xhtml"].includes(type.toLowerCase())) === true;
  const categoryTerms = schemes.has("http") && schemes.has("https") && rendersHTML ? ["浏览器", "browser", "web browser", "liulanqi", "liu lan qi", "llq"] : [];
  const names = [app.name, ...app.searchTerms].map(normalize);
  query = normalize(query);
  // Treat pinyin syllable separators and tone marks as equivalent input, without changing displayed names.
  const joinedQuery = compact(query);
  if (!joinedQuery) return -1;
  const joinedNames = names.map(compact);
  if (names.includes(query) || joinedNames.includes(joinedQuery)) return 0;
  if (names.some(name => name.startsWith(query)) || joinedNames.some(name => name.startsWith(joinedQuery))) return 1;
  if (names.some(name => name.includes(query)) || joinedNames.some(name => name.includes(joinedQuery))) return 2;
  // Bundle identifiers are useful aliases for brand searches such as "Apple".
  // Match complete components to avoid flooding results with generic pieces like "com".
  const bundleID = normalize(app.bundleIdentifier ?? "");
  const bundleParts = bundleID.split(/[.\-_]+/u).filter(Boolean);
  const queryParts = query.split(/[.\-_]+/u).filter(Boolean);
  if (queryParts.length > 1) {
    const offset = bundleParts.findIndex((_, index) => queryParts.every((part, partIndex) => bundleParts[index + partIndex] === part));
    if (offset >= 0) return queryParts.length === bundleParts.length && offset === 0 ? 0.5 : 1.5;
  } else if (query.length >= 2 && !["com", "org", "net"].includes(query)) {
    if (bundleParts.includes(query)) return 2.5;
    if (sensitivity !== "high" && bundleParts.some(part => part.startsWith(query))) return 3;
    if (sensitivity === "low" && bundleParts.some(part => part.includes(query))) return 4;
  }
  // Category matching belongs to the plugin; exact application names keep priority.
  if (categoryTerms.some(term => compact(normalize(term)) === joinedQuery)) return 2.5;
  if (sensitivity === "high" || query.length < 2) return -1;
  const initials = app.name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word[0]).join("").toLocaleLowerCase();
  if (initials.startsWith(query)) return 3;
  if (sensitivity !== "low") return -1;
  for (const name of names) {
    let position = 0, first = -1, last = -1;
    for (let i = 0; i < name.length && position < query.length; i++) {
      if (name[i] === query[position]) { if (first < 0) first = i; last = i; position++; }
    }
    if (position === query.length && first === 0 && last + 1 <= query.length * 3) return 4 + (last + 1 - query.length) / 100;
  }
  return -1;
}
export default defineExtension({ commands: [defineSearchCommand({
  id: "search",
  async query({ query, applications, search, storage }) {
    const input = query.trim().toLocaleLowerCase();
    if (!input) return { items: [] };
    const flags = await storage.flags();
    const favoriteKey = (app: Application) => "favorite:" + (app.bundleIdentifier || app.id);
    const matches = (await applications.list()).map(app => ({ app, score: rank(app, input, search?.sensitivity ?? "medium") }))
      .filter(item => item.score >= 0)
      .sort((a, b) => a.score - b.score || Number(flags[favoriteKey(b.app)] === true) - Number(flags[favoriteKey(a.app)] === true) || a.app.name.localeCompare(b.app.name))
      .slice(0, 30);
    function actions(app: Application): Action[] {
      return [openApplicationAction(app),
        {id:"reveal",title:"在 Finder 中显示",type:"application.reveal",text:app.id,icon:"folder",shortcut:{key:"return",modifiers:["command"]}},
        {id:"info",title:"在 Finder 中显示简介",type:"application.info",text:app.id,icon:"info.circle",shortcut:{key:"i",modifiers:["command"]}},
        {id:"contents",title:"显示包内容",type:"application.contents",text:app.id,icon:"shippingbox",shortcut:{key:"i",modifiers:["option","command"]}},
        {id:"favorite",title:flags[favoriteKey(app)] ? "取消收藏" : "添加到收藏",type:"storage.toggle",text:favoriteKey(app),icon:flags[favoriteKey(app)] ? "star.fill" : "star",shortcut:{key:"f",modifiers:["shift","command"]}},
      ];
    }
    return { items: matches.map(({ app }) => ({ id: app.id, title: app.name, subtitle: flags[favoriteKey(app)] ? "应用程序 · 已收藏" : "应用程序", applicationId: app.id, actions: actions(app) })) };
  },
})] });
