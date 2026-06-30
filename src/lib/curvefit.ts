/**
 * Nonlinear regression (curve fitting) — the flagship analysis researchers
 * expect from tools like GraphPad Prism / OriginPro. A small Levenberg–Marquardt
 * least-squares solver fits a library of named models (dose-response, kinetics,
 * growth/decay) to (x, y) data and reports fitted parameters, standard errors,
 * goodness-of-fit and derived quantities (EC50/IC50, half-life, Km…).
 *
 * Everything runs client-side in plain TypeScript — no native deps.
 */

export interface ModelParam {
  name: string;
  /** Initial-guess heuristic from the data. */
  init: (x: number[], y: number[]) => number;
  /** Optional human hint shown in the UI. */
  hint?: string;
}

export interface DerivedQuantity {
  label: string;
  /** Compute an interpretable value (e.g. EC50) from fitted params. */
  value: (p: number[]) => number;
  /** Propagate SE through simple transforms where we can. */
  se?: (p: number[], se: number[]) => number;
  hint?: string;
}

export interface CurveModel {
  id: string;
  name: string;
  /** One-line description / equation for the UI. */
  equation: string;
  blurb: string;
  params: ModelParam[];
  /** y = f(x, params). */
  fn: (x: number, p: number[]) => number;
  derived?: DerivedQuantity[];
  /** Whether X is expected to be log10(dose) (dose-response models). */
  xIsLog?: boolean;
}

export interface FitParam {
  name: string;
  value: number;
  se: number;
  /** 95% CI (value ± t·se, large-sample normal approx). */
  ci: [number, number];
}

export interface FitDerived {
  label: string;
  value: number;
  se: number | null;
  hint?: string;
}

export interface CurveFitResult {
  modelId: string;
  params: FitParam[];
  derived: FitDerived[];
  rawParams: number[];
  /** Coefficient of determination. */
  r2: number;
  adjR2: number;
  /** Residual standard error (σ). */
  rmse: number;
  sse: number;
  dof: number;
  n: number;
  iterations: number;
  converged: boolean;
  /** Sample the fitted curve over [xMin, xMax] for plotting. */
  predict: (x: number) => number;
}

/* ------------------------------------------------------------------ *
 * Linear algebra (small dense systems, p ≤ ~6).
 * ------------------------------------------------------------------ */

/** Solve (A + λI)·d = g for d via Gaussian elimination with partial pivot. */
function solve(A: number[][], g: number[]): number[] | null {
  const n = g.length;
  const a = A.map((r) => [...r]);
  const b = [...g];
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(a[k][i]) > Math.abs(a[piv][i])) piv = k;
    if (Math.abs(a[piv][i]) < 1e-14) return null;
    [a[i], a[piv]] = [a[piv], a[i]];
    [b[i], b[piv]] = [b[piv], b[i]];
    for (let k = i + 1; k < n; k++) {
      const f = a[k][i] / a[i][i];
      for (let j = i; j < n; j++) a[k][j] -= f * a[i][j];
      b[k] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= a[i][j] * x[j];
    x[i] = s / a[i][i];
  }
  return x;
}

/** Invert a symmetric positive-ish matrix (for the covariance estimate). */
function invert(M: number[][]): number[][] | null {
  const n = M.length;
  const a = M.map((r, i) => [...r, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(a[k][i]) > Math.abs(a[piv][i])) piv = k;
    if (Math.abs(a[piv][i]) < 1e-14) return null;
    [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= d;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const f = a[k][i];
      for (let j = 0; j < 2 * n; j++) a[k][j] -= f * a[i][j];
    }
  }
  return a.map((r) => r.slice(n));
}

/* ------------------------------------------------------------------ *
 * Levenberg–Marquardt nonlinear least squares.
 * ------------------------------------------------------------------ */

function residualSumSquares(
  x: number[],
  y: number[],
  fn: (x: number, p: number[]) => number,
  p: number[],
): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const r = y[i] - fn(x[i], p);
    if (!isFinite(r)) return Infinity;
    s += r * r;
  }
  return s;
}

export function fitModel(
  model: CurveModel,
  x: number[],
  y: number[],
  maxIter = 200,
): CurveFitResult | null {
  const n = x.length;
  const np = model.params.length;
  if (n <= np) return null;

  let p = model.params.map((pp) => {
    const v = pp.init(x, y);
    return isFinite(v) ? v : 1;
  });

  let lambda = 1e-3;
  let sse = residualSumSquares(x, y, model.fn, p);
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;

    // Numeric Jacobian J (n×np) via central differences.
    const J: number[][] = Array.from({ length: n }, () => new Array(np).fill(0));
    for (let j = 0; j < np; j++) {
      const h = Math.max(1e-6, Math.abs(p[j]) * 1e-6);
      const pp = [...p];
      const pm = [...p];
      pp[j] += h;
      pm[j] -= h;
      for (let i = 0; i < n; i++) {
        J[i][j] = (model.fn(x[i], pp) - model.fn(x[i], pm)) / (2 * h);
      }
    }

    // Normal equations: (JᵀJ + λ·diag(JᵀJ))·δ = Jᵀr
    const JtJ: number[][] = Array.from({ length: np }, () => new Array(np).fill(0));
    const Jtr: number[] = new Array(np).fill(0);
    for (let i = 0; i < n; i++) {
      const ri = y[i] - model.fn(x[i], p);
      for (let a = 0; a < np; a++) {
        Jtr[a] += J[i][a] * ri;
        for (let b = 0; b < np; b++) JtJ[a][b] += J[i][a] * J[i][b];
      }
    }

    const damped = JtJ.map((row, a) =>
      row.map((v, b) => (a === b ? v * (1 + lambda) : v)),
    );
    const delta = solve(damped, Jtr);
    if (!delta) {
      lambda *= 10;
      if (lambda > 1e12) break;
      continue;
    }

    const pNew = p.map((v, i) => v + delta[i]);
    const sseNew = residualSumSquares(x, y, model.fn, pNew);

    if (sseNew < sse) {
      const rel = (sse - sseNew) / Math.max(sse, 1e-30);
      p = pNew;
      sse = sseNew;
      lambda = Math.max(lambda / 3, 1e-12);
      if (rel < 1e-9) {
        converged = true;
        break;
      }
    } else {
      lambda *= 5;
      if (lambda > 1e12) break;
    }
  }

  // Goodness-of-fit.
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0;
  for (const v of y) ssTot += (v - yMean) * (v - yMean);
  const r2 = ssTot === 0 ? 1 : 1 - sse / ssTot;
  const dof = n - np;
  const adjR2 = dof > 0 ? 1 - ((1 - r2) * (n - 1)) / dof : r2;
  const rmse = dof > 0 ? Math.sqrt(sse / dof) : 0;

  // Parameter covariance ≈ σ²·(JᵀJ)⁻¹.
  const JtJfinal: number[][] = Array.from({ length: np }, () =>
    new Array(np).fill(0),
  );
  for (let i = 0; i < n; i++) {
    const h: number[] = new Array(np);
    for (let j = 0; j < np; j++) {
      const hh = Math.max(1e-6, Math.abs(p[j]) * 1e-6);
      const pp = [...p];
      const pm = [...p];
      pp[j] += hh;
      pm[j] -= hh;
      h[j] = (model.fn(x[i], pp) - model.fn(x[i], pm)) / (2 * hh);
    }
    for (let a = 0; a < np; a++)
      for (let b = 0; b < np; b++) JtJfinal[a][b] += h[a] * h[b];
  }
  const cov = invert(JtJfinal);
  const variance = dof > 0 ? sse / dof : 0;
  const se = p.map((_, i) =>
    cov && cov[i][i] >= 0 ? Math.sqrt(variance * cov[i][i]) : NaN,
  );

  const params: FitParam[] = p.map((value, i) => ({
    name: model.params[i].name,
    value,
    se: se[i],
    ci: [value - 1.96 * se[i], value + 1.96 * se[i]],
  }));

  const derived: FitDerived[] = (model.derived ?? []).map((d) => ({
    label: d.label,
    value: d.value(p),
    se: d.se ? d.se(p, se) : null,
    hint: d.hint,
  }));

  return {
    modelId: model.id,
    params,
    derived,
    rawParams: p,
    r2,
    adjR2,
    rmse,
    sse,
    dof,
    n,
    iterations,
    converged,
    predict: (xi: number) => model.fn(xi, p),
  };
}

/* ------------------------------------------------------------------ *
 * Model library.
 * ------------------------------------------------------------------ */

const med = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const min = (a: number[]) => Math.min(...a);
const max = (a: number[]) => Math.max(...a);

export const CURVE_MODELS: CurveModel[] = [
  {
    id: "dr4pl",
    name: "Dose–response (4PL)",
    equation: "Y = Bottom + (Top−Bottom) / (1 + 10^((LogEC50−X)·Hill))",
    blurb:
      "Four-parameter logistic. X is log10(dose). Reports EC50/IC50 and Hill slope — the standard pharmacology curve.",
    xIsLog: true,
    params: [
      { name: "Bottom", init: (_x, y) => min(y) },
      { name: "Top", init: (_x, y) => max(y) },
      { name: "LogEC50", init: (x) => med(x), hint: "log10(dose) at midpoint" },
      { name: "HillSlope", init: () => 1 },
    ],
    fn: (x, p) => {
      const [bottom, top, logEC50, hill] = p;
      return bottom + (top - bottom) / (1 + Math.pow(10, (logEC50 - x) * hill));
    },
    derived: [
      {
        label: "EC50 / IC50",
        value: (p) => Math.pow(10, p[2]),
        hint: "back-transformed from LogEC50",
      },
      {
        label: "Span (Top−Bottom)",
        value: (p) => p[1] - p[0],
      },
    ],
  },
  {
    id: "dr5pl",
    name: "Dose–response (5PL, asymmetric)",
    equation:
      "Y = Bottom + (Top−Bottom) / (1 + 10^((LogEC50−X)·Hill))^S",
    blurb:
      "Five-parameter logistic with an asymmetry factor S (Richards). For curves that aren't symmetric around the midpoint.",
    xIsLog: true,
    params: [
      { name: "Bottom", init: (_x, y) => min(y) },
      { name: "Top", init: (_x, y) => max(y) },
      { name: "LogEC50", init: (x) => med(x) },
      { name: "HillSlope", init: () => 1 },
      { name: "S", init: () => 1, hint: "asymmetry (1 = symmetric)" },
    ],
    fn: (x, p) => {
      const [bottom, top, logEC50, hill, s] = p;
      const denom = Math.pow(1 + Math.pow(10, (logEC50 - x) * hill), s);
      return bottom + (top - bottom) / denom;
    },
    derived: [
      { label: "EC50 (approx)", value: (p) => Math.pow(10, p[2]) },
    ],
  },
  {
    id: "expdecay",
    name: "Exponential decay",
    equation: "Y = Plateau + (Y0−Plateau)·e^(−K·X)",
    blurb:
      "One-phase decay. Reports rate constant K, half-life and the plateau — kinetics, clearance, fluorescence decay.",
    params: [
      { name: "Y0", init: (_x, y) => y[0] ?? max(y) },
      { name: "Plateau", init: (_x, y) => min(y) },
      {
        name: "K",
        init: (x) => 1 / Math.max(1e-6, max(x) - min(x)),
        hint: "rate constant",
      },
    ],
    fn: (x, p) => {
      const [y0, plateau, k] = p;
      return plateau + (y0 - plateau) * Math.exp(-k * x);
    },
    derived: [
      {
        label: "Half-life",
        value: (p) => Math.LN2 / p[2],
        hint: "ln(2) / K",
      },
      { label: "Rate constant K", value: (p) => p[2] },
    ],
  },
  {
    id: "expgrowth",
    name: "Exponential growth",
    equation: "Y = Y0·e^(K·X)",
    blurb:
      "Unbounded exponential growth. Reports the rate constant K and doubling time.",
    params: [
      { name: "Y0", init: (_x, y) => Math.max(1e-6, min(y)) },
      { name: "K", init: (x) => 1 / Math.max(1e-6, max(x) - min(x)) },
    ],
    fn: (x, p) => p[0] * Math.exp(p[1] * x),
    derived: [
      { label: "Doubling time", value: (p) => Math.LN2 / p[1], hint: "ln(2) / K" },
    ],
  },
  {
    id: "michaelis",
    name: "Michaelis–Menten",
    equation: "Y = Vmax·X / (Km + X)",
    blurb:
      "Enzyme kinetics. Reports Vmax (max rate) and Km (substrate concentration at half-Vmax).",
    params: [
      { name: "Vmax", init: (_x, y) => max(y) * 1.1 },
      { name: "Km", init: (x) => med(x), hint: "X at half-Vmax" },
    ],
    fn: (x, p) => (p[0] * x) / (p[1] + x),
    derived: [{ label: "Km", value: (p) => p[1] }],
  },
  {
    id: "logistic",
    name: "Logistic growth (sigmoidal)",
    equation: "Y = L / (1 + e^(−k·(X−X0)))",
    blurb:
      "Population / saturable growth. Reports carrying capacity L, inflection point X0 and growth rate k.",
    params: [
      { name: "L", init: (_x, y) => max(y), hint: "carrying capacity" },
      { name: "X0", init: (x) => med(x), hint: "inflection point" },
      { name: "k", init: (x) => 4 / Math.max(1e-6, max(x) - min(x)) },
    ],
    fn: (x, p) => p[0] / (1 + Math.exp(-p[2] * (x - p[1]))),
    derived: [{ label: "Inflection X0", value: (p) => p[1] }],
  },
  {
    id: "gaussian",
    name: "Gaussian peak",
    equation: "Y = A·e^(−(X−μ)² / (2σ²)) + C",
    blurb:
      "Single Gaussian peak — chromatography, spectroscopy. Reports amplitude, centre (μ), width (σ) and FWHM.",
    params: [
      { name: "A", init: (_x, y) => max(y) - min(y) },
      { name: "mu", init: (x, y) => x[y.indexOf(max(y))] ?? med(x) },
      { name: "sigma", init: (x) => (max(x) - min(x)) / 6 || 1 },
      { name: "C", init: (_x, y) => min(y) },
    ],
    fn: (x, p) => {
      const [a, mu, sigma, c] = p;
      return a * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) + c;
    },
    derived: [
      { label: "FWHM", value: (p) => 2.3548 * Math.abs(p[2]), hint: "2.355·σ" },
      { label: "Centre μ", value: (p) => p[1] },
    ],
  },
];

export function modelById(id: string): CurveModel | undefined {
  return CURVE_MODELS.find((m) => m.id === id);
}
