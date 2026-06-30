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
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, Badge } from "@/components/ui";

const AX_LABEL = { color: "#94a3b8", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#334155" } };
const SPLIT = { lineStyle: { color: "#1e293b" } };

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
      const style = { stroke: "#cbd5e1", lineWidth: 1.5 };
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
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
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

  // Pairwise Welch t-tests across every dataset pair.
  const pairs = useMemo(() => {
    const out: {
      a: string;
      b: string;
      result: ReturnType<typeof welchTTest>;
    }[] = [];
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        out.push({
          a: series[i].name,
          b: series[j].name,
          result: welchTTest(series[i].values, series[j].values),
        });
      }
    }
    return out;
  }, [series]);

  if (workspace.datasets.length < 2) {
    return (
      <div className="grid-bg flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-20 text-center">
        <h3 className="text-sm font-semibold text-slate-200">
          Add a second dataset to compare
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Comparison runs across the datasets in this workspace. Import at
          least two datasets sharing a numeric column.
        </p>
      </div>
    );
  }

  if (sharedColumns.length === 0) {
    return (
      <div className="grid-bg flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-20 text-center">
        <h3 className="text-sm font-semibold text-slate-200">
          No numeric columns to compare
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
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
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="px-5 py-2.5">Dataset</th>
                <th className="px-5 py-2.5 text-right">N</th>
                <th className="px-5 py-2.5 text-right">Mean</th>
                <th className="px-5 py-2.5 text-right">± SEM</th>
                <th className="px-5 py-2.5 text-right">Std</th>
                <th className="px-5 py-2.5 text-right">Median</th>
                <th className="px-5 py-2.5 text-right">Min</th>
                <th className="px-5 py-2.5 text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-slate-800/60 hover:bg-slate-800/30"
                >
                  <td className="px-5 py-2 font-medium text-slate-200">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: s.color }} />
                    {s.name}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {s.stats ? fmtInt(s.stats.count) : "—"}
                  </td>
                  <td className="tabular px-5 py-2 text-right font-medium text-sky-300">
                    {fmt(s.stats?.mean)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {fmt(s.stats?.sem)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {fmt(s.stats?.std)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {fmt(s.stats?.median)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {fmt(s.stats?.min)}
                  </td>
                  <td className="tabular px-5 py-2 text-right text-slate-400">
                    {fmt(s.stats?.max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

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
          subtitle="Welch's unequal-variance t-test · Cohen's d effect size"
        >
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-2.5">Comparison</th>
                  <th className="px-5 py-2.5 text-right">Δ Mean</th>
                  <th className="px-5 py-2.5 text-right">t</th>
                  <th className="px-5 py-2.5 text-right">df</th>
                  <th className="px-5 py-2.5 text-right">p</th>
                  <th className="px-5 py-2.5 text-right">Cohen&apos;s d</th>
                  <th className="px-5 py-2.5">Result</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p, i) => {
                  const r = p.result;
                  return (
                    <tr
                      key={i}
                      className="border-t border-slate-800/60 hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-2 text-slate-200">
                        {p.a} <span className="text-slate-500">vs</span> {p.b}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-slate-300">
                        {r ? fmt(r.meanDiff) : "—"}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-slate-400">
                        {r ? fmt(r.t, 2) : "—"}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-slate-400">
                        {r ? fmt(r.df, 1) : "—"}
                      </td>
                      <td className="tabular px-5 py-2 text-right font-medium text-slate-200">
                        {r ? (r.p < 0.001 ? "< 0.001" : fmt(r.p, 3)) : "—"}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-slate-400">
                        {r ? fmt(r.cohensD, 2) : "—"}
                      </td>
                      <td className="px-5 py-2">
                        {r ? (
                          <Badge tone={r.significant ? "emerald" : "slate"}>
                            {r.significant ? "Significant" : "n.s."}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[11px] text-slate-500">
            Significance assessed at α = 0.05 (two-tailed). p-values are not
            corrected for multiple comparisons.
          </p>
        </Panel>
      )}
    </div>
  );
}
