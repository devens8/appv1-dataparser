import { linearRegression, movingAverage, type LinearFit } from "@/lib/stats";

export type TrendDirection =
  | "increasing"
  | "decreasing"
  | "stable"
  | "insufficient";

export interface TrendAnalysis {
  fit: LinearFit | null;
  direction: TrendDirection;
  /** Slope expressed as % change of the mean per step (interpretable). */
  slopePerStep: number;
  percentChangePerStep: number;
  /** Total modelled change from first to last x. */
  totalChange: number;
  movingAverage: number[];
  movingAverageWindow: number;
  /** Mann–Kendall S statistic and tau (non-parametric monotonic trend). */
  mannKendallTau: number;
  strength: "strong" | "moderate" | "weak" | "none";
}

function classifyDirection(slope: number, yMean: number): TrendDirection {
  // Relative threshold: 0.1% of the mean per step counts as movement.
  const eps = Math.abs(yMean) * 0.001 || 1e-9;
  if (slope > eps) return "increasing";
  if (slope < -eps) return "decreasing";
  return "stable";
}

function mannKendallTau(y: number[]): number {
  const n = y.length;
  if (n < 3) return 0;
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(y[j] - y[i]);
    }
  }
  const denom = (n * (n - 1)) / 2;
  return denom === 0 ? 0 : s / denom;
}

export function analyzeTrend(x: number[], y: number[]): TrendAnalysis {
  const n = y.length;
  if (n < 2) {
    return {
      fit: null,
      direction: "insufficient",
      slopePerStep: 0,
      percentChangePerStep: 0,
      totalChange: 0,
      movingAverage: [...y],
      movingAverageWindow: 1,
      mannKendallTau: 0,
      strength: "none",
    };
  }

  const fit = linearRegression(x, y);
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const slope = fit ? fit.slope : 0;

  // Average x-spacing → "per step" interpretation even for irregular x.
  const xSpan = x[x.length - 1] - x[0];
  const avgStep = n > 1 ? xSpan / (n - 1) : 1;
  const slopePerStep = slope * avgStep;

  const window = Math.max(2, Math.min(Math.round(n / 8) || 2, n));
  const tau = mannKendallTau(y);
  const r2 = fit ? fit.r2 : 0;

  let strength: TrendAnalysis["strength"] = "none";
  if (r2 >= 0.7) strength = "strong";
  else if (r2 >= 0.4) strength = "moderate";
  else if (r2 >= 0.1) strength = "weak";

  return {
    fit,
    direction: classifyDirection(slope, yMean),
    slopePerStep,
    percentChangePerStep: yMean !== 0 ? (slopePerStep / yMean) * 100 : 0,
    totalChange: slope * xSpan,
    movingAverage: movingAverage(y, window),
    movingAverageWindow: window,
    mannKendallTau: tau,
    strength,
  };
}
