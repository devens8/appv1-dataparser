"use client";

import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { columnValues, numericColumns } from "@/lib/dataset";
import { evalPolynomial, pearson, polynomialFit } from "@/lib/stats";
import { fmt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Segmented, Select } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

const AX_LABEL = { color: "#94a3b8", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#334155" } };
const SPLIT = { lineStyle: { color: "#1e293b" } };

type MainType = "scatter" | "line";
type FitType = "none" | "linear" | "poly2" | "poly3";

export default function ChartsView({
  dataset,
  analysis,
}: {
  dataset: Dataset;
  analysis: Analysis;
}) {
  const [mainType, setMainType] = useState<MainType>("scatter");
  const [fit, setFit] = useState<FitType>("linear");
  const [showMA, setShowMA] = useState(true);
  const [bins, setBins] = useState(16);

  const { x, y, xCol, yCol, trend, outlierSet } = analysis;

  // 1 — Relationship plot (Y vs X) with regression / fit / MA / outliers.
  const relation = useMemo<EChartsOption>(() => {
    const inRange: [number, number][] = [];
    const flagged: [number, number][] = [];
    x.forEach((xi, i) => {
      (outlierSet.has(i) ? flagged : inRange).push([xi, y[i]]);
    });

    const series: SeriesOption[] = [
      {
        type: mainType,
        name: yCol?.name,
        data: inRange,
        showSymbol: true,
        symbolSize: mainType === "line" ? 4 : 7,
        itemStyle: { color: CHART_PALETTE[0], opacity: 0.85 },
        lineStyle: { color: CHART_PALETTE[0], width: 2 },
        z: 2,
      } as SeriesOption,
    ];

    if (flagged.length) {
      series.push({
        type: "scatter",
        name: "Outlier",
        data: flagged,
        symbolSize: 11,
        itemStyle: {
          color: "#f87171",
          borderColor: "#0c1322",
          borderWidth: 1.5,
          shadowColor: "rgba(248,113,113,0.6)",
          shadowBlur: 10,
        },
        z: 6,
      } as SeriesOption);
    }

    // Curve fit (linear or polynomial) drawn smoothly over the x-range.
    if (fit !== "none" && x.length > 2) {
      const order = fit === "linear" ? 1 : fit === "poly2" ? 2 : 3;
      const coeffs = polynomialFit(x, y, order);
      if (coeffs) {
        const xs = [...x].sort((a, b) => a - b);
        const steps = 80;
        const fitData: [number, number][] = [];
        for (let i = 0; i < steps; i++) {
          const xi = xs[0] + ((xs[xs.length - 1] - xs[0]) * i) / (steps - 1);
          fitData.push([xi, evalPolynomial(coeffs, xi)]);
        }
        series.push({
          type: "line",
          name: fit === "linear" ? "Linear fit" : `${fit} fit`,
          data: fitData,
          showSymbol: false,
          lineStyle: { color: "#fbbf24", width: 2 },
          z: 5,
        } as SeriesOption);
      }
    }

    if (showMA && trend.movingAverage.length === y.length && y.length > 1) {
      series.push({
        type: "line",
        name: `Moving avg (${trend.movingAverageWindow})`,
        data: x.map((xi, i) => [xi, trend.movingAverage[i]]),
        showSymbol: false,
        smooth: true,
        lineStyle: { color: CHART_PALETTE[2], width: 1.5, type: "dashed" },
        z: 4,
      } as SeriesOption);
    }

    return {
      tooltip: { trigger: mainType === "line" ? "axis" : "item" },
      legend: {
        top: 4,
        textStyle: { color: "#94a3b8", fontSize: 11 },
        inactiveColor: "#475569",
      },
      grid: { left: 56, right: 24, top: 40, bottom: 48, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: xCol?.name ?? "Index",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        splitLine: { show: false },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: yCol?.name,
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series,
    } as EChartsOption;
  }, [x, y, mainType, fit, showMA, trend, xCol, yCol, outlierSet]);

  // 2 — Distribution histogram of Y.
  const histogram = useMemo<EChartsOption | null>(() => {
    const stats = analysis.stats;
    if (!stats || y.length === 0) return null;
    const width = stats.range === 0 ? 1 : stats.range / bins;
    const counts = new Array(bins).fill(0);
    const labels: string[] = [];
    for (let i = 0; i < bins; i++) labels.push(fmt(stats.min + i * width, 1));
    for (const v of y) {
      let b = Math.floor((v - stats.min) / width);
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
        axisLabel: { ...AX_LABEL, fontSize: 10 },
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        name: "Frequency",
        nameTextStyle: { color: "#94a3b8" },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "bar",
          data: counts,
          itemStyle: { color: CHART_PALETTE[1], borderRadius: [3, 3, 0, 0] },
          barCategoryGap: "8%",
        },
      ],
    } as EChartsOption;
  }, [analysis.stats, y, bins]);

  // 3 — Box plot of Y with outlier dots.
  const boxplot = useMemo<EChartsOption | null>(() => {
    const stats = analysis.stats;
    if (!stats) return null;
    const out = y.filter(
      (v) => v < stats.q1 - 1.5 * stats.iqr || v > stats.q3 + 1.5 * stats.iqr,
    );
    const low = Math.max(stats.min, stats.q1 - 1.5 * stats.iqr);
    const high = Math.min(stats.max, stats.q3 + 1.5 * stats.iqr);
    return {
      grid: { left: 60, right: 24, top: 20, bottom: 30, containLabel: true },
      tooltip: { trigger: "item" },
      xAxis: { type: "value", scale: true, splitLine: SPLIT, axisLabel: AX_LABEL },
      yAxis: {
        type: "category",
        data: [yCol?.name ?? ""],
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "boxplot",
          data: [[low, stats.q1, stats.median, stats.q3, high]],
          itemStyle: {
            color: "rgba(56,189,248,0.18)",
            borderColor: CHART_PALETTE[0],
          },
        },
        {
          type: "scatter",
          data: out.map((v) => [v, 0]),
          symbolSize: 7,
          itemStyle: { color: "#f87171" },
        },
      ],
    } as EChartsOption;
  }, [analysis.stats, y, yCol]);

  // 4 — Correlation matrix across all numeric columns.
  const heatmap = useMemo<EChartsOption | null>(() => {
    const numCols = numericColumns(dataset);
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
      grid: { left: 10, right: 10, top: 10, bottom: 30, containLabel: true },
      xAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#94a3b8", rotate: 30, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: { color: ["#f87171", "#0c1322", "#38bdf8"] },
        textStyle: { color: "#94a3b8" },
      },
      series: [
        {
          type: "heatmap",
          data,
          label: {
            show: numCols.length <= 8,
            color: "#e2e8f0",
            fontSize: 10,
          },
          itemStyle: { borderColor: "#0c1322", borderWidth: 1 },
        },
      ],
    } as EChartsOption;
  }, [dataset]);

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title={`${yCol?.name ?? "Y"} vs ${xCol?.name ?? "Index"}`}
        subtitle="Regression, curve fit and flagged outliers"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <Segmented
              value={mainType}
              onChange={setMainType}
              options={[
                { value: "scatter", label: "Scatter" },
                { value: "line", label: "Line" },
              ]}
            />
            <Field label="Curve fit">
              <Select value={fit} onChange={(v) => setFit(v as FitType)}>
                <option value="none">None</option>
                <option value="linear">Linear</option>
                <option value="poly2">Polynomial (2)</option>
                <option value="poly3">Polynomial (3)</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-400">
              <input
                type="checkbox"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="accent-sky-500"
              />
              Moving avg
            </label>
          </div>
        }
      >
        <div className="p-3">
          <Chart option={relation} height={420} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Distribution"
          subtitle="Histogram of the selected variable"
          actions={
            <Field label={`Bins · ${bins}`}>
              <input
                type="range"
                min={4}
                max={40}
                value={bins}
                onChange={(e) => setBins(Number(e.target.value))}
                className="w-28 accent-sky-500"
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

      {heatmap && (
        <Panel
          title="Correlation matrix"
          subtitle="Pearson correlation across numeric columns"
        >
          <div className="p-4">
            <Chart
              option={heatmap}
              height={Math.max(300, numericColumns(dataset).length * 44)}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
