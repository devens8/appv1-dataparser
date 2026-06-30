import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dataset, Workspace } from "@/types";
import type { ParsedCsv } from "@/lib/csv";

export const WORKSPACE_COLORS = [
  "indigo",
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
  "teal",
  "fuchsia",
] as const;

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface WorkspaceState {
  workspaces: Workspace[];
  hydrated: boolean;
  setHydrated: () => void;

  createWorkspace: (name: string, description?: string) => string;
  renameWorkspace: (id: string, name: string, description?: string) => void;
  deleteWorkspace: (id: string) => void;

  addDataset: (workspaceId: string, name: string, parsed: ParsedCsv) => string;
  removeDataset: (workspaceId: string, datasetId: string) => void;
  setActiveDataset: (workspaceId: string, datasetId: string) => void;

  getWorkspace: (id: string) => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      createWorkspace: (name, description = "") => {
        const id = uid();
        const now = Date.now();
        const color =
          WORKSPACE_COLORS[get().workspaces.length % WORKSPACE_COLORS.length];
        const ws: Workspace = {
          id,
          name: name.trim() || "Untitled workspace",
          description,
          color,
          createdAt: now,
          updatedAt: now,
          datasets: [],
          activeDatasetId: null,
        };
        set((s) => ({ workspaces: [ws, ...s.workspaces] }));
        return id;
      },

      renameWorkspace: (id, name, description) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  name: name.trim() || w.name,
                  description: description ?? w.description,
                  updatedAt: Date.now(),
                }
              : w,
          ),
        })),

      deleteWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
        })),

      addDataset: (workspaceId, name, parsed) => {
        const datasetId = uid();
        const dataset: Dataset = {
          id: datasetId,
          name,
          createdAt: Date.now(),
          columns: parsed.columns,
          rows: parsed.rows,
        };
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  datasets: [...w.datasets, dataset],
                  activeDatasetId: datasetId,
                  updatedAt: Date.now(),
                }
              : w,
          ),
        }));
        return datasetId;
      },

      removeDataset: (workspaceId, datasetId) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            const datasets = w.datasets.filter((d) => d.id !== datasetId);
            const activeDatasetId =
              w.activeDatasetId === datasetId
                ? (datasets[datasets.length - 1]?.id ?? null)
                : w.activeDatasetId;
            return { ...w, datasets, activeDatasetId, updatedAt: Date.now() };
          }),
        })),

      setActiveDataset: (workspaceId, datasetId) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId ? { ...w, activeDatasetId: datasetId } : w,
          ),
        })),

      getWorkspace: (id) => get().workspaces.find((w) => w.id === id),
    }),
    {
      name: "strata-workspaces",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
