/*
 * BulkActionBar — appears at the bottom of the list view when at least one
 * item is selected via the multi-select checkbox.
 *
 * Provides:
 *   - "Delete selected" with confirmation
 *   - "Clear selection" to deselect everything
 *
 * The "Delete all" button lives here too (always visible when there are items),
 * since the bulk-action concept covers both selection-based and whole-list deletes.
 */

"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { useLists } from "@/hooks/useLists";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function BulkActionBar() {
  const {
    items,
    selectedItemIds,
    deleteItems,
    deleteAllItems,
    clearSelection,
  } = useLists();

  const [confirm, setConfirm] = useState<null | "selected" | "all">(null);
  const selectedCount = selectedItemIds.size;
  const totalCount = items.length;

  // No items at all? Nothing to bulk-act on.
  if (totalCount === 0) return null;

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-bg/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        {selectedCount > 0 ? (
          <>
            <span className="text-sm text-muted">
              {selectedCount} selected
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm text-fg hover:bg-surface-2"
              >
                <X size={16} />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirm("selected")}
                className="flex min-h-[44px] items-center gap-1 rounded-md bg-danger px-3 text-sm font-medium text-danger-fg hover:opacity-90"
              >
                <Trash2 size={16} />
                Delete selected
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm("all")}
            className="ml-auto flex min-h-[44px] items-center gap-1 rounded-md border border-danger px-3 text-sm font-medium text-danger hover:bg-danger hover:text-danger-fg"
          >
            <Trash2 size={16} />
            Delete all
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "selected"}
        title={`Delete ${selectedCount} item${selectedCount === 1 ? "" : "s"}?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteItems(Array.from(selectedItemIds));
          setConfirm(null);
        }}
      />

      <ConfirmDialog
        open={confirm === "all"}
        title="Delete all items in this list?"
        message={`This will remove all ${totalCount} item${totalCount === 1 ? "" : "s"} from the current list. This cannot be undone.`}
        confirmLabel="Delete all"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteAllItems();
          setConfirm(null);
        }}
      />
    </>
  );
}
