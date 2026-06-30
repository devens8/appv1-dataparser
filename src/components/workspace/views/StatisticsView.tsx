"use client";

import { useMemo } from "react";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { columnValues, numericColumns } from "@/lib/dataset";
import { descriptiveStats } from "@/lib/stats";
import { methodLabels } from "@/lib/outliers";
import { fmt, fmtInt } from "@/lib/format";
import { Panel } from "@/components/ui";
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
  stable: { text: "→ Stable", tone: "text-fgmuted" },
  insufficient: { text: "Insufficient", tone: "text-fgsubtle" },
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

  const descriptive: { label: string; value: string; accent?: string }[] = [
    { label: "N", value: stats ? fmtInt(stats.count) : "—" },
    { label: "Mean", value: fmt(stats?.mean), accent: "text-accent" },
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
    { label: "Kurtosis", value: fmt(stats?.kurtosis) },
    { label: "CV", value: stats ? `${fmt(stats.cv, 1)}%` : "—" },
    { label: "Sum", value: fmt(stats?.sum) },
  ];

  return (
    <div className="animate-fade-in grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      {/* Descriptive statistics — a dense, full-width spec sheet */}
      <Panel
        title={`Descriptive statistics · ${yCol?.name ?? "variable"}`}
        subtitle="All summary measures at a glance"
        actions={
          canExport && (
            <div className="flex items-center gap-2">
              <button
                onClick={exportReport}
                className="flex items-center gap-1.5 rounded-sm border border-line bg-panel/60 px-2.5 py-1 text-[11px] font-medium text-fg transition-colors hover:border-orange-500/50 hover:text-accent"
              >
                <IconDownload className="h-3.5 w-3.5" width={14} height={14} />
                Report
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-sm border border-line bg-panel/60 px-2.5 py-1 text-[11px] font-medium text-fg transition-colors hover:border-orange-500/50 hover:text-accent"
              >
                <IconDownload className="h-3.5 w-3.5" width={14} height={14} />
                CSV
              </button>
            </div>
          )
        }
      >
        <div className="grid grid-cols-4 divide-x divide-y divide-line/60 border-t border-line/60 sm:grid-cols-8">
          {descriptive.map((it) => (
            <div key={it.label} className="px-3 py-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-fgsubtle">
                {it.label}
              </div>
              <div
                className={`tabular mt-0.5 text-sm font-semibold leading-none ${
                  it.accent ?? "text-fg"
                }`}
              >
                {it.value}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Lower region fills the rest: trend + outliers | per-column sheet */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="grid min-h-0 grid-rows-2 gap-3 lg:col-span-5">
          <Panel fill title="Trend" subtitle="Linear regression & monotonic trend">
            <KVList
              rows={[
                ["Direction", <span key="d" className={dir.tone}>{dir.text}</span>],
                ["R² (strength)", `${fmt(trend.fit?.r2)} · ${trend.strength}`],
                ["Slope (per x)", fmt(trend.fit?.slope)],
                ["% change / step", fmt(trend.percentChangePerStep, 2)],
                ["Mann–Kendall τ", fmt(trend.mannKendallTau, 2)],
                ["Total Δ", fmt(trend.totalChange)],
              ]}
            />
          </Panel>

          <Panel
            fill
            title="Outliers"
            subtitle={`${methodLabels[outliers.method]} · ${fmtInt(
              outliers.count,
            )} flagged (${fmt(pct, 1)}%)`}
            bodyClassName="flex flex-col"
          >
            <KVList
              rows={[
                ["Lower bound", fmt(outliers.lowerBound)],
                ["Upper bound", fmt(outliers.upperBound)],
                [
                  "Threshold",
                  `${fmt(outliers.threshold, 2)} ${
                    outliers.method === "iqr" ? "× IQR" : "score"
                  }`,
                ],
              ]}
            />
            {outliers.count > 0 && (
              <div className="min-h-0 flex-1 overflow-auto border-t border-line/60">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-base/95 text-left uppercase tracking-wide text-fgsubtle backdrop-blur">
                    <tr>
                      <th className="px-3 py-1 font-semibold">#</th>
                      <th className="px-3 py-1 text-right font-semibold">Value</th>
                      <th className="px-3 py-1 text-right font-semibold">Score</th>
                      <th className="px-3 py-1 font-semibold">Dir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outliers.indices.map((i) => (
                      <tr key={i} className="border-t border-line/50">
                        <td className="tabular px-3 py-0.5 text-fgsubtle">{i + 1}</td>
                        <td className="tabular px-3 py-0.5 text-right font-medium text-fg">
                          {fmt(y[i])}
                        </td>
                        <td className="tabular px-3 py-0.5 text-right text-fgmuted">
                          {fmt(outliers.scores[i], 2)}
                        </td>
                        <td className="px-3 py-0.5">
                          <span
                            className={
                              y[i] > outliers.upperBound
                                ? "text-red-300"
                                : "text-amber-300"
                            }
                          >
                            {y[i] > outliers.upperBound ? "▲" : "▼"}
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

        <Panel
          fill
          className="lg:col-span-7"
          title="Per-column summary"
          subtitle="Descriptive statistics for every numeric column"
        >
          <div className="h-full overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-base/95 text-left text-[10px] font-semibold uppercase tracking-wide text-fgsubtle backdrop-blur">
                <tr className="border-b border-line">
                  <th className="px-4 py-2">Column</th>
                  <th className="px-4 py-2 text-right">N</th>
                  <th className="px-4 py-2 text-right">Mean</th>
                  <th className="px-4 py-2 text-right">Std</th>
                  <th className="px-4 py-2 text-right">Min</th>
                  <th className="px-4 py-2 text-right">Median</th>
                  <th className="px-4 py-2 text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {perColumn.map(({ column, stats: s }) => {
                  const active = column.index === yCol?.index;
                  return (
                    <tr
                      key={column.index}
                      className={`border-t border-line/60 ${
                        active ? "bg-orange-500/[0.06]" : "hover:bg-panel2/30"
                      }`}
                    >
                      <td className="px-4 py-1.5 font-medium text-fg">
                        {column.name}
                        {active && (
                          <span className="ml-2 text-[9px] font-semibold uppercase text-accent">
                            active
                          </span>
                        )}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fgmuted">
                        {s ? fmtInt(s.count) : "—"}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fg">
                        {fmt(s?.mean)}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fgmuted">
                        {fmt(s?.std)}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fgmuted">
                        {fmt(s?.min)}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fgmuted">
                        {fmt(s?.median)}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right text-fgmuted">
                        {fmt(s?.max)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Compact key→value sheet rows (label left, value right). */
function KVList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="divide-y divide-line/60">
      {rows.map(([k, v], i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3.5 py-[5px] text-[12px]"
        >
          <span className="text-fgsubtle">{k}</span>
          <span className="tabular font-medium text-fg">{v}</span>
        </div>
      ))}
    </div>
  );
}
