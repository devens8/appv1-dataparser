"use client";

import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`surface glow rounded-lg ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-slate-800/80 px-4 py-2.5">
          <div>
            {title && (
              <h3 className="text-[13px] font-semibold tracking-tight text-slate-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/** Single, compact stat (label over value) — used inside StatGrid, not boxed. */
export function StatGrid({
  items,
  cols = "grid-cols-2 sm:grid-cols-4",
}: {
  items: { label: string; value: ReactNode; hint?: string; accent?: string }[];
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} divide-x divide-y divide-slate-800/70`}>
      {items.map((it, i) => (
        <div key={i} className="px-3.5 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            {it.label}
          </div>
          <div
            className={`tabular mt-0.5 text-base font-semibold leading-none ${
              it.accent ?? "text-slate-100"
            }`}
          >
            {it.value}
          </div>
          {it.hint && (
            <div className="mt-0.5 text-[10px] text-slate-500">{it.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${className}`}
    >
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/70 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === o.value
              ? "bg-sky-500/15 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "indigo" | "sky" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-700/40 text-slate-300 ring-slate-600/40",
    indigo: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
    sky: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded ring-1 ring-inset px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
