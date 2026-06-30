"use client";

import { useRef, useState } from "react";
import { parseCSV } from "@/lib/csv";
import { useWorkspaceStore } from "@/store/workspaces";
import { IconLink, IconUpload } from "@/components/icons";

const CONNECTORS = [
  { name: "Google Sheets", desc: "Sync a spreadsheet" },
  { name: "Database (SQL)", desc: "Postgres, MySQL…" },
  { name: "Instrument API", desc: "Lab instrument export" },
];

function sampleCsv(): string {
  // A small, believable experimental run: time vs. signal with a couple spikes.
  const rows = ["time_s,signal_mV,temperature_C,replicate"];
  for (let i = 0; i < 60; i++) {
    const t = i;
    const base = 20 + 0.45 * i + 6 * Math.sin(i / 5);
    const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    let signal = base + noise * 4 - 2;
    if (i === 23) signal += 38; // injected outlier
    if (i === 47) signal -= 30; // injected outlier
    const temp = 36.5 + 0.02 * i + noise * 0.3;
    rows.push(
      `${t},${signal.toFixed(2)},${temp.toFixed(2)},${(i % 3) + 1}`,
    );
  }
  return rows.join("\n");
}

export default function DataImport({
  workspaceId,
  compact = false,
}: {
  workspaceId: string;
  compact?: boolean;
}) {
  const addDataset = useWorkspaceStore((s) => s.addDataset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingest = (file: File) => {
    setError(null);
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
      addDataset(workspaceId, file.name.replace(/\.[^.]+$/, ""), parsed);
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsText(file);
  };

  const loadSample = () => {
    const parsed = parseCSV(sampleCsv());
    addDataset(workspaceId, "Sample run", parsed);
  };

  if (compact) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-sm border border-zinc-700 bg-zinc-900/70 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-orange-500/60 hover:text-orange-300"
        >
          <IconUpload className="h-4 w-4" width={16} height={16} />
          Import CSV
        </button>
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
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
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
        className={`grid-bg flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed px-8 py-16 text-center transition-colors ${
          dragging
            ? "border-orange-500 bg-orange-500/10"
            : "border-zinc-700 bg-zinc-900/30 hover:border-orange-500/60 hover:bg-orange-500/5"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-orange-500/10 text-orange-300 ring-1 ring-inset ring-orange-500/30">
          <IconUpload className="h-7 w-7" width={28} height={28} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-zinc-100">
          Add data to this workspace
        </h3>
        <p className="mt-1 max-w-md text-sm text-zinc-400">
          Drag and drop a CSV file here, or click to browse. Columns and types
          are detected automatically.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="rounded-sm bg-orange-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-8px_rgba(249,115,22,0.9)]">
            Choose file
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadSample();
            }}
            className="rounded-sm border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Load sample dataset
          </button>
        </div>
        {error && (
          <p className="mt-4 text-sm font-medium text-rose-400">{error}</p>
        )}
      </div>

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

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <IconLink className="h-4 w-4" width={16} height={16} />
          Or connect a source
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
            Soon
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CONNECTORS.map((c) => (
            <div
              key={c.name}
              className="cursor-not-allowed rounded-sm border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 opacity-70"
            >
              <div className="text-sm font-medium text-zinc-300">{c.name}</div>
              <div className="text-xs text-zinc-500">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
