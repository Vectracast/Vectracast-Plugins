import { defineExtension, defineSearchCommand, copyAction } from "@platform/sdk";
import { calculate } from "./calculator";
export default defineExtension({ commands: [defineSearchCommand({
  id: "calculate",
  async query({ query }) {
    const calculation = calculate(query);
    if (!calculation) return { items: [] };
    if ("error" in calculation) return { items: [{ id: "error", title: calculation.error, subtitle: "计算器", icon: "exclamationmark.triangle", actions: [] }] };
    return { items: calculation.values.map(value => ({ id: `base-${value.radix}`, title: value.text, subtitle: value.label, icon: "equal.square", actions: [copyAction(value.text)] })) };
  },
})] });
