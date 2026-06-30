/**
 * Derived columns — Origin's "F(x)" column formula, brought to the web. Two
 * paths: one-click transforms (log, normalise, Δ, …) and a free-form expression
 * with {column} references. Both produce a new numeric column aligned to the
 * dataset rows (null where a source value is missing or undefined).
 */

import type { CellValue, Dataset } from "@/types";

export type RowValues = (number | null)[];

/** Pull one column out of the row matrix as a per-row number|null array. */
export function columnPerRow(dataset: Dataset, name: string): RowValues {
  const col = dataset.columns.find((c) => c.name === name);
  if (!col) return dataset.rows.map(() => null);
  return dataset.rows.map((r) => {
    const v = r[col.index];
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string" && v !== "" && !isNaN(Number(v))) return Number(v);
    return null;
  });
}

/* ------------------------------------------------------------------ *
 * One-click transforms.
 * ------------------------------------------------------------------ */

export interface TransformDef {
  id: string;
  label: string;
  desc: string;
  /** Default suffix appended to the source column name. */
  suffix: string;
}

export const TRANSFORMS: TransformDef[] = [
  { id: "log10", label: "log₁₀(x)", desc: "Base-10 log (great for dose).", suffix: "_log10" },
  { id: "ln", label: "ln(x)", desc: "Natural log.", suffix: "_ln" },
  { id: "log2", label: "log₂(x)", desc: "Base-2 log.", suffix: "_log2" },
  { id: "exp", label: "eˣ", desc: "Exponential.", suffix: "_exp" },
  { id: "sqrt", label: "√x", desc: "Square root.", suffix: "_sqrt" },
  { id: "square", label: "x²", desc: "Square.", suffix: "_sq" },
  { id: "reciprocal", label: "1 / x", desc: "Reciprocal.", suffix: "_recip" },
  { id: "abs", label: "|x|", desc: "Absolute value.", suffix: "_abs" },
  { id: "zscore", label: "z-score", desc: "Standardise: (x − mean) / SD.", suffix: "_z" },
  { id: "minmax", label: "min–max [0,1]", desc: "Scale to the 0–1 range.", suffix: "_scaled" },
  { id: "center", label: "center (x − mean)", desc: "Mean-centre.", suffix: "_centered" },
  { id: "cumsum", label: "cumulative sum", desc: "Running total in row order.", suffix: "_cumsum" },
  { id: "diff", label: "Δ (x − xₚᵣₑᵥ)", desc: "First difference (row order).", suffix: "_diff" },
  { id: "pctchange", label: "% change", desc: "Percent change vs previous row.", suffix: "_pct" },
];

export function applyTransform(values: RowValues, id: string): RowValues {
  const clean = values.filter((v): v is number => v != null);
  const n = clean.length;
  const mean = n ? clean.reduce((a, b) => a + b, 0) / n : 0;
  const sd =
    n > 1
      ? Math.sqrt(clean.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
      : 0;
  const min = n ? Math.min(...clean) : 0;
  const max = n ? Math.max(...clean) : 0;

  const safe = (v: number | null, f: (x: number) => number): number | null => {
    if (v == null) return null;
    const r = f(v);
    return isFinite(r) ? r : null;
  };

  switch (id) {
    case "log10":
      return values.map((v) => safe(v, (x) => Math.log10(x)));
    case "ln":
      return values.map((v) => safe(v, (x) => Math.log(x)));
    case "log2":
      return values.map((v) => safe(v, (x) => Math.log2(x)));
    case "exp":
      return values.map((v) => safe(v, (x) => Math.exp(x)));
    case "sqrt":
      return values.map((v) => safe(v, (x) => Math.sqrt(x)));
    case "square":
      return values.map((v) => safe(v, (x) => x * x));
    case "reciprocal":
      return values.map((v) => safe(v, (x) => 1 / x));
    case "abs":
      return values.map((v) => safe(v, (x) => Math.abs(x)));
    case "zscore":
      return values.map((v) => (v == null || sd === 0 ? null : (v - mean) / sd));
    case "minmax":
      return values.map((v) =>
        v == null || max === min ? null : (v - min) / (max - min),
      );
    case "center":
      return values.map((v) => (v == null ? null : v - mean));
    case "cumsum": {
      let acc = 0;
      return values.map((v) => {
        if (v == null) return null;
        acc += v;
        return acc;
      });
    }
    case "diff": {
      let prev: number | null = null;
      return values.map((v) => {
        if (v == null) return null;
        const d = prev == null ? null : v - prev;
        prev = v;
        return d;
      });
    }
    case "pctchange": {
      let prev: number | null = null;
      return values.map((v) => {
        if (v == null) return null;
        const d = prev == null || prev === 0 ? null : ((v - prev) / Math.abs(prev)) * 100;
        prev = v;
        return d;
      });
    }
    default:
      return values.map(() => null);
  }
}

/* ------------------------------------------------------------------ *
 * Free-form expression evaluator (shunting-yard → RPN).
 * ------------------------------------------------------------------ */

type Tok =
  | { t: "num"; v: number }
  | { t: "col"; v: string }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "paren"; v: "(" | ")" }
  | { t: "comma" };

const FUNCS1: Record<string, (x: number) => number> = {
  log: Math.log,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};
const FUNCS2: Record<string, (a: number, b: number) => number> = {
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  atan2: Math.atan2,
};

const PREC: Record<string, number> = { "+": 2, "-": 2, "*": 3, "/": 3, "%": 3, "^": 4, neg: 5 };
const RIGHT = new Set(["^", "neg"]);

function tokenize(expr: string): Tok[] | string {
  const toks: Tok[] = [];
  let i = 0;
  const prev = () => toks[toks.length - 1];
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "{") {
      const end = expr.indexOf("}", i);
      if (end < 0) return "Unclosed { in column reference";
      toks.push({ t: "col", v: expr.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < expr.length && /[0-9.eE+\-]/.test(expr[j])) {
        // allow exponent sign only right after e/E
        if ((expr[j] === "+" || expr[j] === "-") && !/[eE]/.test(expr[j - 1])) break;
        j++;
      }
      const num = Number(expr.slice(i, j));
      if (isNaN(num)) return `Invalid number near "${expr.slice(i, j)}"`;
      toks.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++;
      const name = expr.slice(i, j).toLowerCase();
      if (!(name in FUNCS1) && !(name in FUNCS2))
        return `Unknown function "${name}" (wrap column names in { })`;
      toks.push({ t: "fn", v: name });
      i = j;
      continue;
    }
    if ("+-*/%^".includes(c)) {
      // unary minus / plus detection
      const p = prev();
      const unary =
        !p || p.t === "op" || (p.t === "paren" && p.v === "(") || p.t === "comma";
      if (c === "-" && unary) toks.push({ t: "op", v: "neg" });
      else if (c === "+" && unary) {
        /* drop unary plus */
      } else toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "paren", v: "(" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "paren", v: ")" });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ t: "comma" });
      i++;
      continue;
    }
    return `Unexpected character "${c}"`;
  }
  return toks;
}

function toRPN(toks: Tok[]): Tok[] | string {
  const out: Tok[] = [];
  const stack: Tok[] = [];
  for (const tk of toks) {
    if (tk.t === "num" || tk.t === "col") out.push(tk);
    else if (tk.t === "fn") stack.push(tk);
    else if (tk.t === "comma") {
      while (stack.length && !(stack[stack.length - 1].t === "paren"))
        out.push(stack.pop()!);
      if (!stack.length) return "Misplaced comma";
    } else if (tk.t === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (
          top.t === "op" &&
          (PREC[top.v] > PREC[tk.v] ||
            (PREC[top.v] === PREC[tk.v] && !RIGHT.has(tk.v)))
        ) {
          out.push(stack.pop()!);
        } else break;
      }
      stack.push(tk);
    } else if (tk.t === "paren" && tk.v === "(") stack.push(tk);
    else if (tk.t === "paren" && tk.v === ")") {
      while (stack.length && !(stack[stack.length - 1].t === "paren"))
        out.push(stack.pop()!);
      if (!stack.length) return "Mismatched parentheses";
      stack.pop(); // remove '('
      if (stack.length && stack[stack.length - 1].t === "fn")
        out.push(stack.pop()!);
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.t === "paren") return "Mismatched parentheses";
    out.push(top);
  }
  return out;
}

export interface CompiledFormula {
  rpn: Tok[];
  cols: string[];
}

export function compileFormula(expr: string): CompiledFormula | { error: string } {
  if (!expr.trim()) return { error: "Empty formula" };
  const toks = tokenize(expr);
  if (typeof toks === "string") return { error: toks };
  const rpn = toRPN(toks);
  if (typeof rpn === "string") return { error: rpn };
  const cols = [...new Set(toks.filter((t) => t.t === "col").map((t) => (t as { v: string }).v))];
  return { rpn, cols };
}

function evalRpn(rpn: Tok[], vars: Record<string, number | null>): number | null {
  const st: (number | null)[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") st.push(tk.v);
    else if (tk.t === "col") st.push(vars[tk.v] ?? null);
    else if (tk.t === "op") {
      if (tk.v === "neg") {
        const a = st.pop();
        st.push(a == null ? null : -a);
        continue;
      }
      const b = st.pop();
      const a = st.pop();
      if (a == null || b == null) {
        st.push(null);
        continue;
      }
      let r: number;
      switch (tk.v) {
        case "+": r = a + b; break;
        case "-": r = a - b; break;
        case "*": r = a * b; break;
        case "/": r = a / b; break;
        case "%": r = a % b; break;
        case "^": r = Math.pow(a, b); break;
        default: r = NaN;
      }
      st.push(isFinite(r) ? r : null);
    } else if (tk.t === "fn") {
      if (tk.v in FUNCS2) {
        const b = st.pop();
        const a = st.pop();
        st.push(a == null || b == null ? null : guard(FUNCS2[tk.v](a, b)));
      } else {
        const a = st.pop();
        st.push(a == null ? null : guard(FUNCS1[tk.v](a)));
      }
    }
  }
  return st.length === 1 ? st[0] : null;
}

const guard = (x: number): number | null => (isFinite(x) ? x : null);

export interface FormulaResult {
  values: RowValues;
  error?: string;
  missingCols?: string[];
}

export function evaluateFormula(dataset: Dataset, expr: string): FormulaResult {
  const compiled = compileFormula(expr);
  if ("error" in compiled) return { values: [], error: compiled.error };

  const known = new Set(dataset.columns.map((c) => c.name));
  const missing = compiled.cols.filter((c) => !known.has(c));
  if (missing.length)
    return { values: [], error: `Unknown column(s): ${missing.join(", ")}`, missingCols: missing };

  const colData: Record<string, RowValues> = {};
  for (const name of compiled.cols) colData[name] = columnPerRow(dataset, name);

  const values: RowValues = dataset.rows.map((_, ri) => {
    const vars: Record<string, number | null> = {};
    for (const name of compiled.cols) vars[name] = colData[name][ri];
    return evalRpn(compiled.rpn, vars);
  });

  return { values };
}

/** Coerce a derived RowValues into CellValue[] for storage. */
export function toCellValues(values: RowValues): CellValue[] {
  return values.map((v) => (v == null ? null : v));
}
