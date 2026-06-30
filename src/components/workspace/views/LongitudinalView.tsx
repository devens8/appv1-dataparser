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
import { descriptiveStats, linearRegression } from "@/lib/stats";
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, StatGrid } from "@/components/ui";

const AX_LABEL = { color: "#94a3b8", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#334155" } };
const SPLIT = { lineStyle: { color: "#1e293b" } };

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function LongitudinalView({
  workspace,
}: {
  workspace: Workspace;
}) {
  const sharedColumns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of workspace.datasets) {
      for (const c of numericColumns(d)) {
        counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [workspace.datasets]);

  const [colName, setColName] = useState<string>(sharedColumns[0] ?? "");
  const active = sharedColumns.includes(colName)
    ? colName
    : (sharedColumns[0] ?? "");

  // One point per dataset, ordered chronologically by creation time.
  const points = useMemo(() => {
    return [...workspace.datasets]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((d) => {
        const col = columnByName(d, active);
        if (!col || col.type !== "number") return null;
        const values = columnValues(d, col.index);
        if (values.length === 0) return null;
        const stats = descriptiveStats(values);
        return {
          id: d.id,
          name: d.name,
          createdAt: d.createdAt,
          mean: stats?.mean ?? 0,
          sem: stats?.sem ?? 0,
          count: stats?.count ?? 0,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [workspace.datasets, active]);

  // Linear trend of the mean over the ordered sequence.
  const trend = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((_, i) => i);
    const ys = points.map((p) => p.mean);
    return linearRegression(xs, ys);
  }, [points]);

  const chartOption = useMemo<EChartsOption>(() => {
    const cats = points.map((p) => p.name);
    const errData = points.map((p, i) => [i, p.mean + p.sem, p.mean - p.sem]);

    const renderError = (
      _params: CustomSeriesRenderItemParams,
      api: CustomSeriesRenderItemAPI,
    ) => {
      const xIndex = api.value(0) as number;
      const high = api.coord([xIndex, api.value(1) as number]);
      const low = api.coord([xIndex, api.value(2) as number]);
      const style = { stroke: "#cbd5e1", lineWidth: 1.5 };
      const half = 6;
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

    const series: SeriesOption[] = [
      {
        type: "line",
        name: active,
        data: points.map((p) => p.mean),
        symbolSize: 9,
        itemStyle: { color: CHART_PALETTE[0] },
        lineStyle: { color: CHART_PALETTE[0], width: 2 },
        z: 3,
      },
      {
        type: "custom",
        renderItem: renderError,
        encode: { x: 0, y: [1, 2] },
        data: errData,
        z: 5,
        silent: true,
      },
    ];

    if (trend) {
      series.push({
        type: "line",
        name: "Trend",
        data: points.map((_, i) => trend.predict(i)),
        showSymbol: false,
        lineStyle: { color: "#fbbf24", width: 2, type: "dashed" },
        z: 2,
      });
    }

    return {
      tooltip: { trigger: "axis" },
      legend: {
        top: 2,
        textStyle: { color: "#94a3b8", fontSize: 11 },
        inactiveColor: "#475569",
      },
      grid: { left: 56, right: 24, top: 36, bottom: 60, containLabel: true },
      xAxis: {
        type: "category",
        data: cats,
        axisLabel: { ...AX_LABEL, rotate: cats.length > 4 ? 20 : 0 },
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: `${active} (mean)`,
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series,
    } as EChartsOption;
  }, [points, trend, active]);

  if (workspace.datasets.length < 2) {
    return (
      <div className="grid-bg flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-20 text-center">
        <h3 className="text-sm font-semibold text-slate-200">
          Longitudinal tracking needs a history
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Import datasets over time. Each dataset becomes one time point, and
          this view tracks how a variable&apos;s mean shifts across them.
        </p>
      </div>
    );
  }

  const first = points[0]?.mean ?? 0;
  const last = points[points.length - 1]?.mean ?? 0;
  const totalChange = last - first;
  const pctChange = first !== 0 ? (totalChange / Math.abs(first)) * 100 : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title="Longitudinal tracking"
        subtitle={`Mean of “${active}” across ${points.length} datasets over time`}
        actions={
          <Field label="Variable">
            <Select value={active} onChange={setColName}>
              {sharedColumns.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <div className="p-3">
          <Chart option={chartOption} height={380} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Change over time" subtitle="First vs latest time point">
          <StatGrid
            cols="grid-cols-2 sm:grid-cols-4"
            items={[
              { label: "Start", value: fmt(first) },
              { label: "Latest", value: fmt(last), accent: "text-sky-300" },
              {
                label: "Total Δ",
                value: fmt(totalChange),
                accent:
                  totalChange > 0
                    ? "text-emerald-300"
                    : totalChange < 0
                      ? "text-rose-300"
                      : "text-slate-100",
              },
              { label: "% change", value: `${fmt(pctChange, 1)}%` },
              {
                label: "Trend slope",
                value: fmt(trend?.slope),
                hint: "per dataset",
              },
              {
                label: "R²",
                value: fmt(trend?.r2),
                hint: "linear fit",
              },
              { label: "Time points", value: fmtInt(points.length) },
            ]}
          />
        </Panel>

        <Panel title="Time points" subtitle="Per-dataset summary in order">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-2">#</th>
                  <th className="px-5 py-2">Dataset</th>
                  <th className="px-5 py-2">Added</th>
                  <th className="px-5 py-2 text-right">N</th>
                  <th className="px-5 py-2 text-right">Mean</th>
                  <th className="px-5 py-2 text-right">± SEM</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="tabular px-5 py-1.5 text-slate-500">
                      {i + 1}
                    </td>
                    <td className="px-5 py-1.5 font-medium text-slate-200">
                      {p.name}
                    </td>
                    <td className="px-5 py-1.5 text-slate-400">
                      {shortDate(p.createdAt)}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right text-slate-400">
                      {fmtInt(p.count)}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right font-medium text-sky-300">
                      {fmt(p.mean)}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right text-slate-400">
                      {fmt(p.sem)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
