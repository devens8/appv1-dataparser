"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/types";
import type { Analysis } from "@/lib/analysis";
import { Badge, Field, Segmented, Select } from "@/components/ui";
import { numericColumns } from "@/lib/dataset";
import { useWorkspaceStore } from "@/store/workspaces";
import {
  TRANSFORMS,
  applyTransform,
  columnPerRow,
  evaluateFormula,
  toCellValues,
} from "@/lib/formula";
import { fmt } from "@/lib/format";
import { IconClose, IconCurve, IconPlus } from "@/components/icons";

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

type Mode = "transform" | "formula";

export default function DataView({
  dataset,
  analysis,
  workspaceId,
}: {
  dataset: Dataset;
  analysis: Analysis;
  workspaceId: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [building, setBuilding] = useState(false);
  const limit = showAll ? dataset.rows.length : 100;
  const visible = dataset.rows.slice(0, limit);

  const activeCols = new Set(
    [analysis.xCol?.index, analysis.yCol?.index].filter(
      (i): i is number => i != null,
    ),
  );

  return (
    <div className="animate-fade-in space-y-3">
      {building && (
        <FormulaBuilder
          dataset={dataset}
          workspaceId={workspaceId}
          onClose={() => setBuilding(false)}
        />
      )}

      <div className="surface glow overflow-hidden rounded-sm">
        <div className="flex items-center justify-between border-b border-line/80 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-fgmuted">
            <span className="font-semibold text-fg">{dataset.name}</span>
            <span className="text-fgsubtle">·</span>
            <span className="tabular">
              {dataset.rows.length.toLocaleString()} rows ×{" "}
              {dataset.columns.length} cols
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dataset.rows.length > 100 && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="text-xs font-medium text-accent hover:text-accent"
              >
                {showAll ? "Show first 100" : `Show all ${dataset.rows.length}`}
              </button>
            )}
            <button
              onClick={() => setBuilding((b) => !b)}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                building
                  ? "border-orange-500/40 bg-orange-500/15 text-accent"
                  : "border-line bg-panel/60 text-fg hover:border-orange-500/50 hover:text-accent"
              }`}
            >
              <IconCurve className="h-3.5 w-3.5" width={14} height={14} />
              Add column · f(x)
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-300px)] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20">
              {/* Spreadsheet letter row */}
              <tr className="bg-base/95 backdrop-blur">
                <th className="sticky left-0 z-30 w-12 border-b border-r border-line bg-base/95 px-2 py-1 text-[10px] font-medium text-fgsubtle" />
                {dataset.columns.map((c) => (
                  <th
                    key={`l-${c.index}`}
                    className={`border-b border-r border-line px-3 py-1 text-center text-[10px] font-medium ${
                      activeCols.has(c.index)
                        ? "bg-orange-500/10 text-accent"
                        : "text-fgsubtle"
                    }`}
                  >
                    {colRef(c.index)}
                  </th>
                ))}
              </tr>
              {/* Column names + types */}
              <tr className="bg-panel/95 backdrop-blur">
                <th className="sticky left-0 z-30 border-b border-r border-line bg-panel/95 px-2 py-2 text-[11px] font-semibold text-fgsubtle">
                  #
                </th>
                {dataset.columns.map((c) => (
                  <th
                    key={c.index}
                    className={`group/col whitespace-nowrap border-b border-r border-line px-3 py-2 text-left ${
                      activeCols.has(c.index) ? "bg-orange-500/[0.07]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">
                        {c.name}
                      </span>
                      {c.computed ? (
                        <Badge tone="amber">fx</Badge>
                      ) : (
                        <Badge tone={typeTone[c.type]}>{c.type}</Badge>
                      )}
                      {c.computed && (
                        <button
                          onClick={() =>
                            useWorkspaceStore
                              .getState()
                              .removeColumn(workspaceId, dataset.id, c.index)
                          }
                          title={`Remove derived column “${c.name}”`}
                          className="rounded-sm p-0.5 text-fgsubtle opacity-0 transition-colors hover:bg-red-500/10 hover:text-red-400 group-hover/col:opacity-100"
                        >
                          <IconClose className="h-3 w-3" width={12} height={12} />
                        </button>
                      )}
                    </div>
                    {c.computed && c.formula && (
                      <div className="mt-0.5 font-mono text-[9px] font-normal text-fgsubtle">
                        {c.formula}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, ri) => (
                <tr key={ri} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-line/70 bg-base/80 px-2 py-1.5 text-right text-[11px] tabular text-fgsubtle group-hover:text-fgmuted">
                    {ri + 1}
                  </td>
                  {dataset.columns.map((c) => (
                    <td
                      key={c.index}
                      className={`tabular border-b border-r border-line/50 px-3 py-1.5 group-hover:bg-panel2/30 ${
                        activeCols.has(c.index) ? "bg-orange-500/[0.04]" : ""
                      } ${
                        c.type === "number"
                          ? "text-right text-fg"
                          : "text-fgmuted"
                      }`}
                    >
                      {row[c.index] == null ? (
                        <span className="text-fgsubtle">—</span>
                      ) : c.type === "number" && typeof row[c.index] === "number" ? (
                        fmt(row[c.index] as number)
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
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * F(x) derived-column builder.
 * ------------------------------------------------------------------ */

function FormulaBuilder({
  dataset,
  workspaceId,
  onClose,
}: {
  dataset: Dataset;
  workspaceId: string;
  onClose: () => void;
}) {
  const addComputedColumn = useWorkspaceStore((s) => s.addComputedColumn);
  const numCols = numericColumns(dataset);

  const [mode, setMode] = useState<Mode>("transform");
  const [srcCol, setSrcCol] = useState(numCols[0]?.name ?? "");
  const [transformId, setTransformId] = useState(TRANSFORMS[0].id);
  const [expr, setExpr] = useState("");
  const [name, setName] = useState("");

  const transform = TRANSFORMS.find((t) => t.id === transformId) ?? TRANSFORMS[0];
  const defaultName =
    mode === "transform" ? `${srcCol}${transform.suffix}` : "f(x)";

  // Live preview of the derived values.
  const preview = useMemo(() => {
    if (mode === "transform") {
      if (!srcCol) return { values: [] as (number | null)[] };
      return { values: applyTransform(columnPerRow(dataset, srcCol), transformId) };
    }
    const r = evaluateFormula(dataset, expr);
    return { values: r.values, error: r.error };
  }, [mode, srcCol, transformId, expr, dataset]);

  const previewStr = preview.values
    .slice(0, 5)
    .map((v) => (v == null ? "—" : fmt(v)))
    .join(", ");

  const canCreate =
    (mode === "transform" && !!srcCol) ||
    (mode === "formula" && !!expr.trim() && !preview.error);

  const create = () => {
    if (!canCreate) return;
    const finalName = (name.trim() || defaultName).trim();
    const formulaStr =
      mode === "transform" ? `${transformId}(${srcCol})` : expr.trim();
    addComputedColumn(
      workspaceId,
      dataset.id,
      finalName,
      toCellValues(preview.values),
      formulaStr,
    );
    onClose();
  };

  return (
    <section className="surface glow rounded-sm">
      <header className="flex items-center justify-between border-b border-line/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <IconCurve className="h-4 w-4 text-accent" width={16} height={16} />
          <h3 className="text-[13px] font-semibold text-fg">
            New derived column
          </h3>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "transform", label: "Transform" },
            { value: "formula", label: "Formula" },
          ]}
        />
      </header>

      <div className="p-4">
        {mode === "transform" ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Source column">
              <Select value={srcCol} onChange={setSrcCol}>
                {numCols.map((c) => (
                  <option key={c.index} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transform">
              <Select value={transformId} onChange={setTransformId}>
                {TRANSFORMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="New column name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
                className="rounded-sm border border-line bg-panel/80 px-3 py-1.5 text-sm text-fg outline-none focus:border-orange-500"
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="New column name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="f(x)"
                  className="rounded-sm border border-line bg-panel/80 px-3 py-1.5 text-sm text-fg outline-none focus:border-orange-500"
                />
              </Field>
              <div className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                  Expression
                </span>
                <input
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  placeholder="e.g.  log10({dose})   or   {signal} / {baseline}"
                  className="w-full rounded-sm border border-line bg-panel/80 px-3 py-1.5 font-mono text-sm text-fg outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-fgsubtle">
                Insert:
              </span>
              {dataset.columns.map((c) => (
                <button
                  key={c.index}
                  onClick={() => setExpr((e) => `${e}{${c.name}}`)}
                  className="rounded-sm border border-line bg-panel/60 px-1.5 py-0.5 font-mono text-[10px] text-fgmuted hover:border-orange-500/50 hover:text-accent"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview + actions */}
        <div className="mt-3 flex items-end justify-between gap-4 border-t border-line/60 pt-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
              Preview
            </div>
            {preview.error ? (
              <p className="mt-0.5 text-[12px] text-red-400">{preview.error}</p>
            ) : (
              <p className="tabular mt-0.5 truncate text-[12px] text-fgmuted">
                {previewStr || "—"}
                <span className="text-fgsubtle"> …</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-sm border border-line bg-panel/60 px-3 py-1.5 text-xs font-medium text-fgmuted hover:text-fg"
            >
              Cancel
            </button>
            <button
              onClick={create}
              disabled={!canCreate}
              className="flex items-center gap-1.5 rounded-sm border border-orange-500/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-orange-500/25 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPlus className="h-3.5 w-3.5" width={14} height={14} />
              Create column
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
