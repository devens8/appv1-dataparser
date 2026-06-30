"use client";

import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "@/types";
import { pairedNumeric } from "@/lib/csv";
import { columnValues, numericColumns } from "@/lib/dataset";
import { evalPolynomial, polynomialFit, descriptiveStats } from "@/lib/stats";
import { fmt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

type ChartType = "line" | "scatter" | "bar" | "histogram" | "box";
type FitType = "none" | "linear" | "poly2" | "poly3";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "scatter", label: "Scatter" },
  { value: "bar", label: "Bar" },
  { value: "histogram", label: "Histogram" },
  { value: "box", label: "Box plot" },
];

export default function VisualizationTool({ dataset }: { dataset: Dataset }) {
  const numCols = numericColumns(dataset);
  const [type, setType] = useState<ChartType>("line");
  const [xName, setXName] = useState("__index__");
  const [yName, setYName] = useState(numCols[0]?.name ?? "");
  const [fit, setFit] = useState<FitType>("none");
  const [bins, setBins] = useState(16);
  const [xTitle, setXTitle] = useState("");
  const [yTitle, setYTitle] = useState("");
  const [showGrid, setShowGrid] = useState(true);

  const yCol = numCols.find((c) => c.name === yName) ?? numCols[0];
  const xCol = dataset.columns.find((c) => c.name === xName);

  const option = useMemo<EChartsOption | null>(() => {
    if (!yCol) return null;
    const axisLabel = { color: "#64748b" };
    const splitLine = { lineStyle: { color: showGrid ? "#eef2f7" : "transparent" } };
    const effXTitle = xTitle || xCol?.name || "Index";
    const effYTitle = yTitle || yCol.name;

    if (type === "histogram") {
      const values = columnValues(dataset, yCol.index);
      const stats = descriptiveStats(values);
      if (!stats) return null;
      const width = stats.range === 0 ? 1 : stats.range / bins;
      const counts = new Array(bins).fill(0);
      const labels: string[] = [];
      for (let i = 0; i < bins; i++) labels.push(fmt(stats.min + i * width, 1));
      for (const v of values) {
        let b = Math.floor((v - stats.min) / width);
        if (b >= bins) b = bins - 1;
        if (b < 0) b = 0;
        counts[b]++;
      }
      return {
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: labels,
          name: effYTitle,
          nameLocation: "middle",
          nameGap: 30,
          axisLabel,
          axisLine: { lineStyle: { color: "#cbd5e1" } },
        },
        yAxis: { type: "value", name: "Frequency", splitLine, axisLabel },
        series: [
          {
            type: "bar",
            data: counts,
            itemStyle: { color: CHART_PALETTE[0], borderRadius: [3, 3, 0, 0] },
            barCategoryGap: "8%",
          },
        ],
      } as EChartsOption;
    }

    if (type === "box") {
      const values = columnValues(dataset, yCol.index);
      const stats = descriptiveStats(values);
      if (!stats) return null;
      const low = Math.max(stats.min, stats.q1 - 1.5 * stats.iqr);
      const high = Math.min(stats.max, stats.q3 + 1.5 * stats.iqr);
      return {
        tooltip: { trigger: "item" },
        xAxis: { type: "category", data: [effYTitle], axisLabel },
        yAxis: { type: "value", scale: true, splitLine, axisLabel },
        series: [
          {
            type: "boxplot",
            data: [[low, stats.q1, stats.median, stats.q3, high]],
            itemStyle: { color: "#e0e7ff", borderColor: CHART_PALETTE[0] },
          },
        ],
      } as EChartsOption;
    }

    // line / scatter / bar use paired x/y
    const { x, y, labels } = !xCol
      ? pairedNumeric(dataset.rows, yCol.index, yCol.index, false)
      : pairedNumeric(
          dataset.rows,
          xCol.index,
          yCol.index,
          xCol.type === "number",
        );

    const useCategory = type === "bar" || (xCol && xCol.type !== "number");
    const main: SeriesOption[] = [
      {
        type: type === "scatter" ? "scatter" : type === "bar" ? "bar" : "line",
        name: effYTitle,
        data: useCategory ? y : x.map((xi, i) => [xi, y[i]]),
        showSymbol: type !== "line",
        symbolSize: 6,
        smooth: false,
        itemStyle: {
          color: CHART_PALETTE[0],
          borderRadius: type === "bar" ? [3, 3, 0, 0] : undefined,
        },
        lineStyle: { color: CHART_PALETTE[0], width: 2 },
      } as SeriesOption,
    ];

    if (fit !== "none" && type !== "bar" && !useCategory && x.length > 2) {
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
        main.push({
          type: "line",
          name: `${fit} fit`,
          data: fitData,
          showSymbol: false,
          lineStyle: { color: "#ef4444", width: 2, type: "dashed" },
          z: 5,
        } as SeriesOption);
      }
    }

    return {
      tooltip: { trigger: type === "scatter" ? "item" : "axis" },
      legend:
        fit !== "none"
          ? { top: 4, textStyle: { color: "#64748b", fontSize: 11 } }
          : undefined,
      xAxis: {
        type: useCategory ? "category" : "value",
        scale: true,
        data: useCategory ? labels : undefined,
        name: effXTitle,
        nameLocation: "middle",
        nameGap: 30,
        axisLabel,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: effYTitle,
        splitLine,
        axisLabel,
      },
      series: main,
    } as EChartsOption;
  }, [type, dataset, xCol, yCol, fit, bins, xTitle, yTitle, showGrid]);

  if (numCols.length === 0) return <NoNumeric />;

  const supportsXY = type === "line" || type === "scatter" || type === "bar";
  const supportsFit = type === "line" || type === "scatter";

  return (
    <div className="space-y-5">
      <Panel title="Chart builder" subtitle="Compose a publication-ready figure">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <Field label="Chart type">
            <Select value={type} onChange={(v) => setType(v as ChartType)}>
              {CHART_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          {supportsXY && (
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
          )}

          <Field label={supportsXY ? "Y axis" : "Variable"}>
            <Select value={yName} onChange={setYName}>
              {numCols.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {supportsFit && (
            <Field label="Curve fit">
              <Select value={fit} onChange={(v) => setFit(v as FitType)}>
                <option value="none">None</option>
                <option value="linear">Linear</option>
                <option value="poly2">Polynomial (2)</option>
                <option value="poly3">Polynomial (3)</option>
              </Select>
            </Field>
          )}

          {type === "histogram" && (
            <Field label={`Bins (${bins})`}>
              <input
                type="range"
                min={4}
                max={40}
                value={bins}
                onChange={(e) => setBins(Number(e.target.value))}
                className="w-28 accent-indigo-600"
              />
            </Field>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 px-5 py-4">
          <Field label="X axis title">
            <input
              value={xTitle}
              onChange={(e) => setXTitle(e.target.value)}
              placeholder="Auto"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
          <Field label="Y axis title">
            <input
              value={yTitle}
              onChange={(e) => setYTitle(e.target.value)}
              placeholder="Auto"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
          <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="accent-indigo-600"
            />
            Gridlines
          </label>
          <p className="pb-1 text-xs text-slate-400">
            Use the chart toolbar (top-right) to export a high-resolution PNG.
          </p>
        </div>
      </Panel>

      <Panel>
        <div className="p-4">{option && <Chart option={option} height={460} />}</div>
      </Panel>
    </div>
  );
}
