/*
 * Storage layer types and interface.
 *
 * This file defines the SHAPE of our data and the CONTRACT that any storage
 * implementation must fulfill. The UI never imports a specific implementation —
 * it imports this interface, and a provider injects whichever adapter is active.
 *
 * Phase 1: LocalStorageAdapter (data lives in window.localStorage)
 * Phase 2: ApiAdapter (same methods, calls /api/... endpoints, data lives in Postgres)
 *
 * Because every method returns a Promise, the UI doesn't need to change when we
 * swap from sync localStorage to async network calls.
 */

/** A single todo item. */
export type Item = {
  id: string;
  listId: string;
  text: string;
  completed: boolean;
  /** Smaller numbers come first. We rewrite all positions on reorder. */
  position: number;
  /** Unix milliseconds — useful for "created date" displays later. */
  createdAt: number;
};

/** A named collection of items (e.g., "Groceries", "Work tasks"). */
export type List = {
  id: string;
  name: string;
  createdAt: number;
};

/**
 * The contract every storage backend must implement.
 * Each method is async to keep the UI compatible with both local (sync) and
 * network (async) implementations.
 */
export interface StorageAdapter {
  // ---- Lists ----
  getLists(): Promise<List[]>;
  createList(name: string): Promise<List>;
  renameList(id: string, name: string): Promise<void>;
  deleteList(id: string): Promise<void>;
  /** Bulk delete several lists by ID — used by sidebar select mode. */
  deleteLists(ids: string[]): Promise<void>;

  // ---- Items ----
  getItems(listId: string): Promise<Item[]>;
  /**
   * Returns items for every list, keyed by listId. Used so the UI can compute
   * per-list completion status without N round-trips. In Phase 2 this will
   * likely be replaced by a `getListsWithStats()` SQL query.
   */
  getAllItemsByList(): Promise<Record<string, Item[]>>;
  createItem(listId: string, text: string): Promise<Item>;
  updateItem(id: string, patch: Partial<Pick<Item, "text" | "completed">>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  /** Wipe every item in a list (used by the "delete all" feature). */
  deleteAllItems(listId: string): Promise<void>;
  /** Delete only completed items in a list (used by "Delete completed"). */
  deleteCompletedItems(listId: string): Promise<void>;
  /** Persist a new visual order. `orderedIds` is the new top-to-bottom ID list. */
  reorderItems(listId: string, orderedIds: string[]): Promise<void>;
}
