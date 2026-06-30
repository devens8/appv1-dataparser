/** Descriptive statistics and regression utilities. */

export interface DescriptiveStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number; // sample variance (n-1)
  std: number; // sample standard deviation
  sem: number; // standard error of the mean
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number; // excess kurtosis
  cv: number; // coefficient of variation (%)
  mode: number | null;
}

/** Linear-interpolated percentile (type-7, the spreadsheet default). */
export function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  if (n === 1) return sortedAsc[0];
  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo];
  const frac = rank - lo;
  return sortedAsc[lo] + frac * (sortedAsc[hi] - sortedAsc[lo]);
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function descriptiveStats(values: number[]): DescriptiveStats | null {
  const n = values.length;
  if (n === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const m = sum / n;

  const median = percentile(sorted, 50);
  const min = sorted[0];
  const max = sorted[n - 1];
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);

  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  const variance = n > 1 ? m2 / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const popStd = Math.sqrt(m2 / n);

  const skewness = popStd > 0 ? m3 / n / Math.pow(popStd, 3) : 0;
  const kurtosis = popStd > 0 ? m4 / n / Math.pow(popStd, 4) - 3 : 0;

  // Mode (only meaningful for repeated discrete values).
  const freq = new Map<number, number>();
  let mode: number | null = null;
  let modeCount = 1;
  for (const v of values) {
    const c = (freq.get(v) ?? 0) + 1;
    freq.set(v, c);
    if (c > modeCount) {
      modeCount = c;
      mode = v;
    }
  }

  return {
    count: n,
    sum,
    mean: m,
    median,
    min,
    max,
    range: max - min,
    variance,
    std,
    sem: n > 0 ? std / Math.sqrt(n) : 0,
    q1,
    q3,
    iqr: q3 - q1,
    skewness,
    kurtosis,
    cv: m !== 0 ? (std / Math.abs(m)) * 100 : 0,
    mode,
  };
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
  r: number;
  predict: (x: number) => number;
}

/** Ordinary least-squares line through (x, y) with R². */
export function linearRegression(x: number[], y: number[]): LinearFit | null {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxy += x[i] * y[i];
    sxx += x[i] * x[i];
    syy += y[i] * y[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const rNum = n * sxy - sx * sy;
  const rDen = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  const r = rDen === 0 ? 0 : rNum / rDen;

  return {
    slope,
    intercept,
    r2: r * r,
    r,
    predict: (xi: number) => slope * xi + intercept,
  };
}

/** Pearson correlation coefficient. */
export function pearson(x: number[], y: number[]): number {
  const fit = linearRegression(x, y);
  return fit ? fit.r : NaN;
}

/** Solve Ax = B by Gaussian elimination with partial pivoting. */
function solveGaussian(A: number[][], B: number[]): number[] {
  const n = B.length;
  const a = A.map((r) => [...r]);
  const b = [...B];
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    }
    [a[i], a[maxRow]] = [a[maxRow], a[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];
    if (a[i][i] === 0) continue;
    for (let k = i + 1; k < n; k++) {
      const c = -a[k][i] / a[i][i];
      for (let j = i; j < n; j++) a[k][j] += c * a[i][j];
      b[k] += c * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let j = i + 1; j < n; j++) s += a[i][j] * x[j];
    x[i] = a[i][i] === 0 ? 0 : (b[i] - s) / a[i][i];
  }
  return x;
}

/** Least-squares polynomial fit; returns coefficients [c0, c1, ... cOrder]. */
export function polynomialFit(
  x: number[],
  y: number[],
  order: number,
): number[] | null {
  const n = x.length;
  if (n <= order) return null;
  const A = Array.from({ length: order + 1 }, () =>
    new Array(order + 1).fill(0),
  );
  const B = new Array(order + 1).fill(0);
  for (let i = 0; i <= order; i++) {
    for (let j = 0; j <= order; j++) {
      A[i][j] = x.reduce((s, xi) => s + Math.pow(xi, i + j), 0);
    }
    B[i] = x.reduce((s, xi, idx) => s + y[idx] * Math.pow(xi, i), 0);
  }
  return solveGaussian(A, B);
}

export function evalPolynomial(coeffs: number[], x: number): number {
  return coeffs.reduce((acc, c, i) => acc + c * Math.pow(x, i), 0);
}

/** R² of an arbitrary set of predictions against observed y. */
export function rSquared(observed: number[], predicted: number[]): number {
  const n = observed.length;
  if (n === 0) return NaN;
  const ym = mean(observed);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(observed[i] - predicted[i], 2);
    ssTot += Math.pow(observed[i] - ym, 2);
  }
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
}

/** Centred simple moving average; window is clamped to odd-ish behaviour. */
export function movingAverage(values: number[], window: number): number[] {
  const w = Math.max(2, Math.floor(window));
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(w / 2));
    const end = Math.min(values.length, start + w);
    let s = 0;
    for (let j = start; j < end; j++) s += values[j];
    out.push(s / (end - start));
  }
  return out;
}
