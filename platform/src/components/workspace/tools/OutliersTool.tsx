"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import type { Dataset } from "@/types";
import {
  detectOutliers,
  methodBlurb,
  methodLabels,
  type OutlierMethod,
} from "@/lib/outliers";
import { columnValues, numericColumns } from "@/lib/dataset";
import { fmt, fmtInt } from "@/lib/format";
import Chart from "@/components/Chart";
import { Field, Panel, Segmented, Select, StatCard } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";

export default function OutliersTool({ dataset }: { dataset: Dataset }) {
  const numCols = numericColumns(dataset);
  const [col, setCol] = useState(numCols[0]?.name ?? "");
  const [method, setMethod] = useState<OutlierMethod>("iqr");

  const column = numCols.find((c) => c.name === col) ?? numCols[0];
  const values = useMemo(
    () => (column ? columnValues(dataset, column.index) : []),
    [dataset, column],
  );
  const result = useMemo(
    () => detectOutliers(values, method),
    [values, method],
  );
  const outlierSet = useMemo(() => new Set(result.indices), [result]);

  const chart = useMemo<EChartsOption>(() => {
    const normal: [number, number][] = [];
    const flagged: [number, number][] = [];
    values.forEach((v, i) => {
      (outlierSet.has(i) ? flagged : normal).push([i, v]);
    });
    const markLines: { yAxis: number; name: string }[] = [];
    if (isFinite(result.lowerBound))
      markLines.push({ yAxis: result.lowerBound, name: "Lower" });
    if (isFinite(result.upperBound))
      markLines.push({ yAxis: result.upperBound, name: "Upper" });

    return {
      tooltip: { trigger: "item" },
      grid: { left: 56, right: 24, top: 24, bottom: 44, containLabel: true },
      xAxis: {
        type: "value",
        name: "Index",
        nameLocation: "middle",
        nameGap: 28,
        splitLine: { show: false },
        axisLabel: { color: "#64748b" },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: column?.name,
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" },
      },
      series: [
        {
          type: "scatter",
          name: "In range",
          data: normal,
          symbolSize: 6,
          itemStyle: { color: "#94a3b8", opacity: 0.7 },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#ef4444", type: "dashed" },
            label: { color: "#ef4444", fontSize: 10 },
            data: markLines,
          },
        },
        {
          type: "scatter",
          name: "Outlier",
          data: flagged,
          symbolSize: 11,
          itemStyle: {
            color: "#ef4444",
            borderColor: "#fff",
            borderWidth: 1.5,
          },
        },
      ],
    } as EChartsOption;
  }, [values, outlierSet, result, column]);

  if (numCols.length === 0) return <NoNumeric />;

  const pct = values.length
    ? (result.count / values.length) * 100
    : 0;

  return (
    <div className="space-y-5">
      <Panel
        title="Outlier detection"
        subtitle={methodBlurb[method]}
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
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Segmented
            value={method}
            onChange={(v) => setMethod(v)}
            options={(Object.keys(methodLabels) as OutlierMethod[]).map(
              (m) => ({ value: m, label: methodLabels[m] }),
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
          <StatCard
            label="Outliers"
            value={fmtInt(result.count)}
            accentClass="text-rose-500"
            hint={`${fmt(pct, 1)}% of data`}
          />
          <StatCard label="Lower bound" value={fmt(result.lowerBound)} />
          <StatCard label="Upper bound" value={fmt(result.upperBound)} />
          <StatCard
            label="Threshold"
            value={fmt(result.threshold, 2)}
            hint={method === "iqr" ? "× IQR" : "score"}
          />
        </div>
      </Panel>

      <Panel title="Scatter with bounds">
        <div className="p-3">
          <Chart option={chart} height={360} />
        </div>
      </Panel>

      <Panel
        title="Flagged values"
        subtitle={`${result.count} point${result.count === 1 ? "" : "s"} outside the ${methodLabels[method]} bounds`}
      >
        {result.count === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No outliers detected with the current method.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-[11px] font-semibold text-slate-400">
                  <th className="px-5 py-2">Row</th>
                  <th className="px-5 py-2">Value</th>
                  <th className="px-5 py-2">Score</th>
                  <th className="px-5 py-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {result.indices.map((i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-5 py-1.5 tabular text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-5 py-1.5 tabular font-medium text-slate-700">
                      {fmt(values[i])}
                    </td>
                    <td className="px-5 py-1.5 tabular text-slate-500">
                      {fmt(result.scores[i], 2)}
                    </td>
                    <td className="px-5 py-1.5">
                      <span
                        className={
                          values[i] > result.upperBound
                            ? "text-rose-500"
                            : "text-amber-500"
                        }
                      >
                        {values[i] > result.upperBound ? "▲ High" : "▼ Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
