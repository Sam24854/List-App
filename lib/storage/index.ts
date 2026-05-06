/*
 * Storage adapter selector.
 *
 * Right now we only have one adapter (localStorage). When Phase 2 lands, we'll
 * add `apiAdapter` and switch based on an env flag — at that point the UI does
 * NOT need to change, only this file.
 */

import { localStorageAdapter } from "./localStorageAdapter";
import type { StorageAdapter } from "./types";

export function getStorageAdapter(): StorageAdapter {
  // Phase 2 will look something like:
  //   if (process.env.NEXT_PUBLIC_USE_API === "true") return apiAdapter;
  return localStorageAdapter;
}

export type { StorageAdapter, List, Item } from "./types";
