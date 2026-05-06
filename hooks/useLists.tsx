/*
 * Data hook + provider — the heart of the app's state management.
 *
 * Wraps the StorageAdapter (Phase 1: localStorage; Phase 2 will be an API)
 * and exposes:
 *   - the array of lists,
 *   - items for the active list (derived from a per-list cache),
 *   - per-list stats (total / completed / isComplete) for the sidebar,
 *   - which list is active,
 *   - sidebar select-mode state (so the user can multi-delete lists),
 *   - a full set of action functions that mutate data.
 *
 * Components call `useLists()` to read state and dispatch actions. They never
 * touch the adapter directly — that means swapping the adapter (Phase 2) does
 * not require any UI changes.
 *
 * Why store ALL items in memory (itemsByList) instead of just the active list:
 * we need per-list completion stats for the sidebar (a list is "complete" when
 * it has items and they're all done). Loading everything is fine for Phase 1
 * (localStorage is fast and the dataset is small). In Phase 2 we'd replace
 * `getAllItemsByList()` with a SQL aggregate that just returns counts.
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

/** Stats for a single list — derived from items. */
export type ListStats = {
  total: number;
  completed: number;
  /** True only when total > 0 and every item is completed. */
  isComplete: boolean;
};

type DataContextValue = {
  // ---- State ----
  lists: List[];
  /** Items in the currently active list, sorted by position. */
  items: Item[];
  activeListId: string | null;
  /** listId -> { total, completed, isComplete }. */
  listStats: Record<string, ListStats>;
  loading: boolean;

  // ---- Sidebar list-select mode ----
  listSelectMode: boolean;
  selectedListIds: Set<string>;
  enterListSelectMode: () => void;
  exitListSelectMode: () => void;
  toggleListSelected: (id: string) => void;
  selectAllLists: () => void;
  deleteSelectedLists: () => Promise<void>;
  /** Bulk-delete every list that is fully completed (items > 0 and all done). */
  deleteCompletedLists: () => Promise<void>;

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
  /** Delete every completed item in the active list. */
  deleteCompletedItems: () => Promise<void>;
  /** Delete every item in the active list. */
  deleteAllItems: () => Promise<void>;
  reorderItems: (orderedIds: string[]) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

const adapter = getStorageAdapter();

export function DataProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<List[]>([]);
  const [itemsByList, setItemsByList] = useState<Record<string, Item[]>>({});
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // List multi-select (sidebar) state.
  const [listSelectMode, setListSelectMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set(),
  );

  // ---- Initial load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedLists, loadedItems] = await Promise.all([
        adapter.getLists(),
        adapter.getAllItemsByList(),
      ]);
      if (cancelled) return;
      setLists(loadedLists);
      setItemsByList(loadedItems);
      setActiveListId(loadedLists[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Derived values ----

  const items = useMemo<Item[]>(
    () => (activeListId ? (itemsByList[activeListId] ?? []) : []),
    [activeListId, itemsByList],
  );

  const listStats = useMemo<Record<string, ListStats>>(() => {
    const out: Record<string, ListStats> = {};
    for (const list of lists) {
      const li = itemsByList[list.id] ?? [];
      const total = li.length;
      const completed = li.reduce((c, i) => (i.completed ? c + 1 : c), 0);
      out[list.id] = {
        total,
        completed,
        isComplete: total > 0 && completed === total,
      };
    }
    return out;
  }, [lists, itemsByList]);

  // ---- List actions ----

  const selectList = useCallback((id: string) => setActiveListId(id), []);

  const createList = useCallback(async (name: string) => {
    const list = await adapter.createList(name);
    setLists((prev) => [...prev, list]);
    setItemsByList((prev) => ({ ...prev, [list.id]: [] }));
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
        if (activeListId === id) {
          setActiveListId(next[0]?.id ?? null);
        }
        return next;
      });
      setItemsByList((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeListId],
  );

  // ---- Sidebar list-select mode ----

  const enterListSelectMode = useCallback(() => {
    setListSelectMode(true);
    setSelectedListIds(new Set());
  }, []);

  const exitListSelectMode = useCallback(() => {
    setListSelectMode(false);
    setSelectedListIds(new Set());
  }, []);

  const toggleListSelected = useCallback((id: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllLists = useCallback(() => {
    setSelectedListIds((prev) => {
      // If everything is already selected, deselect everything (toggle behavior).
      if (prev.size === lists.length) return new Set();
      return new Set(lists.map((l) => l.id));
    });
  }, [lists]);

  /**
   * Shared cleanup: removes a set of list IDs from `lists` and `itemsByList`,
   * and falls back to a sensible active list. Used by both `deleteSelectedLists`
   * and `deleteCompletedLists` to keep their behavior identical.
   */
  const removeListsFromState = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setLists((prev) => {
        const next = prev.filter((l) => !idSet.has(l.id));
        if (activeListId && idSet.has(activeListId)) {
          setActiveListId(next[0]?.id ?? null);
        }
        return next;
      });
      setItemsByList((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setSelectedListIds(new Set());
      setListSelectMode(false);
    },
    [activeListId],
  );

  const deleteSelectedLists = useCallback(async () => {
    const ids = Array.from(selectedListIds);
    if (ids.length === 0) return;
    await adapter.deleteLists(ids);
    removeListsFromState(ids);
  }, [selectedListIds, removeListsFromState]);

  const deleteCompletedLists = useCallback(async () => {
    // Build the list of IDs by reading current stats — does NOT depend on the
    // user's manual selection, so they can wipe completed lists in one click.
    const ids = lists
      .filter((l) => listStats[l.id]?.isComplete)
      .map((l) => l.id);
    if (ids.length === 0) return;
    await adapter.deleteLists(ids);
    removeListsFromState(ids);
  }, [lists, listStats, removeListsFromState]);

  // ---- Item actions ----

  const addItem = useCallback(
    async (text: string) => {
      if (!activeListId || !text.trim()) return;
      const item = await adapter.createItem(activeListId, text);
      setItemsByList((prev) => ({
        ...prev,
        [activeListId]: [...(prev[activeListId] ?? []), item],
      }));
    },
    [activeListId],
  );

  const updateItemText = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await adapter.updateItem(id, { text: trimmed });
    setItemsByList((prev) => {
      const next: Record<string, Item[]> = {};
      for (const [listId, list] of Object.entries(prev)) {
        next[listId] = list.map((i) =>
          i.id === id ? { ...i, text: trimmed } : i,
        );
      }
      return next;
    });
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    // Find the item to compute the new value, then persist + update state.
    setItemsByList((prev) => {
      const next: Record<string, Item[]> = {};
      let newValue: boolean | null = null;
      for (const [listId, list] of Object.entries(prev)) {
        next[listId] = list.map((i) => {
          if (i.id !== id) return i;
          newValue = !i.completed;
          return { ...i, completed: newValue };
        });
      }
      if (newValue !== null) {
        // Fire-and-forget. localStorage is sync; in Phase 2 we'd add error handling.
        adapter.updateItem(id, { completed: newValue });
      }
      return next;
    });
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await adapter.deleteItem(id);
    setItemsByList((prev) => {
      const next: Record<string, Item[]> = {};
      for (const [listId, list] of Object.entries(prev)) {
        next[listId] = list.filter((i) => i.id !== id);
      }
      return next;
    });
  }, []);

  const deleteCompletedItems = useCallback(async () => {
    if (!activeListId) return;
    await adapter.deleteCompletedItems(activeListId);
    setItemsByList((prev) => ({
      ...prev,
      [activeListId]: (prev[activeListId] ?? [])
        .filter((i) => !i.completed)
        // Re-pack positions to match the adapter.
        .map((i, idx) => ({ ...i, position: idx })),
    }));
  }, [activeListId]);

  const deleteAllItems = useCallback(async () => {
    if (!activeListId) return;
    await adapter.deleteAllItems(activeListId);
    setItemsByList((prev) => ({ ...prev, [activeListId]: [] }));
  }, [activeListId]);

  const reorderItems = useCallback(
    async (orderedIds: string[]) => {
      if (!activeListId) return;
      // Update local state immediately (snappy UX) then persist.
      setItemsByList((prev) => {
        const list = prev[activeListId] ?? [];
        const indexOf = new Map(orderedIds.map((id, i) => [id, i]));
        const sorted = [...list].sort(
          (a, b) =>
            (indexOf.get(a.id) ?? Infinity) - (indexOf.get(b.id) ?? Infinity),
        );
        return {
          ...prev,
          [activeListId]: sorted.map((item, idx) => ({ ...item, position: idx })),
        };
      });
      await adapter.reorderItems(activeListId, orderedIds);
    },
    [activeListId],
  );

  // useMemo prevents creating a new context object on every render, which would
  // re-render every consumer unnecessarily.
  const value = useMemo<DataContextValue>(
    () => ({
      lists,
      items,
      activeListId,
      listStats,
      loading,
      listSelectMode,
      selectedListIds,
      enterListSelectMode,
      exitListSelectMode,
      toggleListSelected,
      selectAllLists,
      deleteSelectedLists,
      deleteCompletedLists,
      selectList,
      createList,
      renameList,
      deleteList,
      addItem,
      updateItemText,
      toggleComplete,
      deleteItem,
      deleteCompletedItems,
      deleteAllItems,
      reorderItems,
    }),
    [
      lists,
      items,
      activeListId,
      listStats,
      loading,
      listSelectMode,
      selectedListIds,
      enterListSelectMode,
      exitListSelectMode,
      toggleListSelected,
      selectAllLists,
      deleteSelectedLists,
      deleteCompletedLists,
      selectList,
      createList,
      renameList,
      deleteList,
      addItem,
      updateItemText,
      toggleComplete,
      deleteItem,
      deleteCompletedItems,
      deleteAllItems,
      reorderItems,
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
