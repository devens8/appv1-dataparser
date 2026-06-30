"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

/** Sidebar + scrollable main content. Used by the workspaces & insights pages. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
