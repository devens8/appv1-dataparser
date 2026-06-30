import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Lab access model (v2). A local, single-session stand-in for real auth:
 * a clearance level gates who may export, edit data or delete records.
 * When the platform moves server-side this maps onto real RBAC.
 */
export type Role = "viewer" | "analyst" | "admin";

export const ROLES: Record<
  Role,
  { label: string; clearance: number; blurb: string }
> = {
  viewer: { label: "Viewer", clearance: 1, blurb: "Read-only access to data and analyses." },
  analyst: { label: "Analyst", clearance: 2, blurb: "Import data, run analyses and export reports." },
  admin: { label: "Admin", clearance: 3, blurb: "Full access including deleting datasets and workspaces." },
};

export type Permission = "export" | "edit" | "delete";

const REQUIRED: Record<Permission, number> = {
  export: 2,
  edit: 2,
  delete: 3,
};

interface SessionState {
  name: string;
  role: Role;
  hydrated: boolean;
  setHydrated: () => void;
  setName: (name: string) => void;
  setRole: (role: Role) => void;
  can: (perm: Permission) => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      name: "Lab user",
      role: "admin",
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setName: (name) => set({ name: name.trim() || "Lab user" }),
      setRole: (role) => set({ role }),
      can: (perm) => ROLES[get().role].clearance >= REQUIRED[perm],
    }),
    {
      name: "strata-session",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
