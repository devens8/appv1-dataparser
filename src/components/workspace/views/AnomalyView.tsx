"use client";

import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { numericColumns } from "@/lib/dataset";
import { cusumChangePoints, rollingZScore } from "@/lib/anomaly";
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Field, Panel, Select, StatGrid } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

const AX_LABEL = { color: "#94a3b8", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#334155" } };
const SPLIT = { lineStyle: { color: "#1e293b" } };

export default function AnomalyView({
  dataset,
  analysis,
}: {
  dataset: Dataset;
  analysis: Analysis;
}) {
  const { y, yCol } = analysis;

  const defaultWindow = Math.max(5, Math.min(30, Math.round(y.length / 8) || 5));
  const [window, setWindow] = useState(defaultWindow);
  const [zThreshold, setZThreshold] = useState(3);
  const [cusumThreshold, setCusumThreshold] = useState(5);

  const rolling = useMemo(
    () => rollingZScore(y, window, zThreshold),
    [y, window, zThreshold],
  );

  const cusum = useMemo(
    () => cusumChangePoints(y, cusumThreshold, 0.5),
    [y, cusumThreshold],
  );

  // Series with rolling-z anomalies highlighted.
  const seriesOption = useMemo<EChartsOption>(() => {
    const idx = y.map((_, i) => i);
    const anomalySet = new Set(rolling.anomalies.map((a) => a.index));
    const normal: [number, number][] = [];
    const flagged: [number, number][] = [];
    y.forEach((v, i) => {
      (anomalySet.has(i) ? flagged : normal).push([i, v]);
    });

    const series: SeriesOption[] = [
      {
        type: "line",
        name: yCol?.name,
        data: idx.map((i) => [i, y[i]]),
        showSymbol: false,
        lineStyle: { color: CHART_PALETTE[0], width: 1.5 },
        z: 2,
      },
      {
        type: "scatter",
        name: "Anomaly",
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
      },
    ];

    // Vertical change-point markers.
    if (cusum.changePoints.length) {
      series.push({
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: "#fbbf24", type: "dashed", width: 1.5 },
          label: { color: "#fbbf24", fontSize: 10, formatter: "shift" },
          data: cusum.changePoints.map((cp) => ({ xAxis: cp })),
        },
      } as SeriesOption);
    }

    return {
      tooltip: { trigger: "axis" },
      legend: {
        top: 2,
        data: [yCol?.name ?? "", "Anomaly"],
        textStyle: { color: "#94a3b8", fontSize: 11 },
        inactiveColor: "#475569",
      },
      grid: { left: 56, right: 24, top: 36, bottom: 44, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: "Index",
        nameLocation: "middle",
        nameGap: 28,
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
  }, [y, rolling, cusum, yCol]);

  // CUSUM magnitude with the decision threshold.
  const cusumOption = useMemo<EChartsOption>(() => {
    return {
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 20, top: 20, bottom: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: y.map((_, i) => i),
        axisLabel: { ...AX_LABEL, fontSize: 10 },
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        name: "CUSUM (σ)",
        nameTextStyle: { color: "#94a3b8" },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "line",
          data: cusum.cusum,
          areaStyle: { color: "rgba(129,140,248,0.12)" },
          showSymbol: false,
          lineStyle: { color: CHART_PALETTE[1], width: 1.5 },
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: "#f87171", type: "dashed" },
            label: { color: "#f87171", fontSize: 10 },
            data: [{ yAxis: cusumThreshold, name: "threshold" }],
          },
        },
      ] as SeriesOption[],
    } as EChartsOption;
  }, [y, cusum, cusumThreshold]);

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  const pct = y.length ? (rolling.anomalies.length / y.length) * 100 : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title="Rolling anomaly detection"
        subtitle={`Trailing-window z-score on ${yCol?.name ?? "the selected variable"}`}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <Field label={`Window · ${window}`}>
              <input
                type="range"
                min={3}
                max={Math.max(5, Math.min(60, y.length))}
                value={window}
                onChange={(e) => setWindow(Number(e.target.value))}
                className="w-28 accent-sky-500"
              />
            </Field>
            <Field label="Z threshold">
              <Select
                value={String(zThreshold)}
                onChange={(v) => setZThreshold(Number(v))}
              >
                <option value="2">2σ</option>
                <option value="2.5">2.5σ</option>
                <option value="3">3σ</option>
                <option value="3.5">3.5σ</option>
              </Select>
            </Field>
          </div>
        }
      >
        <div className="p-3">
          <Chart option={seriesOption} height={380} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Summary" className="lg:col-span-1">
          <StatGrid
            cols="grid-cols-2"
            items={[
              {
                label: "Anomalies",
                value: fmtInt(rolling.anomalies.length),
                accent: "text-rose-300",
                hint: `${fmt(pct, 1)}% of points`,
              },
              { label: "Window", value: fmtInt(rolling.window) },
              {
                label: "Z threshold",
                value: `${fmt(rolling.threshold, 1)}σ`,
              },
              {
                label: "Change points",
                value: fmtInt(cusum.changePoints.length),
                accent: "text-amber-300",
              },
            ]}
          />
        </Panel>

        <Panel
          title="Change-point detection"
          subtitle="Two-sided CUSUM — regime shifts in the mean"
          className="lg:col-span-2"
          actions={
            <Field label="CUSUM threshold">
              <Select
                value={String(cusumThreshold)}
                onChange={(v) => setCusumThreshold(Number(v))}
              >
                <option value="3">3σ</option>
                <option value="4">4σ</option>
                <option value="5">5σ</option>
                <option value="7">7σ</option>
                <option value="10">10σ</option>
              </Select>
            </Field>
          }
        >
          <div className="p-3">
            <Chart option={cusumOption} height={240} />
          </div>
        </Panel>
      </div>

      {rolling.anomalies.length > 0 && (
        <Panel
          title="Flagged anomalies"
          subtitle={`${rolling.anomalies.length} point${
            rolling.anomalies.length === 1 ? "" : "s"
          } exceeding ${fmt(rolling.threshold, 1)}σ from the trailing window`}
        >
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-2">Index</th>
                  <th className="px-5 py-2 text-right">Value</th>
                  <th className="px-5 py-2 text-right">Rolling z</th>
                  <th className="px-5 py-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {rolling.anomalies.map((a) => (
                  <tr
                    key={a.index}
                    className="border-t border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="tabular px-5 py-1.5 text-slate-500">
                      {a.index + 1}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right font-medium text-slate-200">
                      {fmt(a.value)}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right text-slate-400">
                      {fmt(a.score, 2)}
                    </td>
                    <td className="px-5 py-1.5">
                      <span
                        className={
                          a.score > 0 ? "text-rose-300" : "text-amber-300"
                        }
                      >
                        {a.score > 0 ? "▲ Spike" : "▼ Dip"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
