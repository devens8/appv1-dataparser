"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DataImport from "@/components/workspace/DataImport";
import DataTable from "@/components/workspace/DataTable";
import OverviewTool from "@/components/workspace/tools/OverviewTool";
import StatisticsTool from "@/components/workspace/tools/StatisticsTool";
import OutliersTool from "@/components/workspace/tools/OutliersTool";
import TrendsTool from "@/components/workspace/tools/TrendsTool";
import VisualizationTool from "@/components/workspace/tools/VisualizationTool";
import { useWorkspaceStore } from "@/store/workspaces";
import { accent } from "@/lib/colors";
import {
  IconChart,
  IconClose,
  IconGrid,
  IconStats,
  IconTable,
  IconTarget,
  IconTrend,
} from "@/components/icons";

type Tool =
  | "overview"
  | "statistics"
  | "outliers"
  | "trends"
  | "visualize"
  | "data";

const TOOLS: { id: Tool; label: string; icon: typeof IconGrid }[] = [
  { id: "overview", label: "Overview", icon: IconGrid },
  { id: "statistics", label: "Statistics", icon: IconStats },
  { id: "outliers", label: "Outliers", icon: IconTarget },
  { id: "trends", label: "Trends", icon: IconTrend },
  { id: "visualize", label: "Visualize", icon: IconChart },
  { id: "data", label: "Data", icon: IconTable },
];

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const setActiveDataset = useWorkspaceStore((s) => s.setActiveDataset);
  const removeDataset = useWorkspaceStore((s) => s.removeDataset);

  const workspace = workspaces.find((w) => w.id === id);
  const [tool, setTool] = useState<Tool>("overview");

  const activeDataset = useMemo(() => {
    if (!workspace) return null;
    return (
      workspace.datasets.find((d) => d.id === workspace.activeDatasetId) ??
      workspace.datasets[0] ??
      null
    );
  }, [workspace]);

  if (!hydrated) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl px-8 py-10">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </Shell>
    );
  }

  if (!workspace) {
    return (
      <Shell>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <h2 className="text-lg font-semibold text-slate-800">
            Workspace not found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            It may have been deleted.
          </p>
          <Link
            href="/"
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to workspaces
          </Link>
        </div>
      </Shell>
    );
  }

  const a = accent(workspace.color);

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-8 pt-5">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">
              Workspaces
            </Link>
            <span>/</span>
            <span className="text-slate-600">{workspace.name}</span>
          </nav>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-8 w-1.5 rounded-full ${a.bg}`} />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  {workspace.name}
                </h1>
                {workspace.description && (
                  <p className="text-sm text-slate-500">
                    {workspace.description}
                  </p>
                )}
              </div>
            </div>
            <DataImport workspaceId={workspace.id} compact />
          </div>

          {/* Dataset tabs */}
          {workspace.datasets.length > 0 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-3">
              {workspace.datasets.map((d) => {
                const isActive = d.id === activeDataset?.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setActiveDataset(workspace.id, d.id)}
                    className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <IconTable className="h-3.5 w-3.5" width={14} height={14} />
                    <span className="max-w-[160px] truncate">{d.name}</span>
                    <span className="tabular text-[10px] text-slate-400">
                      {d.rows.length}×{d.columns.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove dataset "${d.name}"?`))
                          removeDataset(workspace.id, d.id);
                      }}
                      className="rounded p-0.5 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <IconClose className="h-3 w-3" width={12} height={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tool tabs */}
          {activeDataset && (
            <div className="-mb-px flex items-center gap-1 overflow-x-auto">
              {TOOLS.map((t) => {
                const isActive = tool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <t.icon className="h-4 w-4" width={16} height={16} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          {!activeDataset ? (
            <div className="py-10">
              <DataImport workspaceId={workspace.id} />
            </div>
          ) : (
            <div className="animate-fade-in mx-auto max-w-6xl">
              {tool === "overview" && <OverviewTool dataset={activeDataset} />}
              {tool === "statistics" && (
                <StatisticsTool dataset={activeDataset} />
              )}
              {tool === "outliers" && <OutliersTool dataset={activeDataset} />}
              {tool === "trends" && <TrendsTool dataset={activeDataset} />}
              {tool === "visualize" && (
                <VisualizationTool dataset={activeDataset} />
              )}
              {tool === "data" && <DataTable dataset={activeDataset} />}
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
