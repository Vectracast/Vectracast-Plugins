import { defineExtension, defineSearchCommand, copyAction, type ResultItem } from "@platform/sdk";

export function truncateInput(text: string): string {
  const chars = Array.from(text);
  return chars.length <= 20 ? text : chars.slice(0, 10).join("") + chars.length + chars.slice(-10).join("");
}
export function parseYoudao(data: unknown): ResultItem[] {
  if (!data || typeof data !== "object") throw new Error("有道返回了无效响应。");
  const value = data as { errorCode?: string; translation?: string[]; basic?: { explains?: string[] }; web?: { key?: string; value?: string[] }[] };
  if (String(value.errorCode) !== "0") {
    const errors: Record<string, string> = { "101": "缺少请求参数", "103": "原文过长", "108": "应用 ID 无效", "110": "应用未绑定文本翻译服务", "202": "签名校验失败，请检查应用 ID 和密钥", "207": "请求被判定为重复，请重新查询", "411": "访问过于频繁，请稍后重试", "412": "长文本请求过于频繁，请稍后重试", "401": "账户欠费，请在有道控制台检查余额" };
    throw new Error(errors[String(value.errorCode)] ?? `有道服务错误（${value.errorCode ?? "未知"}）`);
  }
  const items: ResultItem[] = []; const seen = new Set<string>();
  function add(text: unknown, label: string) {
    if (typeof text !== "string" || !text.trim() || seen.has(text.trim())) return;
    seen.add(text.trim());
    items.push({ id: String(items.length), title: text.trim(), subtitle: label, icon: "character.bubble", actions: [copyAction(text.trim())] });
  }
  if (Array.isArray(value.translation)) value.translation.forEach(t => add(t, "有道 · 译文"));
  if (Array.isArray(value.basic?.explains)) value.basic.explains.forEach(t => add(t, "基础释义"));
  if (Array.isArray(value.web)) value.web.forEach(w => { if (w && Array.isArray(w.value)) w.value.forEach(t => add(t, `网络释义${w.key ? " · " + w.key : ""}`)) });
  if (!items.length) throw new Error("有道没有返回译文。");
  return items.slice(0, 50);
}

export default defineExtension({ commands: [defineSearchCommand({
  id: "translate",
  async query(ctx) {
    const text = ctx.query.trim();
    if (!text) return { items: [] };
    if (Array.from(text).length > 5000) throw new Error("请将原文控制在 5000 字以内。");
    const appKey = ctx.preferences.appKey?.trim();
    const secret = await ctx.secrets.get("appSecret");
    if (!appKey || !secret) throw new Error("请先在扩展设置中填写有道应用 ID 和密钥。");
    const salt = ctx.crypto.uuid();
    const curtime = String(Math.floor(Date.now() / 1000));
    const automatic = !ctx.preferences.target || ctx.preferences.target === "auto";
    const target = automatic ? (/\p{Script=Han}/u.test(text) ? "en" : "zh-CHS") : ctx.preferences.target;
    const fields = { q: text, from: "auto", to: target, appKey, salt, curtime, signType: "v3", strict: automatic ? "false" : "true", sign: ctx.crypto.sha256(appKey + truncateInput(text) + salt + curtime + secret) };
    const body = Object.entries(fields).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
    const response = await ctx.network.fetch("https://openapi.youdao.com/api", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (response.status !== 200) throw new Error(`有道请求失败（HTTP ${response.status}）`);
    return { items: parseYoudao(JSON.parse(response.body)) };
  },
})] });
