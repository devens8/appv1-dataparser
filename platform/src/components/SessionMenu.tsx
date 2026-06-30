"use client";

import { useState } from "react";
import { ROLES, useSessionStore, type Role } from "@/store/session";
import FeedbackModal from "@/components/FeedbackModal";
import { IconMessage, IconShield, IconUser } from "@/components/icons";

const ROLE_ORDER: Role[] = ["viewer", "analyst", "admin"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SessionMenu() {
  const name = useSessionStore((s) => s.name);
  const role = useSessionStore((s) => s.role);
  const hydrated = useSessionStore((s) => s.hydrated);
  const setName = useSessionStore((s) => s.setName);
  const setRole = useSessionStore((s) => s.setRole);

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);

  const r = ROLES[role];

  return (
    <div className="border-t border-slate-800/80 p-3">
      {open && (
        <div className="animate-fade-in mb-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Display name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          <div className="mt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Clearance
            </span>
            <div className="mt-1 space-y-1">
              {ROLE_ORDER.map((role_) => {
                const meta = ROLES[role_];
                const sel = role === role_;
                return (
                  <button
                    key={role_}
                    onClick={() => setRole(role_)}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                      sel
                        ? "bg-sky-500/10 ring-1 ring-inset ring-sky-500/30"
                        : "hover:bg-slate-800/60"
                    }`}
                  >
                    <IconShield
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        sel ? "text-sky-400" : "text-slate-500"
                      }`}
                      width={14}
                      height={14}
                    />
                    <span className="leading-tight">
                      <span
                        className={`block text-xs font-medium ${
                          sel ? "text-sky-200" : "text-slate-300"
                        }`}
                      >
                        {meta.label}
                        <span className="ml-1.5 text-[9px] font-normal text-slate-500">
                          L{meta.clearance}
                        </span>
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {meta.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setFeedback(true);
              setOpen(false);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            <IconMessage className="h-3.5 w-3.5" width={14} height={14} />
            Give feedback
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-800/40"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500/80 to-indigo-500/80 text-xs font-semibold text-white ring-1 ring-slate-700">
          {hydrated ? initials(name) : <IconUser className="h-4 w-4" width={16} height={16} />}
        </div>
        <div className="min-w-0 flex-1 text-left leading-tight">
          <div className="truncate text-xs font-medium text-slate-200">
            {hydrated ? name : "Lab user"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <IconShield className="h-3 w-3" width={12} height={12} />
            {r.label} · L{r.clearance}
          </div>
        </div>
      </button>

      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}
    </div>
  );
}
