/*
 * Data hook + provider — the heart of the app's state management.
 *
 * Wraps the StorageAdapter (Phase 1: localStorage; Phase 2 will be an API)
 * and exposes:
 *   - the current array of lists,
 *   - the items in the currently-active list,
 *   - which list is active,
 *   - which items the user has multi-selected (for bulk delete),
 *   - a full set of action functions that mutate data.
 *
 * Components call `useLists()` to read state and dispatch actions. They never
 * touch the adapter directly — that means swapping the adapter (Phase 2) does
 * not require any UI changes.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStorageAdapter } from "@/lib/storage";
import type { Item, List } from "@/lib/storage/types";

type DataContextValue = {
  // ---- State ----
  lists: List[];
  items: Item[];
  activeListId: string | null;
  selectedItemIds: Set<string>;
  loading: boolean;

  // ---- List actions ----
  selectList: (id: string) => void;
  createList: (name: string) => Promise<List>;
  renameList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;

  // ---- Item actions ----
  addItem: (text: string) => Promise<void>;
  updateItemText: (id: string, text: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  deleteAllItems: () => Promise<void>;
  reorderItems: (orderedIds: string[]) => Promise<void>;

  // ---- Multi-select actions ----
  toggleItemSelected: (id: string) => void;
  clearSelection: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

const adapter = getStorageAdapter();

export function DataProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<List[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  // ---- Initial load ----
  // localStorage is only available in the browser, so this effect runs after
  // mount. We pull lists, then auto-select the first one (if any) and load
  // its items. After this, `loading` flips to false and the UI renders.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadedLists = await adapter.getLists();
      if (cancelled) return;
      setLists(loadedLists);
      const first = loadedLists[0]?.id ?? null;
      setActiveListId(first);
      if (first) {
        const loadedItems = await adapter.getItems(first);
        if (cancelled) return;
        setItems(loadedItems);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Whenever the active list changes, reload its items and clear selection.
  // We don't reload on every list mutation — actions that change items also
  // update local state in lock-step.
  useEffect(() => {
    if (!activeListId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const loadedItems = await adapter.getItems(activeListId);
      if (!cancelled) {
        setItems(loadedItems);
        setSelectedItemIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeListId]);

  // ---- List actions ----

  const selectList = useCallback((id: string) => setActiveListId(id), []);

  const createList = useCallback(async (name: string) => {
    const list = await adapter.createList(name);
    setLists((prev) => [...prev, list]);
    setActiveListId(list.id);
    return list;
  }, []);

  const renameList = useCallback(async (id: string, name: string) => {
    await adapter.renameList(id, name);
    setLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)),
    );
  }, []);

  const deleteList = useCallback(
    async (id: string) => {
      await adapter.deleteList(id);
      setLists((prev) => {
        const next = prev.filter((l) => l.id !== id);
        // If we deleted the active list, fall back to the first remaining one.
        if (activeListId === id) {
          setActiveListId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeListId],
  );

  // ---- Item actions ----

  const addItem = useCallback(
    async (text: string) => {
      if (!activeListId || !text.trim()) return;
      const item = await adapter.createItem(activeListId, text);
      setItems((prev) => [...prev, item]);
    },
    [activeListId],
  );

  const updateItemText = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await adapter.updateItem(id, { text: trimmed });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, text: trimmed } : i)),
    );
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    // Compute the new value from current state, then persist it.
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      const next = !target.completed;
      // Fire-and-forget the adapter call. If it fails, we'd revert state in a
      // real production app — here, localStorage doesn't fail.
      adapter.updateItem(id, { completed: next });
      return prev.map((i) => (i.id === id ? { ...i, completed: next } : i));
    });
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await adapter.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItemIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const deleteItems = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await adapter.deleteItems(ids);
    const idSet = new Set(ids);
    setItems((prev) => prev.filter((i) => !idSet.has(i.id)));
    setSelectedItemIds(new Set());
  }, []);

  const deleteAllItems = useCallback(async () => {
    if (!activeListId) return;
    await adapter.deleteAllItems(activeListId);
    setItems([]);
    setSelectedItemIds(new Set());
  }, [activeListId]);

  const reorderItems = useCallback(
    async (orderedIds: string[]) => {
      if (!activeListId) return;
      // Update local state immediately (snappy UX) then persist.
      setItems((prev) => {
        const indexOf = new Map(orderedIds.map((id, i) => [id, i]));
        const sorted = [...prev].sort(
          (a, b) =>
            (indexOf.get(a.id) ?? Infinity) - (indexOf.get(b.id) ?? Infinity),
        );
        return sorted.map((item, idx) => ({ ...item, position: idx }));
      });
      await adapter.reorderItems(activeListId, orderedIds);
    },
    [activeListId],
  );

  // ---- Multi-select ----

  const toggleItemSelected = useCallback((id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  // useMemo prevents creating a new context object on every render, which would
  // re-render every consumer unnecessarily. Each dependency is a stable callback
  // or a piece of state we actually want to track.
  const value = useMemo<DataContextValue>(
    () => ({
      lists,
      items,
      activeListId,
      selectedItemIds,
      loading,
      selectList,
      createList,
      renameList,
      deleteList,
      addItem,
      updateItemText,
      toggleComplete,
      deleteItem,
      deleteItems,
      deleteAllItems,
      reorderItems,
      toggleItemSelected,
      clearSelection,
    }),
    [
      lists,
      items,
      activeListId,
      selectedItemIds,
      loading,
      selectList,
      createList,
      renameList,
      deleteList,
      addItem,
      updateItemText,
      toggleComplete,
      deleteItem,
      deleteItems,
      deleteAllItems,
      reorderItems,
      toggleItemSelected,
      clearSelection,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/** Hook every component uses to read/mutate app data. */
export function useLists(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useLists must be used inside <DataProvider>");
  }
  return ctx;
}
