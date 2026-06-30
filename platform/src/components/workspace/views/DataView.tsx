"use client";

import { useState } from "react";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { Badge } from "@/components/ui";

const typeTone = {
  number: "sky",
  date: "amber",
  string: "slate",
} as const;

/** Spreadsheet column reference (A, B, … Z, AA, …). */
function colRef(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export default function DataView({
  dataset,
  analysis,
}: {
  dataset: Dataset;
  analysis: Analysis;
}) {
  const [showAll, setShowAll] = useState(false);
  const limit = showAll ? dataset.rows.length : 100;
  const visible = dataset.rows.slice(0, limit);

  const activeCols = new Set(
    [analysis.xCol?.index, analysis.yCol?.index].filter(
      (i): i is number => i != null,
    ),
  );

  return (
    <div className="surface glow animate-fade-in overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{dataset.name}</span>
          <span className="text-slate-600">·</span>
          <span className="tabular">
            {dataset.rows.length.toLocaleString()} rows ×{" "}
            {dataset.columns.length} cols
          </span>
        </div>
        {dataset.rows.length > 100 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            {showAll ? "Show first 100" : `Show all ${dataset.rows.length}`}
          </button>
        )}
      </div>

      <div className="max-h-[calc(100vh-260px)] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            {/* Spreadsheet letter row */}
            <tr className="bg-slate-950/95 backdrop-blur">
              <th className="sticky left-0 z-30 w-12 border-b border-r border-slate-800 bg-slate-950/95 px-2 py-1 text-[10px] font-medium text-slate-600" />
              {dataset.columns.map((c) => (
                <th
                  key={`l-${c.index}`}
                  className={`border-b border-r border-slate-800 px-3 py-1 text-center text-[10px] font-medium ${
                    activeCols.has(c.index)
                      ? "bg-sky-500/10 text-sky-400"
                      : "text-slate-600"
                  }`}
                >
                  {colRef(c.index)}
                </th>
              ))}
            </tr>
            {/* Column names + types */}
            <tr className="bg-slate-900/95 backdrop-blur">
              <th className="sticky left-0 z-30 border-b border-r border-slate-800 bg-slate-900/95 px-2 py-2 text-[11px] font-semibold text-slate-600">
                #
              </th>
              {dataset.columns.map((c) => (
                <th
                  key={c.index}
                  className={`whitespace-nowrap border-b border-r border-slate-800 px-3 py-2 text-left ${
                    activeCols.has(c.index) ? "bg-sky-500/[0.07]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {c.name}
                    </span>
                    <Badge tone={typeTone[c.type]}>{c.type}</Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri} className="group">
                <td className="sticky left-0 z-10 border-b border-r border-slate-800/70 bg-slate-950/80 px-2 py-1.5 text-right text-[11px] tabular text-slate-600 group-hover:text-slate-400">
                  {ri + 1}
                </td>
                {dataset.columns.map((c) => (
                  <td
                    key={c.index}
                    className={`tabular border-b border-r border-slate-800/50 px-3 py-1.5 group-hover:bg-slate-800/30 ${
                      activeCols.has(c.index) ? "bg-sky-500/[0.04]" : ""
                    } ${
                      c.type === "number"
                        ? "text-right text-slate-200"
                        : "text-slate-300"
                    }`}
                  >
                    {row[c.index] == null ? (
                      <span className="text-slate-700">—</span>
                    ) : (
                      String(row[c.index])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
