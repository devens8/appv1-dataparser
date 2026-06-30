import { mean, variance } from "@/lib/stats";

/**
 * v3 anomaly detection. Goes beyond static outlier fences (which judge each
 * point against the whole column) by looking at local context and structural
 * shifts — the kind of detection that becomes useful as a series grows over
 * time:
 *   • rollingZScore — flags points that deviate from their trailing window
 *   • cusumChangePoints — detects step-changes in the mean (regime shifts)
 */

export interface AnomalyPoint {
  index: number;
  value: number;
  score: number;
}

export interface RollingResult {
  scores: number[]; // rolling z per point (0 where undefined)
  anomalies: AnomalyPoint[];
  window: number;
  threshold: number;
}

/** Trailing-window z-score; the first `window` points seed the baseline. */
export function rollingZScore(
  values: number[],
  window: number,
  threshold = 3,
): RollingResult {
  const w = Math.max(3, Math.floor(window));
  const scores = new Array(values.length).fill(0);
  const anomalies: AnomalyPoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w);
    if (i < w) continue; // need a full baseline window
    const ref = values.slice(start, i);
    const m = mean(ref);
    const sd = Math.sqrt(variance(ref));
    if (sd === 0) continue;
    const z = (values[i] - m) / sd;
    scores[i] = z;
    if (Math.abs(z) > threshold)
      anomalies.push({ index: i, value: values[i], score: z });
  }
  return { scores, anomalies, window: w, threshold };
}

export interface ChangePointResult {
  changePoints: number[]; // indices where the mean shifts
  cusum: number[]; // running CUSUM magnitude (for plotting)
}

/**
 * Two-sided CUSUM on standardised data. `drift` is the allowable slack (in σ)
 * and `threshold` the decision interval (in σ) before a shift is declared.
 */
export function cusumChangePoints(
  values: number[],
  threshold = 5,
  drift = 0.5,
): ChangePointResult {
  const n = values.length;
  const changePoints: number[] = [];
  const cusum = new Array(n).fill(0);
  if (n < 4) return { changePoints, cusum };
  const m = mean(values);
  const sd = Math.sqrt(variance(values));
  if (sd === 0) return { changePoints, cusum };

  let sHi = 0;
  let sLo = 0;
  for (let i = 0; i < n; i++) {
    const z = (values[i] - m) / sd;
    sHi = Math.max(0, sHi + z - drift);
    sLo = Math.min(0, sLo + z + drift);
    cusum[i] = Math.max(sHi, -sLo);
    if (sHi > threshold || -sLo > threshold) {
      changePoints.push(i);
      sHi = 0;
      sLo = 0;
    }
  }
  return { changePoints, cusum };
}
