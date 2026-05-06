/*
 * ListView — main right-pane content: the active list's items.
 *
 * Stacks:
 *   1. Header showing the active list name (or empty state)
 *   2. AddItemInput — input for new items
 *   3. ItemList — sortable rows
 *   4. BulkActionBar — sticky footer for bulk actions
 *
 * Also listens for the "request-delete-item" custom event dispatched by
 * ItemRow's trash button. This pattern keeps the confirmation dialog
 * centralized in one place rather than duplicating it in every row.
 */

"use client";

import { useEffect, useState } from "react";
import { useLists } from "@/hooks/useLists";
import { AddItemInput } from "@/components/items/AddItemInput";
import { ItemList } from "@/components/items/ItemList";
import { BulkActionBar } from "@/components/items/BulkActionBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function ListView() {
  const { lists, activeListId, items, deleteItem, loading } = useLists();
  const activeList = lists.find((l) => l.id === activeListId);

  // Single-item delete confirmation. ItemRow dispatches a CustomEvent so we
  // don't have to thread a callback through dnd-kit's row props.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setPendingDeleteId(detail);
    };
    window.addEventListener("list-app:request-delete-item", handler);
    return () =>
      window.removeEventListener("list-app:request-delete-item", handler);
  }, []);

  const pendingItem = items.find((i) => i.id === pendingDeleteId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!activeList) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-fg">No list selected.</p>
        <p className="text-sm text-muted">
          Create your first list using the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <h1 className="truncate text-2xl font-semibold text-fg">
        {activeList.name}
      </h1>

      <AddItemInput />

      <div className="flex-1 overflow-y-auto pb-2">
        <ItemList />
      </div>

      <BulkActionBar />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this item?"
        message={
          pendingItem ? `"${pendingItem.text}" will be removed.` : ""
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteItem(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
