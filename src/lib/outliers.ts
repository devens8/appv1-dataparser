import { descriptiveStats, mean, percentile } from "@/lib/stats";

export type OutlierMethod = "zscore" | "iqr" | "mad";

export interface OutlierResult {
  method: OutlierMethod;
  /** Indices into the original (cleaned) numeric array flagged as outliers. */
  indices: number[];
  lowerBound: number;
  upperBound: number;
  /** Per-point score (z, modified-z, or signed distance for IQR). */
  scores: number[];
  threshold: number;
  count: number;
}

const median = (sorted: number[]) => percentile(sorted, 50);

/**
 * Detect outliers with one of three standard methods.
 *  - zscore: |x - mean| / std > k        (k default 2)
 *  - iqr:    outside [Q1 - k*IQR, Q3 + k*IQR]  (k default 1.5)
 *  - mad:    modified z = 0.6745*(x-med)/MAD, |.| > k  (k default 3.5)
 */
export function detectOutliers(
  values: number[],
  method: OutlierMethod = "iqr",
  k?: number,
): OutlierResult {
  const empty: OutlierResult = {
    method,
    indices: [],
    lowerBound: NaN,
    upperBound: NaN,
    scores: [],
    threshold: NaN,
    count: 0,
  };
  if (values.length === 0) return empty;

  if (method === "zscore") {
    const threshold = k ?? 2;
    const stats = descriptiveStats(values);
    if (!stats || stats.std === 0)
      return { ...empty, threshold, scores: values.map(() => 0) };
    const scores = values.map((v) => (v - stats.mean) / stats.std);
    const indices: number[] = [];
    scores.forEach((z, i) => {
      if (Math.abs(z) > threshold) indices.push(i);
    });
    return {
      method,
      indices,
      lowerBound: stats.mean - threshold * stats.std,
      upperBound: stats.mean + threshold * stats.std,
      scores,
      threshold,
      count: indices.length,
    };
  }

  if (method === "mad") {
    const threshold = k ?? 3.5;
    const sorted = [...values].sort((a, b) => a - b);
    const med = median(sorted);
    const absDev = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
    const mad = median(absDev);
    if (mad === 0) return { ...empty, threshold, scores: values.map(() => 0) };
    const scores = values.map((v) => (0.6745 * (v - med)) / mad);
    const indices: number[] = [];
    scores.forEach((z, i) => {
      if (Math.abs(z) > threshold) indices.push(i);
    });
    const margin = (threshold * mad) / 0.6745;
    return {
      method,
      indices,
      lowerBound: med - margin,
      upperBound: med + margin,
      scores,
      threshold,
      count: indices.length,
    };
  }

  // IQR (Tukey's fences)
  const threshold = k ?? 1.5;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;
  const indices: number[] = [];
  const scores = values.map((v, i) => {
    if (v < lowerBound || v > upperBound) indices.push(i);
    if (iqr === 0) return 0;
    if (v < q1) return (v - q1) / iqr;
    if (v > q3) return (v - q3) / iqr;
    return 0;
  });
  return {
    method,
    indices,
    lowerBound,
    upperBound,
    scores,
    threshold,
    count: indices.length,
  };
}

export const methodLabels: Record<OutlierMethod, string> = {
  iqr: "IQR (Tukey's fences)",
  zscore: "Z-score",
  mad: "Modified Z-score (MAD)",
};

export const methodBlurb: Record<OutlierMethod, string> = {
  iqr: "Flags values beyond Q1/Q3 ± k×IQR. Robust, distribution-agnostic.",
  zscore:
    "Flags values more than k standard deviations from the mean. Best for ~normal data.",
  mad: "Median-based, highly robust to extreme values. Recommended for skewed data.",
};

export { mean };
