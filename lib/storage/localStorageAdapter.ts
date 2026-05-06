/*
 * LocalStorageAdapter — Phase 1 implementation of StorageAdapter.
 *
 * All data lives under a single localStorage key as one JSON blob:
 *   {
 *     lists: List[],
 *     itemsByList: { [listId]: Item[] }
 *   }
 *
 * Why one blob instead of one key per list?
 * - Atomic reads/writes. We never have to worry about partial state.
 * - Easier to serialize for the future "Sync to cloud" migration button.
 * - localStorage is fast enough for our scale (a few hundred items max).
 *
 * Methods are async (return Promises) even though localStorage is synchronous.
 * This is intentional: when we swap in the API adapter in Phase 2, the UI code
 * (which already awaits each call) won't need to change.
 */

import type { Item, List, StorageAdapter } from "./types";
import { newId } from "../id";

const STORAGE_KEY = "list-app:data:v1";

type Snapshot = {
  lists: List[];
  itemsByList: Record<string, Item[]>;
};

/** Read the whole snapshot from localStorage, or an empty default. */
function read(): Snapshot {
  // SSR safety: localStorage doesn't exist on the server. Our adapter is only
  // ever used in client components, but this guard keeps tests/SSR safe.
  if (typeof window === "undefined") {
    return { lists: [], itemsByList: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lists: [], itemsByList: {} };
    const parsed = JSON.parse(raw) as Snapshot;
    // Defensive: if the user edits localStorage manually, fall back gracefully.
    return {
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      itemsByList:
        parsed.itemsByList && typeof parsed.itemsByList === "object"
          ? parsed.itemsByList
          : {},
    };
  } catch {
    // Corrupt JSON — start fresh rather than crash the app.
    return { lists: [], itemsByList: {} };
  }
}

/** Write the whole snapshot back to localStorage. */
function write(snapshot: Snapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export const localStorageAdapter: StorageAdapter = {
  // ---- Lists ----

  async getLists() {
    const { lists } = read();
    return [...lists].sort((a, b) => a.createdAt - b.createdAt);
  },

  async createList(name) {
    const snap = read();
    const list: List = {
      id: newId(),
      name: name.trim() || "Untitled list",
      createdAt: Date.now(),
    };
    snap.lists.push(list);
    snap.itemsByList[list.id] = [];
    write(snap);
    return list;
  },

  async renameList(id, name) {
    const snap = read();
    const list = snap.lists.find((l) => l.id === id);
    if (!list) return;
    list.name = name.trim() || list.name;
    write(snap);
  },

  async deleteList(id) {
    const snap = read();
    snap.lists = snap.lists.filter((l) => l.id !== id);
    delete snap.itemsByList[id];
    write(snap);
  },

  async deleteLists(ids) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const snap = read();
    snap.lists = snap.lists.filter((l) => !idSet.has(l.id));
    for (const id of ids) delete snap.itemsByList[id];
    write(snap);
  },

  // ---- Items ----

  async getItems(listId) {
    const { itemsByList } = read();
    const items = itemsByList[listId] ?? [];
    return [...items].sort((a, b) => a.position - b.position);
  },

  async getAllItemsByList() {
    const { itemsByList } = read();
    // Return a shallow copy with each list's items sorted by position.
    const out: Record<string, Item[]> = {};
    for (const [listId, items] of Object.entries(itemsByList)) {
      out[listId] = [...items].sort((a, b) => a.position - b.position);
    }
    return out;
  },

  async createItem(listId, text) {
    const snap = read();
    const items = snap.itemsByList[listId] ?? [];
    const maxPos = items.reduce((m, i) => Math.max(m, i.position), -1);
    const item: Item = {
      id: newId(),
      listId,
      text: text.trim(),
      completed: false,
      position: maxPos + 1,
      createdAt: Date.now(),
    };
    items.push(item);
    snap.itemsByList[listId] = items;
    write(snap);
    return item;
  },

  async updateItem(id, patch) {
    const snap = read();
    for (const listId of Object.keys(snap.itemsByList)) {
      const items = snap.itemsByList[listId];
      const item = items.find((i) => i.id === id);
      if (item) {
        if (patch.text !== undefined) item.text = patch.text;
        if (patch.completed !== undefined) item.completed = patch.completed;
        write(snap);
        return;
      }
    }
  },

  async deleteItem(id) {
    const snap = read();
    for (const listId of Object.keys(snap.itemsByList)) {
      snap.itemsByList[listId] = snap.itemsByList[listId].filter(
        (i) => i.id !== id,
      );
    }
    write(snap);
  },

  async deleteAllItems(listId) {
    const snap = read();
    snap.itemsByList[listId] = [];
    write(snap);
  },

  async deleteCompletedItems(listId) {
    const snap = read();
    const items = snap.itemsByList[listId] ?? [];
    const remaining = items.filter((i) => !i.completed);
    // Re-pack positions so they stay contiguous after the gaps.
    remaining.forEach((item, idx) => {
      item.position = idx;
    });
    snap.itemsByList[listId] = remaining;
    write(snap);
  },

  async reorderItems(listId, orderedIds) {
    const snap = read();
    const items = snap.itemsByList[listId] ?? [];
    const indexOf = new Map(orderedIds.map((id, i) => [id, i]));
    items.sort((a, b) => {
      const ai = indexOf.get(a.id) ?? Infinity;
      const bi = indexOf.get(b.id) ?? Infinity;
      return ai - bi;
    });
    items.forEach((item, idx) => {
      item.position = idx;
    });
    snap.itemsByList[listId] = items;
    write(snap);
  },
};
