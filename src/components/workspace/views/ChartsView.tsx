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

const AX_LABEL = { color: "#a1a1aa", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#3f3f46" } };
const SPLIT = { lineStyle: { color: "#27272a" } };

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
  const [logX, setLogX] = useState(false);
  const [logY, setLogY] = useState(false);

  const { x, y, xCol, yCol, trend, outlierSet } = analysis;

  // Log axes are only meaningful when every value on that axis is positive.
  const canLogX = x.length > 0 && x.every((v) => v > 0);
  const canLogY = y.length > 0 && y.every((v) => v > 0);
  const useLogX = logX && canLogX;
  const useLogY = logY && canLogY;

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
          borderColor: "#0a0a0a",
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

    const regFit = trend.fit;
    const annotation =
      regFit && fit === "linear"
        ? `y = ${fmt(regFit.slope, 3)}x ${
            regFit.intercept >= 0 ? "+" : "−"
          } ${fmt(Math.abs(regFit.intercept), 3)}   ·   R² = ${fmt(regFit.r2, 3)}`
        : null;

    return {
      tooltip: { trigger: mainType === "line" ? "axis" : "item" },
      legend: {
        top: 4,
        textStyle: { color: "#a1a1aa", fontSize: 11 },
        inactiveColor: "#52525b",
      },
      grid: { left: 56, right: 24, top: 40, bottom: 48, containLabel: true },
      ...(annotation
        ? {
            graphic: [
              {
                type: "text",
                right: 28,
                top: 30,
                style: {
                  text: annotation,
                  fill: "#fbbf24",
                  font: '11px ui-monospace, "SF Mono", Menlo, monospace',
                },
              },
            ],
          }
        : {}),
      xAxis: {
        type: useLogX ? "log" : "value",
        scale: true,
        name: `${xCol?.name ?? "Index"}${useLogX ? " (log)" : ""}`,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { color: "#d4d4d8", fontSize: 12 },
        splitLine: { show: false },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
      },
      yAxis: {
        type: useLogY ? "log" : "value",
        scale: true,
        name: `${yCol?.name ?? ""}${useLogY ? " (log)" : ""}`,
        nameTextStyle: { color: "#d4d4d8", fontSize: 12 },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series,
    } as EChartsOption;
  }, [x, y, mainType, fit, showMA, trend, xCol, yCol, outlierSet, useLogX, useLogY]);

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
        nameTextStyle: { color: "#a1a1aa" },
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
            color: "rgba(249,115,22,0.18)",
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
        axisLabel: { color: "#a1a1aa", rotate: 30, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#a1a1aa", fontSize: 10 },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: { color: ["#f87171", "#0a0a0a", "#f97316"] },
        textStyle: { color: "#a1a1aa" },
      },
      series: [
        {
          type: "heatmap",
          data,
          label: {
            show: numCols.length <= 8,
            color: "#e4e4e7",
            fontSize: 10,
          },
          itemStyle: { borderColor: "#0a0a0a", borderWidth: 1 },
        },
      ],
    } as EChartsOption;
  }, [dataset]);

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  return (
    <div className="animate-fade-in grid h-full min-h-0 grid-rows-[1.35fr_1fr] gap-3">
      {/* Row 1 — main relationship plot + distribution */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel
          fill
          className="lg:col-span-2"
          title={`${yCol?.name ?? "Y"} vs ${xCol?.name ?? "Index"}`}
          subtitle="Regression, curve fit and flagged outliers"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Segmented
                value={mainType}
                onChange={setMainType}
                options={[
                  { value: "scatter", label: "Scatter" },
                  { value: "line", label: "Line" },
                ]}
              />
              <Select value={fit} onChange={(v) => setFit(v as FitType)}>
                <option value="none">No fit</option>
                <option value="linear">Linear</option>
                <option value="poly2">Poly (2)</option>
                <option value="poly3">Poly (3)</option>
              </Select>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <input
                  type="checkbox"
                  checked={showMA}
                  onChange={(e) => setShowMA(e.target.checked)}
                  className="accent-orange-500"
                />
                MA
              </label>
              <label
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  canLogX ? "text-zinc-400" : "cursor-not-allowed text-zinc-600"
                }`}
                title={canLogX ? "" : "Log X needs all X values > 0"}
              >
                <input
                  type="checkbox"
                  checked={useLogX}
                  disabled={!canLogX}
                  onChange={(e) => setLogX(e.target.checked)}
                  className="accent-orange-500"
                />
                logX
              </label>
              <label
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  canLogY ? "text-zinc-400" : "cursor-not-allowed text-zinc-600"
                }`}
                title={canLogY ? "" : "Log Y needs all Y values > 0"}
              >
                <input
                  type="checkbox"
                  checked={useLogY}
                  disabled={!canLogY}
                  onChange={(e) => setLogY(e.target.checked)}
                  className="accent-orange-500"
                />
                logY
              </label>
            </div>
          }
        >
          <div className="h-full p-2">
            <Chart option={relation} height="100%" />
          </div>
        </Panel>

        <Panel
          fill
          title="Distribution"
          subtitle="Histogram of Y"
          actions={
            <Field label={`Bins · ${bins}`}>
              <input
                type="range"
                min={4}
                max={40}
                value={bins}
                onChange={(e) => setBins(Number(e.target.value))}
                className="w-24 accent-orange-500"
              />
            </Field>
          }
        >
          <div className="h-full p-2">
            {histogram && <Chart option={histogram} height="100%" />}
          </div>
        </Panel>
      </div>

      {/* Row 2 — box plot + correlation matrix */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel
          fill
          className={heatmap ? "" : "lg:col-span-3"}
          title="Box plot"
          subtitle="Quartiles, whiskers & outliers"
        >
          <div className="h-full p-2">
            {boxplot && <Chart option={boxplot} height="100%" />}
          </div>
        </Panel>

        {heatmap && (
          <Panel
            fill
            className="lg:col-span-2"
            title="Correlation matrix"
            subtitle="Pearson r across numeric columns"
          >
            <div className="h-full p-2">
              <Chart option={heatmap} height="100%" />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
