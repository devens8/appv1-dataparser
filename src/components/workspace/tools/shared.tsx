"use client";

import { IconStats } from "@/components/icons";

export function NoNumeric() {
  return (
    <div className="grid-bg flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-panel/30 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-panel2/60 text-fgmuted">
        <IconStats className="h-6 w-6" width={24} height={24} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-fg">
        No numeric columns detected
      </h3>
      <p className="mt-1 max-w-sm text-sm text-fgmuted">
        This view needs at least one numeric column. Check the Data tab to
        confirm column types were detected correctly.
      </p>
    </div>
  );
}
