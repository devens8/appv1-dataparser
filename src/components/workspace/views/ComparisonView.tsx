"use client";

import { useMemo, useState } from "react";
import type {
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  EChartsOption,
  SeriesOption,
} from "echarts";
import type { Workspace } from "@/types";
import { columnByName, columnValues, numericColumns } from "@/lib/dataset";
import { descriptiveStats, welchTTest } from "@/lib/stats";
import {
  oneWayAnova,
  postHocPairwise,
  mannWhitneyU,
  normalityTest,
} from "@/lib/tests";
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, Segmented, Badge, StatGrid } from "@/components/ui";

type TestType = "welch" | "mw";

const AX_LABEL = { color: "#a1a1aa", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#3f3f46" } };
const SPLIT = { lineStyle: { color: "#27272a" } };

interface Series {
  id: string;
  name: string;
  color: string;
  values: number[];
  stats: ReturnType<typeof descriptiveStats>;
}

export default function ComparisonView({
  workspace,
}: {
  workspace: Workspace;
}) {
  // Union of numeric column names across every dataset in the workspace.
  const sharedColumns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of workspace.datasets) {
      for (const c of numericColumns(d)) {
        counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, n]) => ({ name, datasets: n }));
  }, [workspace.datasets]);

  const [colName, setColName] = useState<string>(
    sharedColumns[0]?.name ?? "",
  );
  const [testType, setTestType] = useState<TestType>("welch");

  const active = sharedColumns.some((c) => c.name === colName)
    ? colName
    : (sharedColumns[0]?.name ?? "");

  const series = useMemo<Series[]>(() => {
    return workspace.datasets
      .map((d, i) => {
        const col = columnByName(d, active);
        if (!col || col.type !== "number") return null;
        const values = columnValues(d, col.index);
        if (values.length === 0) return null;
        return {
          id: d.id,
          name: d.name,
          color: CHART_PALETTE[i % CHART_PALETTE.length],
          values,
          stats: descriptiveStats(values),
        } satisfies Series;
      })
      .filter((s): s is Series => s !== null);
  }, [workspace.datasets, active]);

  // Mean ± SEM bar chart with error-bar whiskers.
  const barOption = useMemo<EChartsOption>(() => {
    const cats = series.map((s) => s.name);
    const means = series.map((s) => s.stats?.mean ?? 0);
    const errData = series.map((s, i) => {
      const m = s.stats?.mean ?? 0;
      const sem = s.stats?.sem ?? 0;
      return [i, m + sem, m - sem];
    });

    const renderError = (
      _params: CustomSeriesRenderItemParams,
      api: CustomSeriesRenderItemAPI,
    ) => {
      const xIndex = api.value(0) as number;
      const high = api.coord([xIndex, api.value(1) as number]);
      const low = api.coord([xIndex, api.value(2) as number]);
      const half = (api.size?.([1, 0]) as number[])[0] * 0.12;
      const style = { stroke: "#d4d4d8", lineWidth: 1.5 };
      return {
        type: "group" as const,
        children: [
          {
            type: "line" as const,
            shape: { x1: high[0] - half, y1: high[1], x2: high[0] + half, y2: high[1] },
            style,
          },
          {
            type: "line" as const,
            shape: { x1: low[0] - half, y1: low[1], x2: low[0] + half, y2: low[1] },
            style,
          },
          {
            type: "line" as const,
            shape: { x1: high[0], y1: high[1], x2: low[0], y2: low[1] },
            style,
          },
        ],
      };
    };

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 56, right: 24, top: 24, bottom: 60, containLabel: true },
      xAxis: {
        type: "category",
        data: cats,
        axisLabel: { ...AX_LABEL, rotate: cats.length > 4 ? 20 : 0 },
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: active,
        nameTextStyle: { color: "#d4d4d8", fontSize: 12 },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "bar",
          data: means.map((m, i) => ({
            value: m,
            itemStyle: { color: series[i].color, borderRadius: [3, 3, 0, 0] },
          })),
          barWidth: "46%",
          z: 2,
        },
        {
          type: "custom",
          renderItem: renderError,
          encode: { x: 0, y: [1, 2] },
          data: errData,
          z: 5,
          silent: true,
        },
      ] as SeriesOption[],
    } as EChartsOption;
  }, [series, active]);

  // Box-plot overlay (one box per dataset, 1.5·IQR whiskers).
  const boxOption = useMemo<EChartsOption>(() => {
    const cats = series.map((s) => s.name);
    const boxes = series.map((s) => {
      const st = s.stats;
      if (!st) return [0, 0, 0, 0, 0];
      const low = Math.max(st.min, st.q1 - 1.5 * st.iqr);
      const high = Math.min(st.max, st.q3 + 1.5 * st.iqr);
      return [low, st.q1, st.median, st.q3, high];
    });
    return {
      tooltip: { trigger: "item" },
      grid: { left: 56, right: 24, top: 24, bottom: 60, containLabel: true },
      xAxis: {
        type: "category",
        data: cats,
        axisLabel: { ...AX_LABEL, rotate: cats.length > 4 ? 20 : 0 },
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "boxplot",
          data: boxes.map((b, i) => ({
            value: b,
            itemStyle: {
              color: `${series[i].color}2e`,
              borderColor: series[i].color,
            },
          })),
        },
      ] as SeriesOption[],
    } as EChartsOption;
  }, [series]);

  // One-way ANOVA across all groups (omnibus test for ≥3 groups).
  const anova = useMemo(
    () =>
      oneWayAnova(series.map((s) => ({ name: s.name, values: s.values }))),
    [series],
  );

  const postHoc = useMemo(
    () =>
      anova
        ? postHocPairwise(
            series.map((s) => ({ name: s.name, values: s.values })),
            anova,
          )
        : [],
    [series, anova],
  );

  // Pairwise comparisons — parametric (Welch t) or nonparametric (Mann–Whitney).
  const pairs = useMemo(() => {
    const out: {
      a: string;
      b: string;
      meanDiff: number | null;
      stat: number | null;
      statLabel: string;
      df: number | null;
      p: number | null;
      effect: number | null;
      effectLabel: string;
      significant: boolean;
    }[] = [];
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        const A = series[i];
        const B = series[j];
        if (testType === "welch") {
          const r = welchTTest(A.values, B.values);
          out.push({
            a: A.name,
            b: B.name,
            meanDiff: r?.meanDiff ?? null,
            stat: r?.t ?? null,
            statLabel: "t",
            df: r?.df ?? null,
            p: r?.p ?? null,
            effect: r?.cohensD ?? null,
            effectLabel: "Cohen's d",
            significant: r?.significant ?? false,
          });
        } else {
          const r = mannWhitneyU(A.values, B.values);
          out.push({
            a: A.name,
            b: B.name,
            meanDiff: (A.stats?.median ?? 0) - (B.stats?.median ?? 0),
            stat: r?.u ?? null,
            statLabel: "U",
            df: null,
            p: r?.p ?? null,
            effect: r?.z ?? null,
            effectLabel: "z",
            significant: r?.significant ?? false,
          });
        }
      }
    }
    return out;
  }, [series, testType]);

  // Per-group normality (D'Agostino–Pearson) for picking parametric vs not.
  const normality = useMemo(
    () =>
      series.map((s) => ({
        name: s.name,
        result: normalityTest(s.values),
      })),
    [series],
  );

  if (workspace.datasets.length < 2) {
    return (
      <div className="grid-bg flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-panel/30 py-20 text-center">
        <h3 className="text-sm font-semibold text-fg">
          Add a second dataset to compare
        </h3>
        <p className="mt-1 max-w-sm text-sm text-fgmuted">
          Comparison runs across the datasets in this workspace. Import at
          least two datasets sharing a numeric column.
        </p>
      </div>
    );
  }

  if (sharedColumns.length === 0) {
    return (
      <div className="grid-bg flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-panel/30 py-20 text-center">
        <h3 className="text-sm font-semibold text-fg">
          No numeric columns to compare
        </h3>
        <p className="mt-1 max-w-sm text-sm text-fgmuted">
          None of the datasets in this workspace contain numeric columns.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title="Compare datasets"
        subtitle={`${series.length} of ${workspace.datasets.length} datasets contain “${active}”`}
        actions={
          <Field label="Variable">
            <Select value={active} onChange={setColName}>
              {sharedColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.datasets})
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-fgsubtle">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5">Dataset</th>
                <th className="px-5 py-2.5 text-right">N</th>
                <th className="px-5 py-2.5 text-right">Mean</th>
                <th className="px-5 py-2.5 text-right">± SEM</th>
                <th className="px-5 py-2.5 text-right">Std</th>
                <th className="px-5 py-2.5 text-right">Median</th>
                <th className="px-5 py-2.5 text-right">Min</th>
                <th className="px-5 py-2.5 text-right">Max</th>
                <th className="px-5 py-2.5">Normality</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s, si) => (
                <tr
                  key={s.id}
                  className="border-t border-line/60 hover:bg-panel2/30"
                >
                  <td className="px-5 py-2 font-medium text-fg">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: s.color }} />
                    {s.name}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {s.stats ? fmtInt(s.stats.count) : "—"}
                  </td>
                  <td className="tabular px-5 py-2 text-right font-medium text-accent">
                    {fmt(s.stats?.mean)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {fmt(s.stats?.sem)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {fmt(s.stats?.std)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {fmt(s.stats?.median)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {fmt(s.stats?.min)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-fgmuted">
                    {fmt(s.stats?.max)}
                  </td>
                  <td className="px-5 py-2">
                    {(() => {
                      const nr = normality[si]?.result;
                      if (!nr)
                        return <span className="text-fgsubtle">n&lt;8</span>;
                      return (
                        <Badge tone={nr.normal ? "emerald" : "amber"}>
                          {nr.normal ? "Normal" : "Non-normal"}
                        </Badge>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2.5 text-[11px] text-fgsubtle">
          Normality by D&apos;Agostino–Pearson omnibus K² (α = 0.05). Non-normal
          groups favour the nonparametric Mann–Whitney test below.
        </p>
      </Panel>

      {anova && series.length >= 3 && (
        <Panel
          title="One-way ANOVA"
          subtitle="Omnibus test for a difference among the group means"
          actions={
            <Badge tone={anova.significant ? "emerald" : "slate"}>
              {anova.significant ? "Significant" : "n.s."}
            </Badge>
          }
        >
          <StatGrid
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            items={[
              { label: "F", value: fmt(anova.f, 3), accent: "text-accent" },
              {
                label: "p",
                value:
                  anova.p < 0.001 ? "< 0.001" : fmt(anova.p, 4),
                accent: anova.significant ? "text-emerald-300" : undefined,
              },
              {
                label: "df",
                value: `${anova.dfBetween}, ${anova.dfWithin}`,
              },
              {
                label: "η²",
                value: fmt(anova.etaSquared, 3),
                hint: "effect size",
              },
              { label: "MS between", value: fmt(anova.msBetween) },
              { label: "MS within", value: fmt(anova.msWithin) },
            ]}
          />
          {postHoc.length > 0 && (
            <div className="overflow-auto border-t border-line/70">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-fgsubtle">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2.5">Post-hoc (Bonferroni)</th>
                    <th className="px-5 py-2.5 text-right">Δ Mean</th>
                    <th className="px-5 py-2.5 text-right">t</th>
                    <th className="px-5 py-2.5 text-right">p (raw)</th>
                    <th className="px-5 py-2.5 text-right">p (adj.)</th>
                    <th className="px-5 py-2.5">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {postHoc.map((p, i) => (
                    <tr
                      key={i}
                      className="border-t border-line/60 hover:bg-panel2/30"
                    >
                      <td className="px-5 py-2 text-fg">
                        {p.a} <span className="text-fgsubtle">vs</span> {p.b}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-fgmuted">
                        {fmt(p.meanDiff)}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-fgmuted">
                        {fmt(p.t, 2)}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-fgmuted">
                        {p.pRaw < 0.001 ? "< 0.001" : fmt(p.pRaw, 3)}
                      </td>
                      <td className="tabular px-5 py-2 text-right font-medium text-fg">
                        {p.pAdjusted < 0.001 ? "< 0.001" : fmt(p.pAdjusted, 3)}
                      </td>
                      <td className="px-5 py-2">
                        <Badge tone={p.significant ? "emerald" : "slate"}>
                          {p.significant ? "Significant" : "n.s."}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-5 py-3 text-[11px] text-fgsubtle">
            Post-hoc pairwise comparisons use the pooled within-group variance
            (MS within) with a Bonferroni correction across all {postHoc.length}{" "}
            pairs.
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Mean ± SEM" subtitle="Group means with standard error">
          <div className="p-3">
            <Chart option={barOption} height={320} />
          </div>
        </Panel>
        <Panel title="Distribution" subtitle="Box plot per dataset">
          <div className="p-3">
            <Chart option={boxOption} height={320} />
          </div>
        </Panel>
      </div>

      {pairs.length > 0 && (
        <Panel
          title="Pairwise comparison"
          subtitle={
            testType === "welch"
              ? "Welch's unequal-variance t-test · Cohen's d effect size"
              : "Mann–Whitney U · nonparametric rank-sum test"
          }
          actions={
            <Segmented
              value={testType}
              onChange={setTestType}
              options={[
                { value: "welch", label: "Welch t" },
                { value: "mw", label: "Mann–Whitney" },
              ]}
            />
          }
        >
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-fgsubtle">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5">Comparison</th>
                  <th className="px-5 py-2.5 text-right">
                    {testType === "welch" ? "Δ Mean" : "Δ Median"}
                  </th>
                  <th className="px-5 py-2.5 text-right">
                    {pairs[0]?.statLabel ?? "stat"}
                  </th>
                  <th className="px-5 py-2.5 text-right">p</th>
                  <th className="px-5 py-2.5 text-right">
                    {pairs[0]?.effectLabel ?? "effect"}
                  </th>
                  <th className="px-5 py-2.5">Result</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p, i) => (
                  <tr
                    key={i}
                    className="border-t border-line/60 hover:bg-panel2/30"
                  >
                    <td className="px-5 py-2 text-fg">
                      {p.a} <span className="text-fgsubtle">vs</span> {p.b}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-fgmuted">
                      {p.meanDiff == null ? "—" : fmt(p.meanDiff)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-fgmuted">
                      {p.stat == null ? "—" : fmt(p.stat, 2)}
                    </td>
                    <td className="tabular px-5 py-2 text-right font-medium text-fg">
                      {p.p == null ? "—" : p.p < 0.001 ? "< 0.001" : fmt(p.p, 3)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-fgmuted">
                      {p.effect == null ? "—" : fmt(p.effect, 2)}
                    </td>
                    <td className="px-5 py-2">
                      <Badge tone={p.significant ? "emerald" : "slate"}>
                        {p.significant ? "Significant" : "n.s."}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[11px] text-fgsubtle">
            Significance assessed at α = 0.05 (two-tailed). Pairwise p-values
            here are uncorrected — see the ANOVA post-hoc table for
            multiplicity-adjusted comparisons.
          </p>
        </Panel>
      )}
    </div>
  );
}
