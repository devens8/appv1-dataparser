"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import type { Dataset } from "@/types";
import { descriptiveStats, pearson } from "@/lib/stats";
import { columnValues, numericColumns } from "@/lib/dataset";
import { fmt, fmtInt } from "@/lib/format";
import Chart from "@/components/Chart";
import { Panel, StatCard } from "@/components/ui";

export default function OverviewTool({ dataset }: { dataset: Dataset }) {
  const numCols = numericColumns(dataset);

  const perColumn = useMemo(
    () =>
      numCols.map((c) => ({
        column: c,
        stats: descriptiveStats(columnValues(dataset, c.index)),
      })),
    [dataset, numCols],
  );

  const heatmap = useMemo<EChartsOption | null>(() => {
    if (numCols.length < 2) return null;
    const series = numCols.map((c) => columnValues(dataset, c.index));
    const data: [number, number, number][] = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = 0; j < numCols.length; j++) {
        const n = Math.min(series[i].length, series[j].length);
        const r = pearson(series[i].slice(0, n), series[j].slice(0, n));
        data.push([j, i, isNaN(r) ? 0 : Number(r.toFixed(2))]);
      }
    }
    const names = numCols.map((c) => c.name);
    return {
      tooltip: { position: "top" },
      grid: { left: 10, right: 10, top: 10, bottom: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#64748b", rotate: 30, fontSize: 10 },
        splitArea: { show: true },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#64748b", fontSize: 10 },
        splitArea: { show: true },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: {
          color: ["#ef4444", "#f8fafc", "#4f46e5"],
        },
        textStyle: { color: "#64748b" },
      },
      series: [
        {
          type: "heatmap",
          data,
          label: { show: numCols.length <= 8, color: "#334155", fontSize: 10 },
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
        },
      ],
    } as EChartsOption;
  }, [dataset, numCols]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rows" value={fmtInt(dataset.rows.length)} />
        <StatCard label="Columns" value={fmtInt(dataset.columns.length)} />
        <StatCard
          label="Numeric"
          value={fmtInt(numCols.length)}
          accentClass="text-indigo-600"
        />
        <StatCard
          label="Categorical"
          value={fmtInt(dataset.columns.length - numCols.length)}
        />
      </div>

      <Panel title="Column summary" subtitle="Quick statistics per numeric column">
        {perColumn.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No numeric columns to summarise.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold text-slate-400">
                <tr>
                  <th className="px-5 py-2">Column</th>
                  <th className="px-5 py-2 text-right">N</th>
                  <th className="px-5 py-2 text-right">Mean</th>
                  <th className="px-5 py-2 text-right">Std</th>
                  <th className="px-5 py-2 text-right">Min</th>
                  <th className="px-5 py-2 text-right">Median</th>
                  <th className="px-5 py-2 text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {perColumn.map(({ column, stats }) => (
                  <tr key={column.index} className="border-t border-slate-100">
                    <td className="px-5 py-2 font-medium text-slate-700">
                      {column.name}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-500">
                      {stats ? fmtInt(stats.count) : "—"}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-700">
                      {fmt(stats?.mean)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-500">
                      {fmt(stats?.std)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-500">
                      {fmt(stats?.min)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-500">
                      {fmt(stats?.median)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-500">
                      {fmt(stats?.max)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {heatmap && (
        <Panel
          title="Correlation matrix"
          subtitle="Pearson correlation between numeric columns"
        >
          <div className="p-4">
            <Chart option={heatmap} height={Math.max(280, numCols.length * 42)} />
          </div>
        </Panel>
      )}
    </div>
  );
}
