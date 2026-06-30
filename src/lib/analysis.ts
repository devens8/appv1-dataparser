import type { Column, Dataset } from "@/types";
import { pairedNumeric } from "@/lib/csv";
import { numericColumns } from "@/lib/dataset";
import { descriptiveStats, type DescriptiveStats } from "@/lib/stats";
import { analyzeTrend, type TrendAnalysis } from "@/lib/trends";
import {
  detectOutliers,
  type OutlierMethod,
  type OutlierResult,
} from "@/lib/outliers";

/** Sentinel X-axis selection meaning "use the row index". */
export const INDEX_X = "__index__";

/**
 * A single, shared analysis computed once for the workspace and consumed by
 * every view. The user picks X / Y / outlier-method one time; the resulting
 * paired series, descriptive stats, trend fit and outlier flags flow to the
 * Data, Charts and Statistics tabs without re-selecting anything.
 */
export interface Analysis {
  numCols: Column[];
  xCol: Column | null; // null ⇒ row index
  yCol: Column | null;
  xName: string;
  yName: string;
  x: number[];
  y: number[];
  labels: string[];
  xIsIndex: boolean;
  /** Index into x/y arrays that each surviving point came from in `rows`. */
  rowIndex: number[];
  stats: DescriptiveStats | null;
  trend: TrendAnalysis;
  outliers: OutlierResult;
  /** Indices into the x/y arrays flagged as outliers (fast membership test). */
  outlierSet: Set<number>;
  method: OutlierMethod;
}

export function computeAnalysis(
  dataset: Dataset,
  xName: string,
  yName: string,
  method: OutlierMethod,
): Analysis {
  const numCols = numericColumns(dataset);
  const yCol = numCols.find((c) => c.name === yName) ?? numCols[0] ?? null;
  const xCol =
    xName === INDEX_X
      ? null
      : (dataset.columns.find((c) => c.name === xName) ?? null);

  let x: number[] = [];
  let y: number[] = [];
  let labels: string[] = [];
  let xIsIndex = true;

  if (yCol) {
    const paired = xCol
      ? pairedNumeric(
          dataset.rows,
          xCol.index,
          yCol.index,
          xCol.type === "number",
        )
      : pairedNumeric(dataset.rows, yCol.index, yCol.index, false);
    x = paired.x;
    y = paired.y;
    labels = paired.labels;
    xIsIndex = paired.xIsIndex;
  }

  const rowIndex = y.map((_, i) => i);
  const stats = descriptiveStats(y);
  const trend = analyzeTrend(x, y);
  const outliers = detectOutliers(y, method);
  const outlierSet = new Set(outliers.indices);

  return {
    numCols,
    xCol,
    yCol,
    xName: xCol?.name ?? INDEX_X,
    yName: yCol?.name ?? "",
    x,
    y,
    labels,
    xIsIndex,
    rowIndex,
    stats,
    trend,
    outliers,
    outlierSet,
    method,
  };
}
