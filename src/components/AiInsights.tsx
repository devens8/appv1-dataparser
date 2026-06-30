"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";
import type { Dataset } from "@/types";
import { parseCSV } from "@/lib/csv";
import { computeAnalysis, INDEX_X } from "@/lib/analysis";
import {
  profileDataset,
  heuristicSummary,
  suggestCharts,
  suggestAxes,
  type ChartSuggestion,
} from "@/lib/insights";
import { useWorkspaceStore } from "@/store/workspaces";
import Chart, { CHART_PALETTE } from "@/components/Chart";
import { IconArrowRight, IconSparkle, IconUpload } from "@/components/icons";

const AX_LABEL = { color: "#a1a1aa", fontSize: 10 };
const AX_LINE = { lineStyle: { color: "#3f3f46" } };
const SPLIT = { lineStyle: { color: "#27272a" } };

interface AiResult {
  available: boolean;
  model?: string;
  summary?: string;
  suggestions?: string[];
}

const CHART_LABEL: Record<ChartSuggestion["chart"], string> = {
  scatter: "Scatter",
  line: "Line",
  histogram: "Histogram",
  box: "Box plot",
  heatmap: "Heatmap",
  bar: "Bar",
};

export default function AiInsights({ autoOpen = false }: { autoOpen?: boolean }) {
  const router = useRouter();
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const addDataset = useWorkspaceStore((s) => s.addDataset);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [ai, setAi] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const profile = useMemo(
    () => (dataset ? profileDataset(dataset) : null),
    [dataset],
  );
  const summary = useMemo(
    () => (dataset ? heuristicSummary(dataset) : ""),
    [dataset],
  );
  const charts = useMemo(
    () => (dataset ? suggestCharts(dataset) : []),
    [dataset],
  );
  const axes = useMemo(
    () => (dataset ? suggestAxes(dataset) : null),
    [dataset],
  );

  // Pre-selected preview plot using the suggested axes.
  const preview = useMemo<EChartsOption | null>(() => {
    if (!dataset || !axes || !axes.yName) return null;
    const a = computeAnalysis(dataset, axes.xName, axes.yName, "iqr");
    if (a.x.length === 0) return null;
    const isLine = axes.xName !== INDEX_X;
    return {
      tooltip: { trigger: "item" },
      grid: { left: 48, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: {
        type: "value",
        scale: true,
        name: a.xCol?.name ?? "Index",
        nameLocation: "middle",
        nameGap: 24,
        nameTextStyle: { color: "#d4d4d8", fontSize: 11 },
        axisLabel: AX_LABEL,
        axisLine: AX_LINE,
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: a.yCol?.name,
        nameTextStyle: { color: "#d4d4d8", fontSize: 11 },
        axisLabel: AX_LABEL,
        splitLine: SPLIT,
      },
      series: [
        {
          type: isLine ? "line" : "scatter",
          data: a.x.map((xi, i) => [xi, a.y[i]]),
          showSymbol: true,
          symbolSize: isLine ? 4 : 6,
          itemStyle: { color: CHART_PALETTE[0], opacity: 0.85 },
          lineStyle: { color: CHART_PALETTE[0], width: 2 },
        },
      ],
    } as EChartsOption;
  }, [dataset, axes]);

  const ingest = (file: File) => {
    setError(null);
    setAi(null);
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setError("Please provide a .csv, .tsv or .txt file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? "");
      const parsed = parseCSV(text);
      if (parsed.columns.length === 0) {
        setError("Could not parse any columns from this file.");
        return;
      }
      const name = file.name.replace(/\.[^.]+$/, "");
      // On the landing page, dropping a file goes straight into a new workspace.
      if (autoOpen) {
        const wsId = createWorkspace(name, "Created from an uploaded file");
        addDataset(wsId, name, parsed);
        router.push(`/workspace/${wsId}`);
        return;
      }
      setRawText(text);
      setDataset({
        id: "preview",
        name,
        createdAt: Date.now(),
        columns: parsed.columns,
        rows: parsed.rows,
      });
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsText(file);
  };

  // Ask the optional AI route to enrich the summary (no-op without an API key).
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setAiLoading(true);
    fetch("/api/summarize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    })
      .then((r) => r.json())
      .then((j: AiResult) => {
        if (!cancelled) setAi(j);
      })
      .catch(() => {
        if (!cancelled) setAi({ available: false });
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const createFromFile = () => {
    if (!dataset) return;
    const parsed = parseCSV(rawText);
    const wsId = createWorkspace(dataset.name, "Created from AI Insights");
    addDataset(wsId, dataset.name, parsed);
    router.push(`/workspace/${wsId}`);
  };

  const aiActive = ai?.available && (ai.summary || (ai.suggestions?.length ?? 0));

  return (
    <section className="surface glow animate-fade-in-up rounded-sm">
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-500/30">
            <IconSparkle className="h-4.5 w-4.5" width={18} height={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-fg">
              AI Insights
            </h2>
            <p className="text-[11px] text-fgsubtle">
              Drop a file for an instant summary and graphing suggestions
            </p>
          </div>
        </div>
        {dataset && (
          <button
            onClick={() => {
              setDataset(null);
              setAi(null);
              setError(null);
            }}
            className="text-[11px] font-medium text-fgmuted hover:text-accent"
          >
            Clear
          </button>
        )}
      </header>

      {!dataset ? (
        <div className="p-4">
          <div
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) ingest(f);
            }}
            className={`grid-bg flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? "border-orange-500 bg-orange-500/10"
                : "border-line bg-panel/40 hover:border-orange-500/60 hover:bg-orange-500/5"
            }`}
          >
            <IconUpload
              className="h-7 w-7 text-accent"
              width={28}
              height={28}
            />
            <p className="mt-3 text-sm font-medium text-fg">
              Drop a CSV here, or click to browse
            </p>
            <p className="mt-1 text-[11px] text-fgsubtle">
              Analysed in your browser — nothing is uploaded unless an AI key is
              configured.
            </p>
          </div>
          {error && (
            <p className="mt-3 text-sm font-medium text-red-400">{error}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ingest(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Left: summary + suggestions */}
          <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Summary
              </span>
              {aiLoading && (
                <span className="text-[10px] text-accent/80">analysing…</span>
              )}
              {aiActive && (
                <span className="rounded-sm bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent ring-1 ring-inset ring-orange-500/30">
                  AI · {ai?.model?.replace("claude-", "") ?? "on"}
                </span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-fgmuted">
              {aiActive ? ai?.summary : summary}
            </p>

            <div className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
              Suggested charts
            </div>
            <ul className="space-y-1.5">
              {aiActive && ai?.suggestions?.length
                ? ai.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[12px] leading-snug text-fgmuted"
                    >
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                      {s}
                    </li>
                  ))
                : charts.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12px] leading-snug"
                    >
                      <span className="mt-0.5 shrink-0 rounded-sm bg-panel2 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-accent">
                        {CHART_LABEL[c.chart]}
                      </span>
                      <span className="text-fgmuted">
                        <span className="font-medium text-fg">
                          {c.title}.
                        </span>{" "}
                        {c.detail}
                      </span>
                    </li>
                  ))}
            </ul>
          </div>

          {/* Right: pre-selected preview plot */}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Suggested plot
              </span>
              <span className="text-[10px] text-fgsubtle">
                {profile?.rows.toLocaleString()} × {profile?.cols}
              </span>
            </div>
            {preview ? (
              <Chart option={preview} height={210} />
            ) : (
              <div className="flex h-[210px] items-center justify-center text-[12px] text-fgsubtle">
                No numeric columns to preview.
              </div>
            )}
            {axes?.reason && (
              <p className="mt-2 text-[11px] leading-snug text-fgsubtle">
                {axes.reason}
              </p>
            )}
            <button
              onClick={createFromFile}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-orange-500/25 hover:text-orange-100"
            >
              Open in a workspace
              <IconArrowRight className="h-4 w-4" width={16} height={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
