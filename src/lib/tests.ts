/**
 * Inferential statistics beyond the two-sample Welch test: one-way ANOVA with
 * post-hoc pairwise comparisons, paired / one-sample t-tests, the Mann–Whitney
 * U test (nonparametric) and a D'Agostino–Pearson normality check. These are
 * the everyday hypothesis tests researchers reach for in Prism / JMP.
 */

import { mean, variance, studentTwoTailedP } from "@/lib/stats";

/* ------------------------------------------------------------------ *
 * Distribution helpers (self-contained).
 * ------------------------------------------------------------------ */

function gammaln(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Upper-tail p-value of the F distribution. */
export function fDistP(f: number, df1: number, df2: number): number {
  if (f <= 0 || !isFinite(f) || df1 <= 0 || df2 <= 0) return NaN;
  return betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
}

/** Standard normal CDF via the error function. */
function normalCdf(z: number): number {
  // Abramowitz & Stegun 7.1.26 erf approximation.
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp((-z * z) / 2);
  const cdf = 0.5 * (1 + (z >= 0 ? y : -y));
  return cdf;
}

/** Chi-square upper-tail p for df = 2 (used by the normality test). */
function chi2P2df(x: number): number {
  return x <= 0 ? 1 : Math.exp(-x / 2);
}

/* ------------------------------------------------------------------ *
 * One-way ANOVA + post-hoc pairwise comparisons.
 * ------------------------------------------------------------------ */

export interface AnovaGroup {
  name: string;
  values: number[];
}

export interface AnovaResult {
  groups: number;
  n: number;
  grandMean: number;
  ssBetween: number;
  ssWithin: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  f: number;
  p: number;
  etaSquared: number;
  significant: boolean;
}

export function oneWayAnova(groups: AnovaGroup[]): AnovaResult | null {
  const valid = groups.filter((g) => g.values.length >= 2);
  const k = valid.length;
  if (k < 2) return null;

  const all = valid.flatMap((g) => g.values);
  const n = all.length;
  const grandMean = mean(all);

  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of valid) {
    const gm = mean(g.values);
    ssBetween += g.values.length * (gm - grandMean) ** 2;
    for (const v of g.values) ssWithin += (v - gm) ** 2;
  }

  const dfBetween = k - 1;
  const dfWithin = n - k;
  if (dfWithin <= 0) return null;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin === 0 ? Infinity : msBetween / msWithin;
  const p = fDistP(f, dfBetween, dfWithin);
  const etaSquared = ssBetween / (ssBetween + ssWithin);

  return {
    groups: k,
    n,
    grandMean,
    ssBetween,
    ssWithin,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    f,
    p,
    etaSquared,
    significant: p < 0.05,
  };
}

export interface PostHocPair {
  a: string;
  b: string;
  meanDiff: number;
  t: number;
  pRaw: number;
  pAdjusted: number;
  significant: boolean;
}

/**
 * Post-hoc pairwise comparisons after a one-way ANOVA, using the pooled
 * within-group variance (MS_within) and a Bonferroni correction across all
 * pairs. Statistically conservative and clearly labelled (vs. claiming an
 * exact Tukey studentised-range, which needs its own distribution table).
 */
export function postHocPairwise(
  groups: AnovaGroup[],
  anova: AnovaResult,
): PostHocPair[] {
  const valid = groups.filter((g) => g.values.length >= 2);
  const pairs: PostHocPair[] = [];
  const m = (valid.length * (valid.length - 1)) / 2;
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const ai = valid[i];
      const bj = valid[j];
      const mi = mean(ai.values);
      const mj = mean(bj.values);
      const se = Math.sqrt(
        anova.msWithin * (1 / ai.values.length + 1 / bj.values.length),
      );
      const t = se === 0 ? 0 : (mi - mj) / se;
      const pRaw = studentTwoTailedP(t, anova.dfWithin);
      const pAdjusted = Math.min(1, pRaw * m);
      pairs.push({
        a: ai.name,
        b: bj.name,
        meanDiff: mi - mj,
        t,
        pRaw,
        pAdjusted,
        significant: pAdjusted < 0.05,
      });
    }
  }
  return pairs;
}

/* ------------------------------------------------------------------ *
 * Paired / one-sample t-tests.
 * ------------------------------------------------------------------ */

export interface SimpleTTest {
  t: number;
  df: number;
  p: number;
  mean: number;
  se: number;
  significant: boolean;
}

export function pairedTTest(a: number[], b: number[]): SimpleTTest | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const diff = a.slice(0, n).map((v, i) => v - b[i]);
  const m = mean(diff);
  const sd = Math.sqrt(variance(diff));
  const se = sd / Math.sqrt(n);
  if (se === 0) return null;
  const t = m / se;
  const df = n - 1;
  const p = studentTwoTailedP(t, df);
  return { t, df, p, mean: m, se, significant: p < 0.05 };
}

export function oneSampleTTest(
  values: number[],
  mu0: number,
): SimpleTTest | null {
  const n = values.length;
  if (n < 2) return null;
  const m = mean(values);
  const sd = Math.sqrt(variance(values));
  const se = sd / Math.sqrt(n);
  if (se === 0) return null;
  const t = (m - mu0) / se;
  const df = n - 1;
  const p = studentTwoTailedP(t, df);
  return { t, df, p, mean: m, se, significant: p < 0.05 };
}

/* ------------------------------------------------------------------ *
 * Mann–Whitney U (nonparametric two-sample test).
 * ------------------------------------------------------------------ */

export interface MannWhitneyResult {
  u: number;
  z: number;
  p: number;
  significant: boolean;
}

export function mannWhitneyU(a: number[], b: number[]): MannWhitneyResult | null {
  const na = a.length;
  const nb = b.length;
  if (na < 1 || nb < 1) return null;

  const combined = [
    ...a.map((v) => ({ v, g: 0 })),
    ...b.map((v) => ({ v, g: 1 })),
  ].sort((p, q) => p.v - q.v);

  // Assign average ranks (tie-corrected).
  const ranks = new Array(combined.length).fill(0);
  let i = 0;
  let tieTerm = 0;
  while (i < combined.length) {
    let j = i;
    while (j + 1 < combined.length && combined[j + 1].v === combined[i].v) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank
    for (let k = i; k <= j; k++) ranks[k] = avg;
    const t = j - i + 1;
    if (t > 1) tieTerm += t ** 3 - t;
    i = j + 1;
  }

  let rankSumA = 0;
  combined.forEach((c, idx) => {
    if (c.g === 0) rankSumA += ranks[idx];
  });

  const uA = rankSumA - (na * (na + 1)) / 2;
  const uB = na * nb - uA;
  const u = Math.min(uA, uB);

  const n = na + nb;
  const muU = (na * nb) / 2;
  const sigmaU = Math.sqrt(
    (na * nb) / 12 * ((n + 1) - tieTerm / (n * (n - 1))),
  );
  if (sigmaU === 0) return null;
  const z = (u - muU) / sigmaU;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { u, z, p: Math.min(1, p), significant: p < 0.05 };
}

/* ------------------------------------------------------------------ *
 * D'Agostino–Pearson omnibus normality test (skew + kurtosis → K²).
 * ------------------------------------------------------------------ */

export interface NormalityResult {
  k2: number;
  p: number;
  skewness: number;
  kurtosis: number;
  normal: boolean; // fail to reject at α = 0.05
  n: number;
}

export function normalityTest(values: number[]): NormalityResult | null {
  const n = values.length;
  if (n < 8) return null; // omnibus test needs a reasonable sample

  const m = mean(values);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  const skew = m3 / Math.pow(m2, 1.5);
  const kurt = m4 / (m2 * m2) - 3;

  // Transform skewness to an approximately standard-normal Z (D'Agostino 1970).
  const y = skew * Math.sqrt(((n + 1) * (n + 3)) / (6 * (n - 2)));
  const beta2 =
    (3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3)) /
    ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const w2 = -1 + Math.sqrt(2 * (beta2 - 1));
  const delta = 1 / Math.sqrt(0.5 * Math.log(w2));
  const alpha = Math.sqrt(2 / (w2 - 1));
  const zSkew =
    delta * Math.log(y / alpha + Math.sqrt((y / alpha) ** 2 + 1));

  // Transform kurtosis (Anscombe & Glynn 1983).
  const meanK = (3 * (n - 1)) / (n + 1);
  const varK =
    (24 * n * (n - 2) * (n - 3)) / ((n + 1) ** 2 * (n + 3) * (n + 5));
  const xK = (kurt + 3 - meanK) / Math.sqrt(varK);
  const sqrtBeta1 =
    (6 * (n * n - 5 * n + 2)) / ((n + 7) * (n + 9)) *
    Math.sqrt((6 * (n + 3) * (n + 5)) / (n * (n - 2) * (n - 3)));
  const A =
    6 + (8 / sqrtBeta1) * (2 / sqrtBeta1 + Math.sqrt(1 + 4 / (sqrtBeta1 * sqrtBeta1)));
  const term = 1 - 2 / A;
  const denom = 1 + xK * Math.sqrt(2 / (A - 4));
  const zKurt =
    denom <= 0
      ? 0
      : ((term - Math.cbrt((1 - 2 / A) / denom)) ) / Math.sqrt(2 / (9 * A));

  const k2 = zSkew * zSkew + zKurt * zKurt;
  const p = chi2P2df(k2);
  return {
    k2,
    p,
    skewness: skew,
    kurtosis: kurt,
    normal: p >= 0.05,
    n,
  };
}
