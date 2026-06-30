"use client";

import { useMemo } from "react";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { columnValues, numericColumns } from "@/lib/dataset";
import { descriptiveStats } from "@/lib/stats";
import { methodLabels } from "@/lib/outliers";
import { fmt, fmtInt } from "@/lib/format";
import { Panel, StatGrid } from "@/components/ui";
import { NoNumeric } from "@/components/workspace/tools/shared";
import { useSessionStore } from "@/store/session";
import {
  downloadCSV,
  openPrintableReport,
  type ReportDoc,
} from "@/lib/report";
import { IconDownload } from "@/components/icons";

const DIRECTION: Record<string, { text: string; tone: string }> = {
  increasing: { text: "▲ Increasing", tone: "text-emerald-300" },
  decreasing: { text: "▼ Decreasing", tone: "text-rose-300" },
  stable: { text: "→ Stable", tone: "text-slate-300" },
  insufficient: { text: "Insufficient", tone: "text-slate-500" },
};

export default function StatisticsView({
  dataset,
  analysis,
}: {
  dataset: Dataset;
  analysis: Analysis;
}) {
  const { stats, trend, outliers, y, yCol } = analysis;
  const authorName = useSessionStore((s) => s.name);
  const canExport = useSessionStore((s) => s.can("export"));

  const perColumn = useMemo(
    () =>
      numericColumns(dataset).map((c) => ({
        column: c,
        stats: descriptiveStats(columnValues(dataset, c.index)),
      })),
    [dataset],
  );

  if (numericColumns(dataset).length === 0) return <NoNumeric />;

  const dir = DIRECTION[trend.direction];
  const pct = y.length ? (outliers.count / y.length) * 100 : 0;

  const exportReport = () => {
    const doc: ReportDoc = {
      title: `${dataset.name} — Statistical Report`,
      subtitle: `Analysis of ${yCol?.name ?? "the selected variable"}`,
      author: authorName,
      meta: [
        ["Variable", yCol?.name ?? "—"],
        ["Observations", stats ? fmtInt(stats.count) : "—"],
        ["Outlier method", methodLabels[outliers.method]],
        ["Generated", new Date().toLocaleDateString()],
      ],
      sections: [
        {
          title: "Descriptive statistics",
          rows: [
            ["N", stats ? fmtInt(stats.count) : "—"],
            ["Mean", fmt(stats?.mean)],
            ["Median", fmt(stats?.median)],
            ["Std deviation", fmt(stats?.std)],
            ["Std error", fmt(stats?.sem)],
            ["Variance", fmt(stats?.variance)],
            ["Minimum", fmt(stats?.min)],
            ["Maximum", fmt(stats?.max)],
            ["Range", fmt(stats?.range)],
            ["Q1 (25%)", fmt(stats?.q1)],
            ["Q3 (75%)", fmt(stats?.q3)],
            ["IQR", fmt(stats?.iqr)],
            ["Skewness", fmt(stats?.skewness)],
            ["Kurtosis (excess)", fmt(stats?.kurtosis)],
            ["CV", stats ? `${fmt(stats.cv, 1)}%` : "—"],
            ["Sum", fmt(stats?.sum)],
          ],
        },
        {
          title: "Trend & regression",
          rows: [
            ["Direction", dir.text.replace(/[▲▼→]\s*/, "")],
            ["R²", fmt(trend.fit?.r2)],
            ["Strength", trend.strength],
            ["Slope (per unit x)", fmt(trend.fit?.slope)],
            ["% change / step", fmt(trend.percentChangePerStep, 2)],
            ["Total change", fmt(trend.totalChange)],
            ["Mann–Kendall τ", fmt(trend.mannKendallTau, 2)],
          ],
        },
        {
          title: "Outlier analysis",
          rows: [
            ["Method", methodLabels[outliers.method]],
            ["Flagged", `${fmtInt(outliers.count)} (${fmt(pct, 1)}%)`],
            ["Lower bound", fmt(outliers.lowerBound)],
            ["Upper bound", fmt(outliers.upperBound)],
            ["Threshold", fmt(outliers.threshold, 2)],
          ],
          note:
            outliers.count > 0
              ? `${outliers.count} value(s) fall outside the ${methodLabels[outliers.method]} bounds.`
              : "No values were flagged as outliers.",
        },
        {
          title: "Per-column summary",
          table: {
            headers: ["Column", "N", "Mean", "Std", "Min", "Median", "Max"],
            rows: perColumn.map(({ column, stats: s }) => [
              column.name,
              s ? fmtInt(s.count) : "—",
              fmt(s?.mean),
              fmt(s?.std),
              fmt(s?.min),
              fmt(s?.median),
              fmt(s?.max),
            ]),
          },
        },
      ],
    };
    openPrintableReport(doc);
  };

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ["Column", "N", "Mean", "Std", "Min", "Q1", "Median", "Q3", "Max", "Skewness", "Kurtosis"],
      ...perColumn.map(({ column, stats: s }) => [
        column.name,
        s?.count ?? 0,
        s?.mean ?? "",
        s?.std ?? "",
        s?.min ?? "",
        s?.q1 ?? "",
        s?.median ?? "",
        s?.q3 ?? "",
        s?.max ?? "",
        s?.skewness ?? "",
        s?.kurtosis ?? "",
      ]),
    ];
    downloadCSV(`${dataset.name}-statistics.csv`, rows);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <Panel
        title="Descriptive statistics"
        subtitle={`Summary measures for ${yCol?.name ?? "the selected variable"}`}
        actions={
          canExport && (
            <div className="flex items-center gap-2">
              <button
                onClick={exportReport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-200"
              >
                <IconDownload className="h-3.5 w-3.5" width={14} height={14} />
                Publication report
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-200"
              >
                <IconDownload className="h-3.5 w-3.5" width={14} height={14} />
                CSV
              </button>
            </div>
          )
        }
      >
        <StatGrid
          cols="grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
          items={[
            { label: "N", value: stats ? fmtInt(stats.count) : "—" },
            {
              label: "Mean",
              value: fmt(stats?.mean),
              accent: "text-sky-300",
            },
            { label: "Median", value: fmt(stats?.median) },
            { label: "Std Dev", value: fmt(stats?.std) },
            { label: "Std Error", value: fmt(stats?.sem) },
            { label: "Variance", value: fmt(stats?.variance) },
            { label: "Min", value: fmt(stats?.min) },
            { label: "Max", value: fmt(stats?.max) },
            { label: "Range", value: fmt(stats?.range) },
            { label: "Q1 (25%)", value: fmt(stats?.q1) },
            { label: "Q3 (75%)", value: fmt(stats?.q3) },
            { label: "IQR", value: fmt(stats?.iqr) },
            { label: "Skewness", value: fmt(stats?.skewness) },
            {
              label: "Kurtosis",
              value: fmt(stats?.kurtosis),
              hint: "excess",
            },
            {
              label: "CV",
              value: stats ? `${fmt(stats.cv, 1)}%` : "—",
            },
            { label: "Sum", value: fmt(stats?.sum) },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Trend"
          subtitle="Linear regression & monotonic trend"
        >
          <StatGrid
            cols="grid-cols-3"
            items={[
              {
                label: "Direction",
                value: <span className={dir.tone}>{dir.text}</span>,
              },
              {
                label: "R²",
                value: fmt(trend.fit?.r2),
                accent: "text-sky-300",
                hint: trend.strength,
              },
              {
                label: "M–K τ",
                value: fmt(trend.mannKendallTau, 2),
              },
              {
                label: "Slope",
                value: fmt(trend.fit?.slope),
                hint: "per unit x",
              },
              {
                label: "% / step",
                value: fmt(trend.percentChangePerStep, 2),
              },
              { label: "Total Δ", value: fmt(trend.totalChange) },
            ]}
          />
        </Panel>

        <Panel
          title="Outliers"
          subtitle={methodLabels[outliers.method]}
        >
          <StatGrid
            cols="grid-cols-3"
            items={[
              {
                label: "Flagged",
                value: fmtInt(outliers.count),
                accent: "text-rose-300",
                hint: `${fmt(pct, 1)}% of data`,
              },
              { label: "Lower", value: fmt(outliers.lowerBound) },
              { label: "Upper", value: fmt(outliers.upperBound) },
              {
                label: "Threshold",
                value: fmt(outliers.threshold, 2),
                hint: outliers.method === "iqr" ? "× IQR" : "score",
              },
              { label: "Min", value: fmt(stats?.min) },
              { label: "Max", value: fmt(stats?.max) },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Per-column summary"
        subtitle="Descriptive statistics for every numeric column"
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="px-5 py-2.5">Column</th>
                <th className="px-5 py-2.5 text-right">N</th>
                <th className="px-5 py-2.5 text-right">Mean</th>
                <th className="px-5 py-2.5 text-right">Std</th>
                <th className="px-5 py-2.5 text-right">Min</th>
                <th className="px-5 py-2.5 text-right">Median</th>
                <th className="px-5 py-2.5 text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {perColumn.map(({ column, stats: s }) => {
                const active = column.index === yCol?.index;
                return (
                  <tr
                    key={column.index}
                    className={`border-t border-slate-800/60 ${
                      active ? "bg-sky-500/[0.06]" : "hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="px-5 py-2 font-medium text-slate-200">
                      {column.name}
                      {active && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-sky-400">
                          active
                        </span>
                      )}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-400">
                      {s ? fmtInt(s.count) : "—"}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-200">
                      {fmt(s?.mean)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-400">
                      {fmt(s?.std)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-400">
                      {fmt(s?.min)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-400">
                      {fmt(s?.median)}
                    </td>
                    <td className="tabular px-5 py-2 text-right text-slate-400">
                      {fmt(s?.max)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {outliers.count > 0 && (
        <Panel
          title="Flagged values"
          subtitle={`${outliers.count} point${
            outliers.count === 1 ? "" : "s"
          } outside the ${methodLabels[outliers.method]} bounds`}
        >
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2">Point</th>
                  <th className="px-5 py-2 text-right">Value</th>
                  <th className="px-5 py-2 text-right">Score</th>
                  <th className="px-5 py-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {outliers.indices.map((i) => (
                  <tr key={i} className="border-t border-slate-800/60">
                    <td className="tabular px-5 py-1.5 text-slate-500">
                      {i + 1}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right font-medium text-slate-200">
                      {fmt(y[i])}
                    </td>
                    <td className="tabular px-5 py-1.5 text-right text-slate-400">
                      {fmt(outliers.scores[i], 2)}
                    </td>
                    <td className="px-5 py-1.5">
                      <span
                        className={
                          y[i] > outliers.upperBound
                            ? "text-rose-300"
                            : "text-amber-300"
                        }
                      >
                        {y[i] > outliers.upperBound ? "▲ High" : "▼ Low"}
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
