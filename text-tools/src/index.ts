import { defineExtension, defineSearchCommand, copyAction } from "@platform/sdk";
export default defineExtension({ commands: [defineSearchCommand({
  id: "transform",
  async query({ query }) {
    if (!query.trim()) return { items: [] };
    return { items: [
      { id: "uppercase", title: query.toLocaleUpperCase(), subtitle: "大写", icon: "textformat", actions: [copyAction(query.toLocaleUpperCase())] },
      { id: "lowercase", title: query.toLocaleLowerCase(), subtitle: "小写", icon: "textformat", actions: [copyAction(query.toLocaleLowerCase())] },
      { id: "trim", title: query.trim(), subtitle: "去除首尾空格", icon: "text.alignleft", actions: [copyAction(query.trim())] },
    ] };
  },
})] });
