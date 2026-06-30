"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import type { Dataset } from "@/types";
import { descriptiveStats } from "@/lib/stats";
import { columnValues, numericColumns } from "@/lib/dataset";
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, StatCard } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

export default function StatisticsTool({ dataset }: { dataset: Dataset }) {
  const numCols = numericColumns(dataset);
  const [col, setCol] = useState(numCols[0]?.name ?? "");
  const [bins, setBins] = useState(16);

  const column = numCols.find((c) => c.name === col) ?? numCols[0];
  const values = useMemo(
    () => (column ? columnValues(dataset, column.index) : []),
    [dataset, column],
  );
  const stats = useMemo(() => descriptiveStats(values), [values]);

  const histogram = useMemo<EChartsOption | null>(() => {
    if (!stats || values.length === 0) return null;
    const { min, max } = stats;
    const width = max - min === 0 ? 1 : (max - min) / bins;
    const counts = new Array(bins).fill(0);
    const labels: string[] = [];
    for (let i = 0; i < bins; i++)
      labels.push(`${fmt(min + i * width, 1)}`);
    for (const v of values) {
      let b = Math.floor((v - min) / width);
      if (b >= bins) b = bins - 1;
      if (b < 0) b = 0;
      counts[b]++;
    }
    return {
      grid: { left: 48, right: 20, top: 20, bottom: 44, containLabel: true },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: labels,
        name: column?.name,
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: { fontSize: 10, color: "#64748b" },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
      },
      yAxis: {
        type: "value",
        name: "Frequency",
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" },
      },
      series: [
        {
          type: "bar",
          data: counts,
          itemStyle: { color: CHART_PALETTE[0], borderRadius: [3, 3, 0, 0] },
          barCategoryGap: "8%",
        },
      ],
    } as EChartsOption;
  }, [stats, values, bins, column]);

  const boxplot = useMemo<EChartsOption | null>(() => {
    if (!stats) return null;
    const out = values.filter(
      (v) => v < stats.q1 - 1.5 * stats.iqr || v > stats.q3 + 1.5 * stats.iqr,
    );
    const lowWhisker = Math.max(stats.min, stats.q1 - 1.5 * stats.iqr);
    const highWhisker = Math.min(stats.max, stats.q3 + 1.5 * stats.iqr);
    return {
      grid: { left: 60, right: 24, top: 20, bottom: 30, containLabel: true },
      tooltip: { trigger: "item" },
      xAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" },
      },
      yAxis: {
        type: "category",
        data: [column?.name ?? ""],
        axisLabel: { color: "#64748b" },
      },
      series: [
        {
          type: "boxplot",
          data: [[lowWhisker, stats.q1, stats.median, stats.q3, highWhisker]],
          itemStyle: { color: "#e0e7ff", borderColor: CHART_PALETTE[0] },
        },
        {
          type: "scatter",
          data: out.map((v) => [v, 0]),
          symbolSize: 7,
          itemStyle: { color: "#ef4444" },
        },
      ],
    } as EChartsOption;
  }, [stats, values, column]);

  if (numCols.length === 0) return <NoNumeric />;

  return (
    <div className="space-y-5">
      <Panel
        title="Descriptive statistics"
        subtitle="Summary measures for a numeric variable"
        actions={
          <Field label="Variable">
            <Select value={col} onChange={setCol}>
              {numCols.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="N" value={stats ? fmtInt(stats.count) : "—"} />
          <StatCard
            label="Mean"
            value={fmt(stats?.mean)}
            accentClass="text-indigo-600"
          />
          <StatCard label="Median" value={fmt(stats?.median)} />
          <StatCard label="Std Dev" value={fmt(stats?.std)} />
          <StatCard label="Std Error" value={fmt(stats?.sem)} />
          <StatCard label="Variance" value={fmt(stats?.variance)} />
          <StatCard label="Min" value={fmt(stats?.min)} />
          <StatCard label="Max" value={fmt(stats?.max)} />
          <StatCard label="Range" value={fmt(stats?.range)} />
          <StatCard label="Q1 (25%)" value={fmt(stats?.q1)} />
          <StatCard label="Q3 (75%)" value={fmt(stats?.q3)} />
          <StatCard label="IQR" value={fmt(stats?.iqr)} />
          <StatCard label="Skewness" value={fmt(stats?.skewness)} />
          <StatCard label="Kurtosis" value={fmt(stats?.kurtosis)} hint="excess" />
          <StatCard label="CV" value={stats ? `${fmt(stats.cv, 1)}%` : "—"} />
          <StatCard label="Sum" value={fmt(stats?.sum)} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title="Distribution"
          actions={
            <Field label="Bins">
              <input
                type="range"
                min={4}
                max={40}
                value={bins}
                onChange={(e) => setBins(Number(e.target.value))}
                className="w-28 accent-indigo-600"
              />
            </Field>
          }
        >
          <div className="p-3">
            {histogram && <Chart option={histogram} height={300} />}
          </div>
        </Panel>

        <Panel title="Box plot" subtitle="Quartiles, whiskers and outliers">
          <div className="p-3">
            {boxplot && <Chart option={boxplot} height={300} />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
