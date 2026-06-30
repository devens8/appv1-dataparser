import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CellValue, Column, Dataset, Workspace } from "@/types";
import type { ParsedCsv } from "@/lib/csv";
import { idbStorage } from "@/lib/idbStorage";

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

  /** Append a derived numeric column (F(x)) to a dataset. */
  addComputedColumn: (
    workspaceId: string,
    datasetId: string,
    name: string,
    values: CellValue[],
    formula: string,
  ) => void;
  /** Remove a column by index, re-indexing the rest. */
  removeColumn: (
    workspaceId: string,
    datasetId: string,
    columnIndex: number,
  ) => void;

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

      addComputedColumn: (workspaceId, datasetId, name, values, formula) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            return {
              ...w,
              updatedAt: Date.now(),
              datasets: w.datasets.map((d) => {
                if (d.id !== datasetId) return d;
                // Ensure a unique column name.
                const existing = new Set(d.columns.map((c) => c.name));
                let finalName = name.trim() || "f(x)";
                let n = 2;
                while (existing.has(finalName)) finalName = `${name} ${n++}`;
                const newIndex = d.columns.length;
                const column: Column = {
                  name: finalName,
                  index: newIndex,
                  type: "number",
                  computed: true,
                  formula,
                };
                return {
                  ...d,
                  columns: [...d.columns, column],
                  rows: d.rows.map((r, ri) => [...r, values[ri] ?? null]),
                };
              }),
            };
          }),
        })),

      removeColumn: (workspaceId, datasetId, columnIndex) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            return {
              ...w,
              updatedAt: Date.now(),
              datasets: w.datasets.map((d) => {
                if (d.id !== datasetId) return d;
                const columns = d.columns
                  .filter((c) => c.index !== columnIndex)
                  .map((c, i) => ({ ...c, index: i }));
                const rows = d.rows.map((r) =>
                  r.filter((_, i) => i !== columnIndex),
                );
                return { ...d, columns, rows };
              }),
            };
          }),
        })),

      getWorkspace: (id) => get().workspaces.find((w) => w.id === id),
    }),
    {
      name: "strata-workspaces",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      // Don't persist the transient hydration flag.
      partialize: (s) => ({ workspaces: s.workspaces }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
