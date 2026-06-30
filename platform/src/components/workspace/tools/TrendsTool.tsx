"use client";

import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "@/types";
import { pairedNumeric } from "@/lib/csv";
import { analyzeTrend } from "@/lib/trends";
import { numericColumns } from "@/lib/dataset";
import { fmt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, StatCard } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

const DIRECTION_LABEL: Record<string, { text: string; tone: string }> = {
  increasing: { text: "▲ Increasing", tone: "text-emerald-600" },
  decreasing: { text: "▼ Decreasing", tone: "text-rose-500" },
  stable: { text: "→ Stable", tone: "text-slate-500" },
  insufficient: { text: "Insufficient data", tone: "text-slate-400" },
};

export default function TrendsTool({ dataset }: { dataset: Dataset }) {
  const numCols = numericColumns(dataset);
  const [yName, setYName] = useState(numCols[0]?.name ?? "");
  const [xName, setXName] = useState("__index__");
  const [showMA, setShowMA] = useState(true);

  const yCol = numCols.find((c) => c.name === yName) ?? numCols[0];
  const xCol = dataset.columns.find((c) => c.name === xName);

  const { x, y, labels } = useMemo(() => {
    if (!yCol) return { x: [], y: [], labels: [] as string[] };
    if (!xCol) {
      // Index-based x.
      return pairedNumeric(dataset.rows, yCol.index, yCol.index, false);
    }
    return pairedNumeric(
      dataset.rows,
      xCol.index,
      yCol.index,
      xCol.type === "number",
    );
  }, [dataset, xCol, yCol]);

  const trend = useMemo(() => analyzeTrend(x, y), [x, y]);

  const chart = useMemo<EChartsOption>(() => {
    const points = x.map((xi, i) => [xi, y[i]]);
    const series: SeriesOption[] = [
      {
        type: "scatter",
        name: yCol?.name,
        data: points,
        symbolSize: 6,
        itemStyle: { color: CHART_PALETTE[1], opacity: 0.7 },
      } as SeriesOption,
    ];

    if (trend.fit && x.length > 1) {
      const xs = [...x].sort((a, b) => a - b);
      const lineData = [
        [xs[0], trend.fit.predict(xs[0])],
        [xs[xs.length - 1], trend.fit.predict(xs[xs.length - 1])],
      ];
      series.push({
        type: "line",
        name: "Linear fit",
        data: lineData,
        showSymbol: false,
        lineStyle: { color: "#ef4444", width: 2 },
        z: 5,
      } as SeriesOption);
    }

    if (showMA && trend.movingAverage.length === y.length) {
      series.push({
        type: "line",
        name: `Moving avg (${trend.movingAverageWindow})`,
        data: x.map((xi, i) => [xi, trend.movingAverage[i]]),
        showSymbol: false,
        smooth: true,
        lineStyle: { color: CHART_PALETTE[3], width: 1.5, type: "dashed" },
      } as SeriesOption);
    }

    return {
      tooltip: { trigger: "axis" },
      legend: { top: 4, textStyle: { color: "#64748b", fontSize: 11 } },
      grid: { left: 56, right: 24, top: 36, bottom: 44, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: xCol?.name ?? "Index",
        nameLocation: "middle",
        nameGap: 28,
        splitLine: { show: false },
        axisLabel: { color: "#64748b" },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: yCol?.name,
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" },
      },
      series,
    } as EChartsOption;
  }, [x, y, trend, showMA, xCol, yCol, labels]);

  if (numCols.length === 0) return <NoNumeric />;

  const dir = DIRECTION_LABEL[trend.direction];

  return (
    <div className="space-y-5">
      <Panel
        title="Trend analysis"
        subtitle="Linear regression, moving average and monotonic trend"
        actions={
          <div className="flex items-end gap-3">
            <Field label="X axis">
              <Select value={xName} onChange={setXName}>
                <option value="__index__">Row index</option>
                {dataset.columns.map((c) => (
                  <option key={c.index} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Y axis">
              <Select value={yName} onChange={setYName}>
                {numCols.map((c) => (
                  <option key={c.index} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Direction" value={<span className={dir.tone}>{dir.text}</span>} />
          <StatCard
            label="Slope"
            value={fmt(trend.fit?.slope)}
            hint="per unit x"
          />
          <StatCard
            label="R²"
            value={fmt(trend.fit?.r2)}
            accentClass="text-indigo-600"
            hint={trend.strength}
          />
          <StatCard
            label="% / step"
            value={fmt(trend.percentChangePerStep, 2)}
          />
          <StatCard label="Total Δ" value={fmt(trend.totalChange)} />
          <StatCard
            label="Mann–Kendall τ"
            value={fmt(trend.mannKendallTau, 2)}
          />
        </div>
      </Panel>

      <Panel
        title="Regression plot"
        actions={
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={showMA}
              onChange={(e) => setShowMA(e.target.checked)}
              className="accent-indigo-600"
            />
            Moving average
          </label>
        }
      >
        <div className="p-3">
          <Chart option={chart} height={400} />
        </div>
      </Panel>
    </div>
  );
}
