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
import { Field, Panel, Select, StatGrid, Badge } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

const AX_LABEL = { color: "#94a3b8", fontSize: 11 };
const AX_LINE = { lineStyle: { color: "#334155" } };
const SPLIT = { lineStyle: { color: "#1e293b" } };

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
        areaStyle: { color: "rgba(56,189,248,0.10)" },
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
        textStyle: { color: "#94a3b8", fontSize: 11 },
        inactiveColor: "#475569",
      },
      grid: { left: 56, right: 24, top: 40, bottom: 48, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: model.xIsLog ? `log10(${xCol?.name ?? "dose"})` : (xCol?.name ?? "X"),
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
        nameTextStyle: { color: "#cbd5e1", fontSize: 11 },
        splitLine: { show: false },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "Residual",
        nameTextStyle: { color: "#94a3b8" },
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
            lineStyle: { color: "#475569", type: "dashed" },
            data: [{ yAxis: 0 }],
          },
        },
      ] as SeriesOption[],
    } as EChartsOption;
  }, [fit, x, y, model, xCol]);

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title="Nonlinear curve fitting"
        subtitle="Levenberg–Marquardt least-squares · dose-response, kinetics & growth models"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Model">
              <Select value={modelId} onChange={setModelId} className="min-w-[220px]">
                {CURVE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-400">
              <input
                type="checkbox"
                checked={showBand}
                onChange={(e) => setShowBand(e.target.checked)}
                className="accent-sky-500"
              />
              95% band
            </label>
          </div>
        }
      >
        <div className="border-b border-slate-800/70 px-4 py-2.5">
          <p className="font-mono text-[11px] text-sky-200/90">{model.equation}</p>
          <p className="mt-1 text-[11px] text-slate-500">{model.blurb}</p>
          {model.xIsLog && (
            <p className="mt-1 text-[11px] text-amber-300/80">
              This model expects X to be log10(dose). Pick a log-concentration
              column as X, or transform your dose column first.
            </p>
          )}
        </div>
        <div className="p-3">
          {fitChart ? (
            <Chart option={fitChart} height={420} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
              Not enough points to fit this model (need ≥ {model.params.length + 1}).
            </div>
          )}
        </div>
      </Panel>

      {fit && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel
              title="Goodness of fit"
              className="lg:col-span-1"
              actions={
                <Badge tone={fit.converged ? "emerald" : "amber"}>
                  {fit.converged ? "Converged" : "Max iters"}
                </Badge>
              }
            >
              <StatGrid
                cols="grid-cols-2"
                items={[
                  { label: "R²", value: fmt(fit.r2, 4), accent: "text-sky-300" },
                  { label: "Adjusted R²", value: fmt(fit.adjR2, 4) },
                  { label: "RMSE (σ)", value: fmt(fit.rmse) },
                  { label: "SSE", value: fmt(fit.sse) },
                  { label: "N", value: fmtInt(fit.n) },
                  { label: "DOF", value: fmtInt(fit.dof) },
                ]}
              />
            </Panel>

            <Panel
              title="Fitted parameters"
              subtitle="Estimate ± standard error with 95% confidence interval"
              className="lg:col-span-2"
            >
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="px-5 py-2.5">Parameter</th>
                      <th className="px-5 py-2.5 text-right">Estimate</th>
                      <th className="px-5 py-2.5 text-right">Std. error</th>
                      <th className="px-5 py-2.5 text-right">95% CI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fit.params.map((p) => (
                      <tr
                        key={p.name}
                        className="border-t border-slate-800/60 hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-2 font-medium text-slate-200">
                          {p.name}
                        </td>
                        <td className="tabular px-5 py-2 text-right font-medium text-sky-300">
                          {fmt(p.value)}
                        </td>
                        <td className="tabular px-5 py-2 text-right text-slate-400">
                          {isNaN(p.se) ? "—" : fmt(p.se)}
                        </td>
                        <td className="tabular px-5 py-2 text-right text-slate-400">
                          {isNaN(p.se)
                            ? "—"
                            : `${fmt(p.ci[0])} … ${fmt(p.ci[1])}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {fit.derived.length > 0 && (
            <Panel
              title="Derived quantities"
              subtitle="Interpretable values back-transformed from the fit"
            >
              <StatGrid
                cols="grid-cols-2 sm:grid-cols-4"
                items={fit.derived.map((d) => ({
                  label: d.label,
                  value: fmt(d.value),
                  accent: "text-amber-300",
                  hint: d.hint,
                }))}
              />
            </Panel>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Residuals"
              subtitle="Observed − fitted. Look for structure (a good fit scatters around 0)."
            >
              <div className="p-3">
                {residualChart && <Chart option={residualChart} height={260} />}
              </div>
            </Panel>

            <Panel
              title="Model comparison"
              subtitle="Every model fit to this data, ranked by adjusted R²"
            >
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                    <tr className="border-b border-slate-800">
                      <th className="px-5 py-2">Model</th>
                      <th className="px-5 py-2 text-right">R²</th>
                      <th className="px-5 py-2 text-right">Adj R²</th>
                      <th className="px-5 py-2 text-right">RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r) => {
                      const active = r.model.id === modelId;
                      return (
                        <tr
                          key={r.model.id}
                          onClick={() => setModelId(r.model.id)}
                          className={`cursor-pointer border-t border-slate-800/60 ${
                            active ? "bg-sky-500/[0.07]" : "hover:bg-slate-800/30"
                          }`}
                        >
                          <td className="px-5 py-1.5 font-medium text-slate-200">
                            {r.model.name}
                            {active && (
                              <span className="ml-2 text-[10px] font-semibold uppercase text-sky-400">
                                active
                              </span>
                            )}
                          </td>
                          <td className="tabular px-5 py-1.5 text-right text-slate-300">
                            {fmt(r.fit!.r2, 4)}
                          </td>
                          <td className="tabular px-5 py-1.5 text-right font-medium text-sky-300">
                            {fmt(r.fit!.adjR2, 4)}
                          </td>
                          <td className="tabular px-5 py-1.5 text-right text-slate-400">
                            {fmt(r.fit!.rmse)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
