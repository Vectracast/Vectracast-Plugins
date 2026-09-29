import { defineExtension, defineSearchCommand, type ResultItem } from "@platform/sdk";

type Engine = "google" | "baidu";

const engineLabels: Record<Engine, string> = { google: "Google", baidu: "百度" };

function searchURL(engine: Engine, query: string): string {
  const encoded = encodeURIComponent(query);
  return engine === "google"
    ? `https://www.google.com/search?q=${encoded}`
    : `https://www.baidu.com/s?wd=${encoded}`;
}

function websiteURL(input: string): string | undefined {
  if (/\s/.test(input)) return undefined;
  const candidate = /^https:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password ||
      url.port
    ) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function searchResults(input: string, engines: Engine[] = ["google", "baidu"]): ResultItem[] {
  const query = input.trim();
  if (!query) return [];

  const site = websiteURL(query);
  const term = site ? `site:${new URL(site).hostname}` : query;
  const results = engines.map((engine): ResultItem => ({
    id: engine,
    title: `在 ${engineLabels[engine]} 搜索「${term}」`,
    subtitle: `${engineLabels[engine]} · 网页搜索`,
    icon: "magnifyingglass",
    actions: [{
      id: "open",
      title: `打开 ${engineLabels[engine]} 搜索结果`,
      type: "url.open",
      text: searchURL(engine, term),
      icon: "arrow.up.forward.app",
      shortcut: { key: "return", modifiers: [] },
    }],
  }));

  if (site && engines.length === 2) {
    results.push({
      id: "website",
      title: `直接打开 ${new URL(site).hostname}`,
      subtitle: site,
      icon: "globe",
      actions: [{
        id: "open",
        title: "在浏览器中打开网站",
        type: "url.open",
        text: site,
        icon: "arrow.up.forward.app",
        shortcut: { key: "return", modifiers: [] },
      }],
    });
  }
  return results;
}

function command(id: string, engines: Engine[]) {
  return defineSearchCommand({
    id,
    async query(ctx) {
      const query = ctx.query.trim();
      if (!query) return { items: [{
        id: "empty",
        title: "输入关键词或网站开始搜索",
        subtitle: "支持 Google 和百度；搜索词只会在选择后交给浏览器。",
        icon: "globe",
        actions: [],
      }] };
      if (Array.from(query).length > 1000) return { items: [{
        id: "too-long",
        title: "搜索内容过长",
        subtitle: "请缩短搜索词后重试。",
        icon: "exclamationmark.triangle",
        actions: [],
      }] };
      const items = searchResults(query, engines);
      if (items.some(item => item.actions.some(action => (action.text?.length ?? 0) > 2048))) {
        return { items: [{
          id: "url-too-long",
          title: "搜索内容过长",
          subtitle: "请缩短搜索词后重试。",
          icon: "exclamationmark.triangle",
          actions: [],
        }] };
      }
      return { items };
    },
  });
}

export default defineExtension({ commands: [
  command("web", ["google", "baidu"]),
  command("google", ["google"]),
  command("baidu", ["baidu"]),
] });
