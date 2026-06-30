"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DataImport from "@/components/workspace/DataImport";
import ChartsView from "@/components/workspace/views/ChartsView";
import StatisticsView from "@/components/workspace/views/StatisticsView";
import DataView from "@/components/workspace/views/DataView";
import AnomalyView from "@/components/workspace/views/AnomalyView";
import ComparisonView from "@/components/workspace/views/ComparisonView";
import LongitudinalView from "@/components/workspace/views/LongitudinalView";
import CurveFitView from "@/components/workspace/views/CurveFitView";
import { useWorkspaceStore } from "@/store/workspaces";
import { useSessionStore } from "@/store/session";
import { accent } from "@/lib/colors";
import { computeAnalysis, INDEX_X } from "@/lib/analysis";
import { methodLabels, type OutlierMethod } from "@/lib/outliers";
import { numericColumns } from "@/lib/dataset";
import { Field, Select } from "@/components/ui";
import {
  IconChart,
  IconClock,
  IconClose,
  IconCurve,
  IconLayers,
  IconMenu,
  IconPulse,
  IconStats,
  IconTable,
} from "@/components/icons";

type Tab =
  | "charts"
  | "fit"
  | "stats"
  | "data"
  | "anomaly"
  | "compare"
  | "longitudinal";

interface TabDef {
  id: Tab;
  label: string;
  icon: typeof IconChart;
  /** Analyze-menu grouping, Prism/JMP style. */
  group: "Visualize" | "Fit" | "Describe" | "Compare" | "Detect";
  blurb: string;
}

const TABS: TabDef[] = [
  { id: "charts", label: "Charts", icon: IconChart, group: "Visualize", blurb: "Scatter / line, distribution, box & correlation" },
  { id: "fit", label: "Curve Fit", icon: IconCurve, group: "Fit", blurb: "Nonlinear regression — dose-response, kinetics, growth" },
  { id: "stats", label: "Statistics", icon: IconStats, group: "Describe", blurb: "Descriptive stats, trend & regression" },
  { id: "data", label: "Data", icon: IconTable, group: "Describe", blurb: "Spreadsheet view of the raw matrix" },
  { id: "anomaly", label: "Anomalies", icon: IconPulse, group: "Detect", blurb: "Rolling z-score & CUSUM change-points" },
  { id: "compare", label: "Compare", icon: IconLayers, group: "Compare", blurb: "ANOVA, t-tests & nonparametric across datasets" },
  { id: "longitudinal", label: "Longitudinal", icon: IconClock, group: "Compare", blurb: "Track a variable's mean across datasets over time" },
];

const ANALYZE_GROUPS: TabDef["group"][] = [
  "Visualize",
  "Fit",
  "Describe",
  "Compare",
  "Detect",
];

/** Tabs that operate on the single active dataset (need the X/Y/method bar). */
const SINGLE_DATASET_TABS: Tab[] = ["charts", "fit", "stats", "data", "anomaly"];

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const setActiveDataset = useWorkspaceStore((s) => s.setActiveDataset);
  const removeDataset = useWorkspaceStore((s) => s.removeDataset);
  const canDelete = useSessionStore((s) => s.can("delete"));

  const workspace = workspaces.find((w) => w.id === id);
  const [tab, setTab] = useState<Tab>("charts");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  // Single, lifted analysis selection — chosen once, used by every tab.
  const [xName, setXName] = useState<string>(INDEX_X);
  const [yName, setYName] = useState<string>("");
  const [method, setMethod] = useState<OutlierMethod>("iqr");

  const activeDataset = useMemo(() => {
    if (!workspace) return null;
    return (
      workspace.datasets.find((d) => d.id === workspace.activeDatasetId) ??
      workspace.datasets[0] ??
      null
    );
  }, [workspace]);

  const analysis = useMemo(
    () =>
      activeDataset
        ? computeAnalysis(activeDataset, xName, yName, method)
        : null,
    [activeDataset, xName, yName, method],
  );

  if (!hydrated) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl px-8 py-10">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton mt-6 h-64 rounded-xl" />
        </div>
      </Shell>
    );
  }

  if (!workspace) {
    return (
      <Shell>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <h2 className="text-lg font-semibold text-slate-100">
            Workspace not found
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            It may have been deleted.
          </p>
          <Link
            href="/"
            className="mt-4 rounded-lg bg-sky-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
          >
            Back to workspaces
          </Link>
        </div>
      </Shell>
    );
  }

  const a = accent(workspace.color);
  const hasNumeric =
    activeDataset && numericColumns(activeDataset).length > 0;

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="relative border-b border-slate-800/80 bg-slate-950/40 px-6 pt-4">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300">
              Workspaces
            </Link>
            <span>/</span>
            <span className="text-slate-300">{workspace.name}</span>
          </nav>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`h-7 w-1.5 rounded-full ${a.bg} shadow-[0_0_12px_currentColor]`}
              />
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-50">
                  {workspace.name}
                </h1>
                {workspace.description && (
                  <p className="text-sm text-slate-400">
                    {workspace.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeDataset && (
                <div className="relative">
                  <button
                    onClick={() => setAnalyzeOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-sky-500/60 hover:text-sky-300"
                  >
                    <IconMenu className="h-4 w-4" width={16} height={16} />
                    Analyze
                  </button>
                  {analyzeOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setAnalyzeOpen(false)}
                      />
                      <div className="surface glow absolute right-0 z-40 mt-2 w-72 rounded-xl p-2">
                        {ANALYZE_GROUPS.map((g) => {
                          const items = TABS.filter((t) => t.group === g);
                          if (!items.length) return null;
                          return (
                            <div key={g} className="mb-1.5 last:mb-0">
                              <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                {g}
                              </div>
                              {items.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    setTab(t.id);
                                    setAnalyzeOpen(false);
                                  }}
                                  className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                    tab === t.id
                                      ? "bg-sky-500/10 text-sky-200"
                                      : "text-slate-300 hover:bg-slate-800/60"
                                  }`}
                                >
                                  <t.icon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                                    width={16}
                                    height={16}
                                  />
                                  <span>
                                    <span className="block text-sm font-medium">
                                      {t.label}
                                    </span>
                                    <span className="block text-[11px] leading-tight text-slate-500">
                                      {t.blurb}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              <DataImport workspaceId={workspace.id} compact />
            </div>
          </div>

          {/* Dataset tabs */}
          {workspace.datasets.length > 0 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2.5">
              {workspace.datasets.map((d) => {
                const isActive = d.id === activeDataset?.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setActiveDataset(workspace.id, d.id)}
                    className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                        : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <IconTable className="h-3.5 w-3.5" width={14} height={14} />
                    <span className="max-w-[160px] truncate">{d.name}</span>
                    <span className="tabular text-[10px] text-slate-500">
                      {d.rows.length}×{d.columns.length}
                    </span>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove dataset "${d.name}"?`))
                            removeDataset(workspace.id, d.id);
                        }}
                        className="rounded p-0.5 text-slate-600 opacity-0 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                      >
                        <IconClose className="h-3 w-3" width={12} height={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tool tabs */}
          {activeDataset && (
            <div className="-mb-px flex items-center gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-sky-300"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <t.icon className="h-4 w-4" width={16} height={16} />
                    {t.label}
                    {isActive && (
                      <span className="hairline-accent animate-sweep absolute inset-x-0 bottom-0 h-0.5 origin-left" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Global analysis selector — choose data once, shown everywhere */}
        {activeDataset && hasNumeric && analysis && SINGLE_DATASET_TABS.includes(tab) && (
          <div className="flex flex-wrap items-end gap-4 border-b border-slate-800/80 bg-slate-900/30 px-6 py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-sky-400" />
              Analyzing
            </div>
            <Field label="X axis">
              <Select value={xName} onChange={setXName}>
                <option value={INDEX_X}>Row index</option>
                {activeDataset.columns.map((c) => (
                  <option key={c.index} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Y variable">
              <Select value={analysis.yName} onChange={setYName}>
                {analysis.numCols.map((c) => (
                  <option key={c.index} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Outlier method">
              <Select
                value={method}
                onChange={(v) => setMethod(v as OutlierMethod)}
              >
                {(Object.keys(methodLabels) as OutlierMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {methodLabels[m]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeDataset ? (
            <div className="py-10">
              <DataImport workspaceId={workspace.id} />
            </div>
          ) : (
            <div className="mx-auto max-w-6xl" key={tab}>
              {tab === "charts" && analysis && (
                <ChartsView dataset={activeDataset} analysis={analysis} />
              )}
              {tab === "fit" && analysis && (
                <CurveFitView dataset={activeDataset} analysis={analysis} />
              )}
              {tab === "stats" && analysis && (
                <StatisticsView dataset={activeDataset} analysis={analysis} />
              )}
              {tab === "data" && analysis && (
                <DataView dataset={activeDataset} analysis={analysis} />
              )}
              {tab === "anomaly" && analysis && (
                <AnomalyView dataset={activeDataset} analysis={analysis} />
              )}
              {tab === "compare" && <ComparisonView workspace={workspace} />}
              {tab === "longitudinal" && (
                <LongitudinalView workspace={workspace} />
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
