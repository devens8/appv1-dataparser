/**
 * Data profiling, smart axis selection and chart suggestions. Powers the
 * "pre-selected appropriate graph" behaviour and the AI Insights tool. The
 * heuristics here run fully client-side so the product is useful with no API
 * key; an optional LLM pass (see /api/summarize) can enrich the narrative.
 */

import type { Dataset } from "@/types";
import { INDEX_X } from "@/lib/analysis";
import { columnValues, numericColumns } from "@/lib/dataset";
import { descriptiveStats, pearson } from "@/lib/stats";

export interface ColumnProfile {
  name: string;
  type: "number" | "string" | "date";
  count: number;
  missing: number;
  // numeric only
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  skew?: number;
  monotonic?: number; // 0..1 fraction of strictly-increasing steps
  // categorical only
  cardinality?: number;
  sampleValues?: string[];
}

export interface DatasetProfile {
  name: string;
  rows: number;
  cols: number;
  numericCols: number;
  columns: ColumnProfile[];
  /** Strongest |correlation| pair across numeric columns. */
  topCorrelation: { a: string; b: string; r: number } | null;
}

function monotonicScore(values: number[]): number {
  if (values.length < 2) return 0;
  let inc = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[i - 1]) inc++;
  return inc / (values.length - 1);
}

export function profileDataset(dataset: Dataset): DatasetProfile {
  const numCols = numericColumns(dataset);
  const columns: ColumnProfile[] = dataset.columns.map((c) => {
    const raw = dataset.rows.map((r) => r[c.index]);
    const missing = raw.filter((v) => v == null || v === "").length;
    if (c.type === "number") {
      const vals = columnValues(dataset, c.index);
      const s = descriptiveStats(vals);
      return {
        name: c.name,
        type: c.type,
        count: vals.length,
        missing,
        min: s?.min,
        max: s?.max,
        mean: s?.mean,
        std: s?.std,
        skew: s?.skewness,
        monotonic: monotonicScore(vals),
      };
    }
    const strs = raw
      .filter((v): v is string | number => v != null && v !== "")
      .map((v) => String(v));
    const uniq = new Set(strs);
    return {
      name: c.name,
      type: c.type,
      count: strs.length,
      missing,
      cardinality: uniq.size,
      sampleValues: [...uniq].slice(0, 5),
    };
  });

  // Strongest correlation across numeric columns.
  let topCorrelation: DatasetProfile["topCorrelation"] = null;
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const a = columnValues(dataset, numCols[i].index);
      const b = columnValues(dataset, numCols[j].index);
      const n = Math.min(a.length, b.length);
      const r = pearson(a.slice(0, n), b.slice(0, n));
      if (!isNaN(r) && (!topCorrelation || Math.abs(r) > Math.abs(topCorrelation.r))) {
        topCorrelation = { a: numCols[i].name, b: numCols[j].name, r };
      }
    }
  }

  return {
    name: dataset.name,
    rows: dataset.rows.length,
    cols: dataset.columns.length,
    numericCols: numCols.length,
    columns,
    topCorrelation,
  };
}

/* ------------------------------------------------------------------ *
 * Smart axis selection — pick the most appropriate X and Y up front.
 * ------------------------------------------------------------------ */

// Column names that strongly imply an independent (X) variable.
const X_HINTS =
  /\b(time|date|day|hour|min|sec|t|x|dose|conc|concentration|wavelength|temp|temperature|cycle|step|index|id|run|freq|frequency|ph|voltage|current)\b/i;

export interface AxisSuggestion {
  xName: string; // column name or INDEX_X
  yName: string;
  reason: string;
}

export function suggestAxes(dataset: Dataset): AxisSuggestion {
  const numCols = numericColumns(dataset);
  if (numCols.length === 0) {
    return { xName: INDEX_X, yName: "", reason: "No numeric columns to plot." };
  }

  // 1 — choose X. Prefer a date column, then a name-hinted column, then a
  //     monotonic numeric column (independent variable), else the row index.
  const dateCol = dataset.columns.find((c) => c.type === "date");
  const hintCol =
    dataset.columns.find((c) => X_HINTS.test(c.name) && c.type !== "string") ??
    null;

  let xName = INDEX_X;
  let xReason = "row order";
  if (dateCol) {
    xName = dateCol.name;
    xReason = `“${dateCol.name}” reads as a date/time axis`;
  } else if (hintCol) {
    xName = hintCol.name;
    xReason = `“${hintCol.name}” looks like an independent variable`;
  } else {
    // most monotonic numeric column makes a natural X
    let best = null as null | { name: string; score: number };
    for (const c of numCols) {
      const m = monotonicScore(columnValues(dataset, c.index));
      if (!best || m > best.score) best = { name: c.name, score: m };
    }
    if (best && best.score > 0.9) {
      xName = best.name;
      xReason = `“${best.name}” increases monotonically`;
    }
  }

  // 2 — choose Y: the numeric column (not used as X) with the largest spread
  //     (coefficient of variation) — the most "interesting" signal.
  const yCandidates = numCols.filter((c) => c.name !== xName);
  const pool = yCandidates.length ? yCandidates : numCols;
  let yName = pool[0]?.name ?? "";
  let bestCv = -Infinity;
  for (const c of pool) {
    const s = descriptiveStats(columnValues(dataset, c.index));
    if (!s) continue;
    const cv = s.mean !== 0 ? Math.abs(s.std / s.mean) : s.std;
    if (cv > bestCv) {
      bestCv = cv;
      yName = c.name;
    }
  }

  return {
    xName,
    yName,
    reason: `X = ${xName === INDEX_X ? "row index" : `“${xName}”`} (${xReason}); Y = “${yName}” (largest relative spread).`,
  };
}

/* ------------------------------------------------------------------ *
 * Chart suggestions + a plain-language heuristic summary.
 * ------------------------------------------------------------------ */

export interface ChartSuggestion {
  chart: "scatter" | "line" | "histogram" | "box" | "heatmap" | "bar";
  title: string;
  detail: string;
  xName?: string;
  yName?: string;
}

export function suggestCharts(dataset: Dataset): ChartSuggestion[] {
  const p = profileDataset(dataset);
  const out: ChartSuggestion[] = [];
  const numeric = p.columns.filter((c) => c.type === "number");
  const axes = suggestAxes(dataset);

  if (numeric.length > 0) {
    const timeLike =
      p.columns.find((c) => c.type === "date") ||
      p.columns.find((c) => c.monotonic && c.monotonic > 0.9);
    if (timeLike) {
      out.push({
        chart: "line",
        title: `${axes.yName} over ${timeLike.name}`,
        detail: "An ordered axis suggests a time/sequence series — plot it as a line.",
        xName: axes.xName,
        yName: axes.yName,
      });
    }
  }

  if (p.topCorrelation && Math.abs(p.topCorrelation.r) >= 0.5) {
    out.push({
      chart: "scatter",
      title: `${p.topCorrelation.b} vs ${p.topCorrelation.a}`,
      detail: `These two columns are ${
        Math.abs(p.topCorrelation.r) >= 0.8 ? "strongly" : "moderately"
      } correlated (r = ${p.topCorrelation.r.toFixed(2)}) — a scatter with a fit line is informative.`,
      xName: p.topCorrelation.a,
      yName: p.topCorrelation.b,
    });
  }

  const spread = [...numeric].sort(
    (a, b) => (Math.abs(b.skew ?? 0)) - (Math.abs(a.skew ?? 0)),
  )[0];
  if (spread) {
    const skewed = Math.abs(spread.skew ?? 0) > 1;
    out.push({
      chart: "histogram",
      title: `Distribution of ${spread.name}`,
      detail: skewed
        ? `${spread.name} is notably skewed (skew = ${(spread.skew ?? 0).toFixed(
            2,
          )}) — a histogram reveals the shape; consider a log axis.`
        : `Inspect the distribution of ${spread.name} with a histogram.`,
      yName: spread.name,
    });
  }

  if (numeric.length >= 3) {
    out.push({
      chart: "heatmap",
      title: "Correlation matrix",
      detail: `With ${numeric.length} numeric columns, a Pearson correlation heatmap surfaces relationships at a glance.`,
    });
  }

  if (numeric.length >= 1) {
    out.push({
      chart: "box",
      title: `Spread & outliers of ${axes.yName}`,
      detail: "A box plot summarises quartiles and flags outliers beyond the whiskers.",
      yName: axes.yName,
    });
  }

  return out.slice(0, 5);
}

export function heuristicSummary(dataset: Dataset): string {
  const p = profileDataset(dataset);
  const parts: string[] = [];
  parts.push(
    `“${p.name}” has ${p.rows.toLocaleString()} rows and ${p.cols} columns (${p.numericCols} numeric).`,
  );

  const skewed = p.columns.filter((c) => c.type === "number" && Math.abs(c.skew ?? 0) > 1);
  if (skewed.length) {
    parts.push(
      `${skewed.map((c) => c.name).join(", ")} ${
        skewed.length === 1 ? "is" : "are"
      } skewed and may benefit from a log scale.`,
    );
  }

  if (p.topCorrelation && Math.abs(p.topCorrelation.r) >= 0.5) {
    parts.push(
      `The strongest relationship is ${p.topCorrelation.a} ↔ ${p.topCorrelation.b} (r = ${p.topCorrelation.r.toFixed(
        2,
      )}).`,
    );
  } else if (p.numericCols >= 2) {
    parts.push("No strong linear correlations stand out between numeric columns.");
  }

  const missing = p.columns.filter((c) => c.missing > 0);
  if (missing.length) {
    parts.push(
      `${missing.length} column${missing.length === 1 ? "" : "s"} contain missing values.`,
    );
  }

  const axes = suggestAxes(dataset);
  if (axes.yName) {
    parts.push(
      `Suggested starting plot: ${axes.yName} vs ${
        axes.xName === INDEX_X ? "row index" : axes.xName
      }.`,
    );
  }

  return parts.join(" ");
}
