"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NewWorkspaceModal from "@/components/NewWorkspaceModal";
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
          <header className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Workspaces
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Organise datasets and analyses. Open a workspace to import data
                and run tools.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <IconPlus className="h-4 w-4" width={16} height={16} />
              New workspace
            </button>
          </header>

          {!hydrated ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState onCreate={() => setModalOpen(true)} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setModalOpen(true)}
                className="group flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-400 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-indigo-100">
                  <IconPlus className="h-5 w-5" width={20} height={20} />
                </div>
                <span className="text-sm font-medium">New workspace</span>
              </button>

              {sorted.map((w) => {
                const a = accent(w.color);
                return (
                  <div
                    key={w.id}
                    onClick={() => router.push(`/workspace/${w.id}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${a.gradient}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.bgSoft} ${a.text}`}
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
                          className="rounded-md p-1.5 text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                          aria-label="Delete workspace"
                        >
                          <IconTrash
                            className="h-4 w-4"
                            width={16}
                            height={16}
                          />
                        </button>
                      </div>

                      <h3 className="mt-4 truncate font-semibold text-slate-800">
                        {w.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 h-9 text-sm text-slate-500">
                        {w.description || "No description"}
                      </p>

                      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
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
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <IconGrid className="h-7 w-7" width={28} height={28} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-800">
        Create your first workspace
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Workspaces keep your experiments organised. Add a CSV, then explore
        statistics, outliers, trends and visualizations.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
      >
        <IconPlus className="h-4 w-4" width={16} height={16} />
        New workspace
      </button>
    </div>
  );
}
