"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NewWorkspaceModal from "@/components/NewWorkspaceModal";
import AiInsights from "@/components/AiInsights";
import { useWorkspaceStore } from "@/store/workspaces";
import { accent } from "@/lib/colors";
import { relativeTime } from "@/lib/format";
import {
  IconGrid,
  IconLayers,
  IconPlus,
  IconTable,
  IconTrash,
} from "@/components/icons";

export default function HomePage() {
  const router = useRouter();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreate = (name: string, description: string) => {
    const id = createWorkspace(name, description);
    setModalOpen(false);
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <header className="animate-fade-in-up flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                Workspaces
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Organise datasets and analyses. Open a workspace to import data
                and run tools.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-sm bg-orange-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_rgba(249,115,22,0.9)] transition-all hover:bg-orange-400"
            >
              <IconPlus className="h-4 w-4" width={16} height={16} />
              New workspace
            </button>
          </header>

          <div className="mt-6">
            <AiInsights />
          </div>

          <div className="mt-10 mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Your workspaces
          </div>

          {!hydrated ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-44 rounded-sm" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState onCreate={() => setModalOpen(true)} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setModalOpen(true)}
                className="group flex min-h-44 flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-zinc-700 bg-zinc-900/30 text-zinc-500 transition-colors hover:border-orange-500/60 hover:bg-orange-500/5 hover:text-orange-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800/60 transition-colors group-hover:bg-orange-500/15">
                  <IconPlus className="h-5 w-5" width={20} height={20} />
                </div>
                <span className="text-sm font-medium">New workspace</span>
              </button>

              {sorted.map((w, i) => {
                const a = accent(w.color);
                return (
                  <div
                    key={w.id}
                    onClick={() => router.push(`/workspace/${w.id}`)}
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    className="surface group animate-fade-in-up relative cursor-pointer overflow-hidden rounded-sm transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-glow"
                  >
                    <div className={`h-1 bg-gradient-to-r ${a.gradient}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-sm ring-1 ring-inset ${a.bgSoft} ${a.text} ${a.ring}`}
                        >
                          <IconTable
                            className="h-5 w-5"
                            width={20}
                            height={20}
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete workspace "${w.name}"?`))
                              deleteWorkspace(w.id);
                          }}
                          className="rounded-sm p-1.5 text-zinc-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                          aria-label="Delete workspace"
                        >
                          <IconTrash
                            className="h-4 w-4"
                            width={16}
                            height={16}
                          />
                        </button>
                      </div>

                      <h3 className="mt-4 truncate font-semibold text-zinc-100">
                        {w.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 h-9 text-sm text-zinc-400">
                        {w.description || "No description"}
                      </p>

                      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <IconLayers
                            className="h-3.5 w-3.5"
                            width={14}
                            height={14}
                          />
                          {w.datasets.length}{" "}
                          {w.datasets.length === 1 ? "dataset" : "datasets"}
                        </span>
                        <span>·</span>
                        <span>{relativeTime(w.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <NewWorkspaceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid-bg animate-fade-in-up mt-10 flex flex-col items-center justify-center rounded-sm border border-dashed border-zinc-700 bg-zinc-900/30 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-orange-500/10 text-orange-300 ring-1 ring-inset ring-orange-500/30">
        <IconGrid className="h-7 w-7" width={28} height={28} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-zinc-100">
        Create your first workspace
      </h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-400">
        Workspaces keep your experiments organised. Add a CSV, then explore
        statistics, outliers, trends and visualizations.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 flex items-center gap-2 rounded-sm bg-orange-500/90 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_rgba(249,115,22,0.9)] transition-all hover:bg-orange-400"
      >
        <IconPlus className="h-4 w-4" width={16} height={16} />
        New workspace
      </button>
    </div>
  );
}
