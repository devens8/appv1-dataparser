"use client";

import { useState } from "react";
import type { Dataset } from "@/types";
import { Badge, Panel } from "@/components/ui";

const typeTone = {
  number: "indigo",
  date: "amber",
  string: "slate",
} as const;

export default function DataTable({ dataset }: { dataset: Dataset }) {
  const [showAll, setShowAll] = useState(false);
  const limit = showAll ? dataset.rows.length : 50;
  const visible = dataset.rows.slice(0, limit);

  return (
    <Panel
      title="Data preview"
      subtitle={`${dataset.rows.length.toLocaleString()} rows × ${dataset.columns.length} columns`}
      actions={
        dataset.rows.length > 50 ? (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showAll ? "Show first 50" : `Show all ${dataset.rows.length}`}
          </button>
        ) : null
      }
    >
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-400">
                #
              </th>
              {dataset.columns.map((c) => (
                <th
                  key={c.index}
                  className="border-b border-slate-200 px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
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
              <tr key={ri} className="hover:bg-slate-50/70">
                <td className="border-b border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
                  {ri + 1}
                </td>
                {dataset.columns.map((c) => (
                  <td
                    key={c.index}
                    className={`tabular border-b border-slate-100 px-3 py-1.5 ${
                      c.type === "number"
                        ? "text-right text-slate-700"
                        : "text-slate-600"
                    }`}
                  >
                    {row[c.index] == null ? (
                      <span className="text-slate-300">—</span>
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
    </Panel>
  );
}
