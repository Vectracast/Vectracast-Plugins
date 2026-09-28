/** Exact rational arithmetic: no eval, network, or binary floating-point integer conversion. */
export interface CalculationValue { text: string; label: string; radix: number }
export type Calculation = { values: CalculationValue[] } | { error: string };
const abs = (n: bigint) => n < 0n ? -n : n;
function gcd(a: bigint, b: bigint): bigint { while (b) [a, b] = [b, a % b]; return a; }
class Rational {
  readonly n: bigint; readonly d: bigint;
  constructor(n: bigint, d = 1n) {
    if (d === 0n) throw new Error("不能除以 0");
    if (d < 0n) { n = -n; d = -d; }
    const factor = gcd(abs(n), d); this.n = n / factor; this.d = d / factor;
    if (abs(this.n).toString(2).length > 4096 || this.d.toString(2).length > 4096) throw new Error("计算结果超出 4096 位精度上限");
  }
  add(b: Rational) { return new Rational(this.n * b.d + b.n * this.d, this.d * b.d); }
  neg() { return new Rational(-this.n, this.d); }
  mul(b: Rational) { return new Rational(this.n * b.n, this.d * b.d); }
  div(b: Rational) { return new Rational(this.n * b.d, this.d * b.n); }
  rem(b: Rational) {
    if (b.n === 0n) throw new Error("不能对 0 取余");
    const quotient = (this.n * b.d) / (this.d * b.n);
    return this.add(b.mul(new Rational(quotient)).neg());
  }
  pow(b: Rational) {
    if (b.d !== 1n || abs(b.n) > 128n) throw new Error("指数需要是 −128 到 128 的整数");
    let result = new Rational(1n);
    for (let i = 0; i < Number(abs(b.n)); i++) result = result.mul(this);
    return b.n < 0n ? new Rational(1n).div(result) : result;
  }
  decimal() {
    const n = abs(this.n); let remainder = n % this.d;
    let text = (this.n < 0n ? "-" : "") + String(n / this.d);
    if (remainder) {
      text += ".";
      for (let i = 0; i < 20 && remainder; i++) { remainder *= 10n; text += String(remainder / this.d); remainder %= this.d; }
    }
    return { text, approximate: remainder !== 0n };
  }
}
class Parser {
  private position = 0;
  constructor(private readonly source: string) {}
  space() { while (/\s/.test(this.source[this.position] ?? "") && this.position < this.source.length) this.position++; }
  take(symbol: string) { this.space(); if (this.source[this.position] !== symbol) return false; this.position++; return true; }
  end() { this.space(); return this.position === this.source.length; }
  expression(): Rational {
    let value = this.term();
    while (true) { if (this.take("+")) value = value.add(this.term()); else if (this.take("-")) value = value.add(this.term().neg()); else return value; }
  }
  private term(): Rational {
    let value = this.unary();
    while (true) {
      if (this.take("*") || this.take("x")) value = value.mul(this.unary());
      else if (this.take("/")) value = value.div(this.unary());
      else if (this.take("%")) value = value.rem(this.unary());
      else return value;
    }
  }
  private unary(): Rational { if (this.take("+")) return this.unary(); if (this.take("-")) return this.unary().neg(); return this.power(); }
  private power(): Rational { const value = this.atom(); return this.take("^") ? value.pow(this.unary()) : value; }
  private atom(): Rational {
    if (this.take("(")) { const value = this.expression(); if (!this.take(")")) throw new Error("请补全右括号"); return value; }
    this.space(); const remaining = this.source.slice(this.position);
    // Consume the numeric prefix before treating a following x as multiplication.
    // This preserves 0x200 while also allowing 0xff x 2 and 0xffx2.
    const radix = remaining.match(/^0(?:x[0-9a-f]*|o[0-7]*|b[01]*)/);
    if (radix) {
      this.position += radix[0].length;
      try { return new Rational(BigInt(radix[0])); } catch { throw new Error("进制数字无效，请检查 0x / 0b / 0o 后的数字"); }
    }
    const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);
    if (!number) throw new Error("请继续输入数字或算式");
    this.position += number[0].length;
    const [mantissa, exponentText = "0"] = number[0].split("e"); const exponent = Number(exponentText);
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 128) throw new Error("科学计数法的指数范围为 −128 到 128");
    const [whole, fractional = ""] = mantissa.split(".");
    const digits = whole + fractional;
    if (digits.length > 128) throw new Error("单个数字最多支持 128 位十进制数字");
    const scale = fractional.length - exponent;
    return scale >= 0 ? new Rational(BigInt(digits), 10n ** BigInt(scale)) : new Rational(BigInt(digits) * 10n ** BigInt(-scale));
  }
}
const bases: Record<string, number> = {
  bin: 2, binary: 2, "2": 2, "2进制": 2, "二进制": 2,
  oct: 8, octal: 8, "8": 8, "8进制": 8, "八进制": 8,
  dec: 10, decimal: 10, "10": 10, "10进制": 10, "十进制": 10,
  hex: 16, hexadecimal: 16, "16": 16, "16进制": 16, "十六进制": 16,
};
export function calculate(input: string): Calculation | null {
  if (input.length > 256) return null;
  const operators: Record<string, string> = { "加": "+", "减": "-", "乘": "*", "乘以": "*", "除": "/", "除以": "/" };
  let source = input.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/乘以|除以|加|减|乘|除/g, word => operators[word])
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").trim().toLowerCase();
  let target: number | undefined;
  const conversion = source.match(/^(.+?)(?:\s+(?:to|in)\s+|\s*转\s*)([a-z0-9一二八十六进制]+)$/);
  if (conversion) { target = bases[conversion[2]]; if (!target) return null; source = conversion[1].trim(); }
  else {
    const wrapper = source.match(/^(hex|bin|oct|dec)\((.*)\)$/);
    if (wrapper) { target = bases[wrapper[1]]; source = wrapper[2].trim(); }
  }
  if (!/^[\d.+\-(]/.test(source) || !/^[0-9abcdefxob.\s+*/%^()\-]+$/.test(source)) return null;
  try {
    const parser = new Parser(source); const value = parser.expression();
    if (!parser.end()) throw new Error("算式格式不完整，请检查符号");
    const decimal = value.decimal();
    let values: CalculationValue[] = [{ text: decimal.text, label: decimal.approximate ? "十进制 · 约值（20 位小数）" : "十进制", radix: 10 }];
    if (value.d === 1n) {
      const sign = value.n < 0n ? "-" : "";
      for (const [radix, label, prefix] of [[16, "十六进制", "0x"], [2, "二进制", "0b"], [8, "八进制", "0o"]] as const) {
        values.push({ text: sign + prefix + abs(value.n).toString(radix).toUpperCase(), label, radix });
      }
    }
    if (target) {
      const selected = values.find(v => v.radix === target);
      if (!selected) throw new Error("进制转换目前支持整数，请先得到整数结果");
      values = [selected, ...values.filter(v => v.radix !== target)];
    }
    return { values };
  } catch (error) { return { error: error instanceof Error ? error.message : "无法计算这个表达式" }; }
}
