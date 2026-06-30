"use client";

import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { numericColumns } from "@/lib/dataset";
import {
  CURVE_MODELS,
  fitModel,
  modelById,
  type CurveFitResult,
} from "@/lib/curvefit";
import { fmt, fmtInt } from "@/lib/format";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { Panel, Select, Badge } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

const AX_LABEL = { color: "#a1a1aa", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#3f3f46" } };
const SPLIT = { lineStyle: { color: "#27272a" } };

export default function CurveFitView({
  dataset,
  analysis,
}: {
  dataset: Dataset;
  analysis: Analysis;
}) {
  const { x, y, xCol, yCol } = analysis;
  const [modelId, setModelId] = useState("dr4pl");
  const [showBand, setShowBand] = useState(true);

  const model = modelById(modelId) ?? CURVE_MODELS[0];

  const fit = useMemo<CurveFitResult | null>(() => {
    if (x.length < model.params.length + 1) return null;
    return fitModel(model, x, y);
  }, [model, x, y]);

  // Rank every model on this data by adjusted R² — Prism-style model comparison.
  const ranking = useMemo(() => {
    return CURVE_MODELS.map((m) => {
      if (x.length < m.params.length + 1) return { model: m, fit: null };
      return { model: m, fit: fitModel(m, x, y) };
    })
      .filter((r) => r.fit)
      .sort((a, b) => (b.fit!.adjR2 ?? -Infinity) - (a.fit!.adjR2 ?? -Infinity));
  }, [x, y]);

  const fitChart = useMemo<EChartsOption | null>(() => {
    if (!fit || x.length === 0) return null;
    const xs = [...x].sort((a, b) => a - b);
    const lo = xs[0];
    const hi = xs[xs.length - 1];
    const steps = 160;
    const curve: [number, number][] = [];
    const bandHi: [number, number][] = [];
    const bandLo: [number, number][] = [];
    for (let i = 0; i < steps; i++) {
      const xi = lo + ((hi - lo) * i) / (steps - 1);
      const yi = fit.predict(xi);
      curve.push([xi, yi]);
      bandHi.push([xi, yi + 1.96 * fit.rmse]);
      bandLo.push([xi, yi - 1.96 * fit.rmse]);
    }

    const series: SeriesOption[] = [];

    if (showBand && fit.rmse > 0) {
      // Draw a shaded 95% prediction band (lower line transparent, upper fills down).
      series.push({
        type: "line",
        data: bandLo,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        stack: "band",
        silent: true,
        z: 1,
      } as SeriesOption);
      series.push({
        type: "line",
        name: "95% prediction band",
        data: bandHi.map(([xi, hiV], i) => [xi, hiV - bandLo[i][1]]),
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(249,115,22,0.10)" },
        stack: "band",
        silent: true,
        z: 1,
      } as SeriesOption);
    }

    series.push({
      type: "scatter",
      name: yCol?.name ?? "Y",
      data: x.map((xi, i) => [xi, y[i]]),
      symbolSize: 7,
      itemStyle: { color: CHART_PALETTE[0], opacity: 0.85 },
      z: 3,
    } as SeriesOption);

    series.push({
      type: "line",
      name: `${model.name} fit`,
      data: curve,
      showSymbol: false,
      smooth: true,
      lineStyle: { color: "#fbbf24", width: 2.5 },
      z: 4,
    } as SeriesOption);

    return {
      tooltip: { trigger: "axis" },
      legend: {
        top: 4,
        textStyle: { color: "#a1a1aa", fontSize: 11 },
        inactiveColor: "#52525b",
      },
      grid: { left: 56, right: 24, top: 40, bottom: 48, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: model.xIsLog ? `log10(${xCol?.name ?? "dose"})` : (xCol?.name ?? "X"),
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { color: "#d4d4d8", fontSize: 12 },
        splitLine: { show: false },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: yCol?.name,
        nameTextStyle: { color: "#d4d4d8", fontSize: 12 },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series,
    } as EChartsOption;
  }, [fit, x, y, model, xCol, yCol, showBand]);

  // Residuals plot — a key diagnostic researchers expect.
  const residualChart = useMemo<EChartsOption | null>(() => {
    if (!fit) return null;
    const resid = x.map((xi, i) => [xi, y[i] - fit.predict(xi)] as [number, number]);
    return {
      tooltip: { trigger: "item" },
      grid: { left: 52, right: 20, top: 16, bottom: 40, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: model.xIsLog ? "log10(X)" : (xCol?.name ?? "X"),
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: "#d4d4d8", fontSize: 11 },
        splitLine: { show: false },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "Residual",
        nameTextStyle: { color: "#a1a1aa" },
        splitLine: SPLIT,
        axisLabel: AX_LABEL,
      },
      series: [
        {
          type: "scatter",
          data: resid,
          symbolSize: 6,
          itemStyle: { color: CHART_PALETTE[4], opacity: 0.8 },
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: "#52525b", type: "dashed" },
            data: [{ yAxis: 0 }],
          },
        },
      ] as SeriesOption[],
    } as EChartsOption;
  }, [fit, x, y, model, xCol]);

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  const modelPicker = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={modelId} onChange={setModelId} className="min-w-[200px]">
        {CURVE_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        <input
          type="checkbox"
          checked={showBand}
          onChange={(e) => setShowBand(e.target.checked)}
          className="accent-orange-500"
        />
        95% band
      </label>
    </div>
  );

  const fitSubtitle =
    model.equation + (model.xIsLog ? "   ·   X = log10(dose)" : "");

  return (
    <div className="animate-fade-in grid h-full min-h-0 grid-cols-12 gap-3">
      {/* LEFT — main fit chart + residuals / goodness of fit */}
      <div
        className={`col-span-12 grid min-h-0 gap-3 ${
          fit ? "grid-rows-[1.6fr_1fr] lg:col-span-8" : "grid-rows-1"
        }`}
      >
        <Panel fill title="Nonlinear curve fit" subtitle={fitSubtitle} actions={modelPicker}>
          <div className="h-full p-2">
            {fitChart ? (
              <Chart option={fitChart} height="100%" />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
                Not enough points to fit this model (need ≥{" "}
                {model.params.length + 1}).
              </div>
            )}
          </div>
        </Panel>

        {fit && (
          <div className="grid min-h-0 grid-cols-12 gap-3">
            <Panel
              fill
              className="col-span-12 lg:col-span-7"
              title="Residuals"
              subtitle="Observed − fitted (a good fit scatters around 0)"
            >
              <div className="h-full p-2">
                {residualChart && <Chart option={residualChart} height="100%" />}
              </div>
            </Panel>

            <Panel
              fill
              className="col-span-12 lg:col-span-5"
              title="Goodness of fit"
              actions={
                <Badge tone={fit.converged ? "emerald" : "amber"}>
                  {fit.converged ? "Converged" : "Max iters"}
                </Badge>
              }
            >
              <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800/60 border-t border-zinc-800/60">
                {[
                  { label: "R²", value: fmt(fit.r2, 4), accent: "text-orange-300" },
                  { label: "Adjusted R²", value: fmt(fit.adjR2, 4) },
                  { label: "RMSE (σ)", value: fmt(fit.rmse) },
                  { label: "SSE", value: fmt(fit.sse) },
                  { label: "N", value: fmtInt(fit.n) },
                  { label: "DOF", value: fmtInt(fit.dof) },
                ].map((it) => (
                  <div key={it.label} className="px-3.5 py-1.5">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                      {it.label}
                    </div>
                    <div
                      className={`tabular mt-0.5 text-sm font-semibold ${
                        it.accent ?? "text-zinc-100"
                      }`}
                    >
                      {it.value}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* RIGHT — parameters, derived quantities, model comparison */}
      {fit && (
        <div className="col-span-12 grid min-h-0 grid-rows-[auto_auto_1fr] gap-3 lg:col-span-4">
          <Panel title="Fitted parameters" subtitle="Estimate ± SE (95% CI)">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="px-3.5 py-1.5">Param</th>
                    <th className="px-3.5 py-1.5 text-right">Estimate</th>
                    <th className="px-3.5 py-1.5 text-right">± SE</th>
                  </tr>
                </thead>
                <tbody>
                  {fit.params.map((p) => (
                    <tr key={p.name} className="border-t border-zinc-800/60">
                      <td className="px-3.5 py-1 font-medium text-zinc-200">
                        {p.name}
                      </td>
                      <td className="tabular px-3.5 py-1 text-right font-medium text-orange-300">
                        {fmt(p.value)}
                      </td>
                      <td className="tabular px-3.5 py-1 text-right text-zinc-400">
                        {isNaN(p.se) ? "—" : fmt(p.se)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {fit.derived.length > 0 && (
            <Panel title="Derived quantities">
              <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800/60 border-t border-zinc-800/60">
                {fit.derived.map((d) => (
                  <div key={d.label} className="px-3.5 py-1.5">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                      {d.label}
                    </div>
                    <div className="tabular mt-0.5 text-sm font-semibold text-amber-300">
                      {fmt(d.value)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel fill title="Model comparison" subtitle="Ranked by adjusted R²">
            <div className="h-full overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-zinc-950/95 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur">
                  <tr className="border-b border-zinc-800">
                    <th className="px-3.5 py-1.5">Model</th>
                    <th className="px-3.5 py-1.5 text-right">R²</th>
                    <th className="px-3.5 py-1.5 text-right">Adj</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => {
                    const active = r.model.id === modelId;
                    return (
                      <tr
                        key={r.model.id}
                        onClick={() => setModelId(r.model.id)}
                        className={`cursor-pointer border-t border-zinc-800/60 ${
                          active ? "bg-orange-500/[0.07]" : "hover:bg-zinc-800/30"
                        }`}
                      >
                        <td className="px-3.5 py-1 font-medium text-zinc-200">
                          {r.model.name}
                        </td>
                        <td className="tabular px-3.5 py-1 text-right text-zinc-300">
                          {fmt(r.fit!.r2, 3)}
                        </td>
                        <td className="tabular px-3.5 py-1 text-right font-medium text-orange-300">
                          {fmt(r.fit!.adjR2, 3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
