"use client";

import { IconStats } from "@/components/icons";

export function NoNumeric() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <IconStats className="h-6 w-6" width={24} height={24} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">
        No numeric columns detected
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        This tool needs at least one numeric column. Check your data preview to
        confirm column types were detected correctly.
      </p>
    </div>
  );
}
