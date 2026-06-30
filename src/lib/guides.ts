/**
 * Plain-language guides for each analysis tool — what it is, why it matters for
 * research, and how to read the result — each with a small worked diagram.
 * Used by the /learn/[id] pages linked from the sidebar.
 */

import type { EChartsOption } from "echarts";
import { CHART_PALETTE } from "@/components/Chart";

export interface Guide {
  id: string;
  label: string;
  tagline: string;
  /** Paragraphs. */
  what: string;
  why: string;
  interpret: string;
  exampleCaption: string;
  example: () => EChartsOption;
}

const ACCENT = CHART_PALETTE[0];
const FIT = "#d97706";

function noise(i: number, amp = 1): number {
  return ((Math.sin(i * 12.9898) * 43758.5453) % 1) * amp;
}

export const GUIDES: Guide[] = [
  {
    id: "charts",
    label: "Charts & visualization",
    tagline: "See the shape of your data before you trust any number.",
    what:
      "Scatter and line plots show how one variable relates to another; histograms show a single variable's distribution; box plots summarise spread; and a correlation matrix shows how every numeric column moves with every other.",
    why:
      "Visual inspection catches what summary statistics hide — non-linearity, clusters, ceiling effects, data-entry errors and skew. In research it's the first defence against drawing conclusions from a mean that doesn't represent the data.",
    interpret:
      "Look for the overall trend, the scatter around it, and any points that sit far from the cloud. A tight band around the fit line means a strong relationship; a funnel shape means the variance changes with X (heteroscedasticity).",
    exampleCaption: "Scatter of Y vs X with a linear fit — points hug the line, so the relationship is strong.",
    example: () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 24; i++) {
        const x = i;
        pts.push([x, 2 + 0.6 * x + (noise(i, 6) - 3)]);
      }
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 36, containLabel: true },
        xAxis: { type: "value", name: "X", nameLocation: "middle", nameGap: 24, scale: true },
        yAxis: { type: "value", name: "Y", scale: true },
        series: [
          { type: "scatter", data: pts, symbolSize: 7, itemStyle: { color: ACCENT } },
          {
            type: "line",
            data: pts.map(([x]) => [x, 2 + 0.6 * x]),
            showSymbol: false,
            lineStyle: { color: FIT, width: 2 },
          },
        ],
      };
    },
  },
  {
    id: "curve-fit",
    label: "Curve fitting",
    tagline: "Fit a mechanistic model and read off the parameters that matter.",
    what:
      "Nonlinear regression fits an equation (dose–response, exponential decay, Michaelis–Menten, growth) to your data by minimising the squared error, then reports each parameter with a standard error and confidence interval.",
    why:
      "Parameters like EC50/IC50, Hill slope, Vmax, Km and half-life are the actual quantities you report and compare across conditions. A fit turns a cloud of points into a few interpretable, publishable numbers.",
    interpret:
      "Check R² and the residual plot first — residuals should scatter randomly around zero. Then read the parameters: the EC50 is the dose at the curve's midpoint; a tight confidence interval means the estimate is well-determined.",
    exampleCaption: "Four-parameter dose–response: the curve's midpoint is the EC50.",
    example: () => {
      const pts: [number, number][] = [];
      const curve: [number, number][] = [];
      const f = (x: number) => 5 + 95 / (1 + Math.pow(10, (1 - x) * 1.2));
      for (let i = 0; i <= 16; i++) {
        const x = -1 + (i * 4) / 16;
        pts.push([x, f(x) + (noise(i, 10) - 5)]);
      }
      for (let i = 0; i <= 80; i++) {
        const x = -1 + (i * 4) / 80;
        curve.push([x, f(x)]);
      }
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 36, containLabel: true },
        xAxis: { type: "value", name: "log10(dose)", nameLocation: "middle", nameGap: 24, scale: true },
        yAxis: { type: "value", name: "Response", scale: true },
        series: [
          { type: "scatter", data: pts, symbolSize: 7, itemStyle: { color: ACCENT } },
          { type: "line", data: curve, showSymbol: false, smooth: true, lineStyle: { color: FIT, width: 2.5 } },
        ],
      };
    },
  },
  {
    id: "statistics",
    label: "Descriptive statistics",
    tagline: "Summarise centre, spread and shape — the foundation of every report.",
    what:
      "Mean, median, standard deviation, SEM, quartiles, IQR, skewness and kurtosis condense a column into a handful of numbers, alongside a histogram and box plot of the distribution.",
    why:
      "These are the values that populate a results table and method section. The SEM drives error bars; skewness and a normality check decide whether parametric tests are even valid for your data.",
    interpret:
      "If mean ≈ median and skew ≈ 0, the data is roughly symmetric and the mean is representative. A large gap between mean and median, or |skew| > 1, signals a skewed distribution where the median (and nonparametric tests) may be more honest.",
    exampleCaption: "A histogram with a near-symmetric, bell-shaped distribution.",
    example: () => {
      const bins = 13;
      const counts = [1, 2, 4, 7, 11, 16, 19, 16, 11, 7, 4, 2, 1];
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 36, containLabel: true },
        xAxis: {
          type: "category",
          name: "Value",
          nameLocation: "middle",
          nameGap: 26,
          data: Array.from({ length: bins }, (_, i) => String(i - 6)),
        },
        yAxis: { type: "value", name: "Frequency" },
        series: [
          { type: "bar", data: counts, itemStyle: { color: ACCENT, borderRadius: [3, 3, 0, 0] }, barCategoryGap: "8%" },
        ],
      };
    },
  },
  {
    id: "anova",
    label: "ANOVA & t-tests",
    tagline: "Decide whether group differences are real or just noise.",
    what:
      "A t-test compares two group means; one-way ANOVA compares three or more at once and reports an F-statistic and p-value. Post-hoc tests then say which specific pairs differ, and Mann–Whitney is the nonparametric fallback.",
    why:
      "This is how a paper claims 'treatment changed the outcome'. The p-value quantifies how surprising your data would be if there were truly no difference; effect size (Cohen's d, η²) says whether the difference is large enough to matter.",
    interpret:
      "p < 0.05 means the difference is unlikely under the null hypothesis — but always pair it with an effect size and the group means. A significant ANOVA tells you something differs; the post-hoc table tells you what.",
    exampleCaption: "Three groups — Control and Vehicle overlap, Treatment stands apart.",
    example: () => {
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 32, containLabel: true },
        xAxis: { type: "category", data: ["Control", "Treatment", "Vehicle"] },
        yAxis: { type: "value", name: "Response", scale: true },
        series: [
          {
            type: "boxplot",
            data: [
              [4.5, 5.6, 6.1, 6.7, 7.6],
              [7.4, 8.4, 9.0, 9.6, 10.6],
              [4.8, 5.9, 6.4, 6.9, 7.8],
            ],
            itemStyle: { color: "rgba(249,115,22,0.18)", borderColor: ACCENT },
          },
        ],
      };
    },
  },
  {
    id: "formula",
    label: "Formula columns · f(x)",
    tagline: "Derive new columns: transform, normalise and combine.",
    what:
      "A derived column applies a transform (log, z-score, Δ, % change) or a free-form expression with {column} references to create a new numeric column — for example log10({dose}) or {signal} / {baseline}.",
    why:
      "Many models assume a particular scale: dose–response needs log-concentration, skewed data is tamed by a log transform, and cross-sample comparison needs normalisation. Deriving the right column is often what makes the downstream analysis valid.",
    interpret:
      "A good transform straightens a curved relationship or symmetrises a skewed distribution. Below, an exponential relationship (curved) becomes a straight line once Y is log-transformed.",
    exampleCaption: "Log-transforming Y linearises an exponential relationship.",
    example: () => {
      const raw: [number, number][] = [];
      const logd: [number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const x = i;
        const y = 2 * Math.exp(0.22 * x);
        raw.push([x, y]);
        logd.push([x, Math.log10(y) * 30]); // scaled to share the axis
      }
      return {
        grid: { left: 44, right: 16, top: 28, bottom: 32, containLabel: true },
        legend: { top: 2, data: ["raw Y", "log10(Y)"] },
        xAxis: { type: "value", name: "X", nameLocation: "middle", nameGap: 24, scale: true },
        yAxis: { type: "value", scale: true },
        series: [
          { type: "line", name: "raw Y", data: raw, showSymbol: false, lineStyle: { color: ACCENT, width: 2 } },
          { type: "line", name: "log10(Y)", data: logd, showSymbol: false, lineStyle: { color: FIT, width: 2, type: "dashed" } },
        ],
      };
    },
  },
  {
    id: "compare",
    label: "Compare datasets",
    tagline: "Put runs side by side with the right statistical test.",
    what:
      "Comparison aligns a shared variable across the datasets in a workspace and shows group means ± SEM, box plots, ANOVA, pairwise tests and a per-group normality check.",
    why:
      "Experiments are repeated across conditions, days or replicates. Comparing them properly — with a test that matches the data's distribution — is how you separate a real effect from batch-to-batch variation.",
    interpret:
      "Overlapping box plots usually mean no significant difference; clearly separated boxes with non-overlapping notches suggest a real one. Let the normality flag pick parametric (Welch) vs nonparametric (Mann–Whitney).",
    exampleCaption: "Box plots for two groups — limited overlap hints at a real difference.",
    example: () => {
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 32, containLabel: true },
        xAxis: { type: "category", data: ["Run A", "Run B"] },
        yAxis: { type: "value", name: "Value", scale: true },
        series: [
          {
            type: "boxplot",
            data: [
              [4, 5.5, 6.2, 7, 8.5],
              [6.5, 8, 9, 10, 11.5],
            ],
            itemStyle: { color: "rgba(249,115,22,0.18)", borderColor: ACCENT },
          },
        ],
      };
    },
  },
  {
    id: "longitudinal",
    label: "Longitudinal tracking",
    tagline: "Follow a measure across datasets collected over time.",
    what:
      "Longitudinal view orders datasets chronologically and tracks how a variable's mean shifts from one to the next, fitting a trend across the sequence.",
    why:
      "Stability studies, repeated assays and monitoring all ask 'is this drifting?'. Plotting the mean over time with error bars makes a slow drift — invisible in any single run — obvious.",
    interpret:
      "A flat line with overlapping error bars means stable; a consistent slope means drift. The fitted trend's slope and R² quantify how strong and steady that drift is.",
    exampleCaption: "Group mean ± SEM across time points with an upward trend.",
    example: () => {
      const means = [5.0, 5.4, 5.9, 6.1, 6.8, 7.2];
      const pts = means.map((m, i) => [i, m]);
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 32, containLabel: true },
        xAxis: { type: "category", data: means.map((_, i) => `t${i + 1}`) },
        yAxis: { type: "value", name: "Mean", scale: true },
        series: [
          { type: "line", data: pts.map((p) => p[1]), symbolSize: 8, itemStyle: { color: ACCENT }, lineStyle: { color: ACCENT, width: 2 } },
          { type: "line", data: means.map((_, i) => 4.9 + 0.42 * i), showSymbol: false, lineStyle: { color: FIT, width: 2, type: "dashed" } },
        ],
      };
    },
  },
  {
    id: "anomaly",
    label: "Anomaly detection",
    tagline: "Flag points and shifts that break the local pattern.",
    what:
      "A rolling z-score flags points that deviate sharply from their recent neighbours, while a CUSUM chart detects sustained step-changes in the mean (regime shifts).",
    why:
      "Instrument glitches, contamination and process changes hide inside otherwise normal-looking series. Detecting them protects downstream statistics and can itself be the finding (e.g. when a system changed state).",
    interpret:
      "Isolated red points are spikes/dips worth checking. A CUSUM line that crosses its threshold marks the index where the mean shifted — everything after it may belong to a different regime.",
    exampleCaption: "A steady series with two flagged spikes.",
    example: () => {
      const line: [number, number][] = [];
      const flagged: [number, number][] = [];
      for (let i = 0; i < 40; i++) {
        let y = 10 + Math.sin(i / 4) * 1.5 + (noise(i, 1) - 0.5);
        if (i === 14) y += 9;
        if (i === 29) y -= 8;
        line.push([i, y]);
        if (i === 14 || i === 29) flagged.push([i, y]);
      }
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 32, containLabel: true },
        xAxis: { type: "value", name: "Index", nameLocation: "middle", nameGap: 24, scale: true },
        yAxis: { type: "value", scale: true },
        series: [
          { type: "line", data: line, showSymbol: false, lineStyle: { color: ACCENT, width: 1.5 } },
          { type: "scatter", data: flagged, symbolSize: 12, itemStyle: { color: "#f43f5e" } },
        ],
      };
    },
  },
  {
    id: "trends",
    label: "Trends & outliers",
    tagline: "Quantify direction and strength; isolate values that distort it.",
    what:
      "Linear regression gives a slope, R² and a Mann–Kendall monotonic-trend statistic; outlier methods (IQR, Z-score, modified Z/MAD) flag values that sit outside the expected range.",
    why:
      "Researchers need to state not just that something increases, but how fast and how reliably — and to decide, transparently, which points are genuine and which are artefacts before fitting.",
    interpret:
      "R² near 1 means the line explains most of the variation; a slope's sign gives direction. Points beyond the IQR fences (or |z| above the threshold) are candidates for review — never silently deleted.",
    exampleCaption: "An upward trend with one clear outlier above the line.",
    example: () => {
      const pts: [number, number][] = [];
      const out: [number, number][] = [];
      for (let i = 0; i < 20; i++) {
        const x = i;
        const y = 3 + 0.5 * x + (noise(i, 3) - 1.5);
        if (i === 12) {
          out.push([x, y + 11]);
        } else {
          pts.push([x, y]);
        }
      }
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 36, containLabel: true },
        xAxis: { type: "value", name: "X", nameLocation: "middle", nameGap: 24, scale: true },
        yAxis: { type: "value", name: "Y", scale: true },
        series: [
          { type: "scatter", data: pts, symbolSize: 7, itemStyle: { color: ACCENT } },
          { type: "scatter", data: out, symbolSize: 12, itemStyle: { color: "#f43f5e" } },
          { type: "line", data: pts.map(([x]) => [x, 3 + 0.5 * x]), showSymbol: false, lineStyle: { color: FIT, width: 2 } },
        ],
      };
    },
  },
];

export function guideById(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}
