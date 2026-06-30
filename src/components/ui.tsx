"use client";

import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  title,
  subtitle,
  actions,
  fill = false,
  bodyClassName = "",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Make the panel a flex column whose body fills available height. */
  fill?: boolean;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`surface glow rounded-sm ${
        fill ? "flex min-h-0 flex-col" : ""
      } ${className}`}
    >
      {(title || actions) && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 px-3.5 py-2">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-[12px] font-semibold tracking-tight text-zinc-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </header>
      )}
      {fill ? (
        <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
      ) : (
        children
      )}
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
    <div className={`grid ${cols} divide-x divide-y divide-zinc-800/70`}>
      {items.map((it, i) => (
        <div key={i} className="px-3.5 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            {it.label}
          </div>
          <div
            className={`tabular mt-0.5 text-base font-semibold leading-none ${
              it.accent ?? "text-zinc-100"
            }`}
          >
            {it.value}
          </div>
          {it.hint && (
            <div className="mt-0.5 text-[10px] text-zinc-500">{it.hint}</div>
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
      className={`rounded-sm border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-200 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 ${className}`}
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
    <div className="inline-flex rounded-sm border border-zinc-800 bg-zinc-900/70 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-all ${
            value === o.value
              ? "bg-orange-500/15 text-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)]"
              : "text-zinc-400 hover:text-zinc-200"
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
    slate: "bg-zinc-700/40 text-zinc-300 ring-zinc-600/40",
    indigo: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    sky: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
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
