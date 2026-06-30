/**
 * A tiny IndexedDB-backed storage adapter for Zustand's `persist`. localStorage
 * caps out around 5 MB and silently throws once a real lab dataset is imported —
 * which looked like "my data isn't saved". IndexedDB has no practical size limit,
 * so workspaces (datasets + derived columns) survive reloads and navigation.
 *
 * Implements the StateStorage interface (getItem / setItem / removeItem).
 */

import type { StateStorage } from "zustand/middleware";

const DB_NAME = "strata";
const STORE = "kv";

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE);
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
  });
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await withStore<string | undefined>("readonly", (s) =>
        s.get(name),
      );
      return v ?? null;
    } catch {
      // Fall back to localStorage if IndexedDB is blocked (e.g. private mode).
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    }
  },
  setItem: async (name, value) => {
    try {
      await withStore("readwrite", (s) => s.put(value, name));
    } catch {
      try {
        localStorage.setItem(name, value);
      } catch {
        /* give up silently — nothing else we can do client-side */
      }
    }
  },
  removeItem: async (name) => {
    try {
      await withStore("readwrite", (s) => s.delete(name));
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* noop */
      }
    }
  },
};
