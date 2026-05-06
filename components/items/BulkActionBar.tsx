/*
 * BulkActionBar — sticky footer at the bottom of the list view.
 *
 * Shows:
 *   - "Delete completed (N)" — only when ≥ 1 item in the active list is completed
 *   - "Delete all"           — always, when the list has items
 *
 * Both actions go through the shared <ConfirmDialog>. Items don't have a
 * separate multi-select — to bulk-delete a subset, mark them complete first
 * (using the round checkbox on each row), then click "Delete completed".
 * Removing the multi-select column kept the row layout clean.
 */

"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLists } from "@/hooks/useLists";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function BulkActionBar() {
  const { items, deleteCompletedItems, deleteAllItems } = useLists();

  const [confirm, setConfirm] = useState<null | "completed" | "all">(null);
  const completedCount = useMemo(
    () => items.reduce((c, i) => (i.completed ? c + 1 : c), 0),
    [items],
  );
  const totalCount = items.length;

  if (totalCount === 0) return null;

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-bg/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <span className="text-sm text-muted">
          {totalCount} item{totalCount === 1 ? "" : "s"}
          {completedCount > 0 && ` · ${completedCount} completed`}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirm("completed")}
              className="flex min-h-[44px] items-center gap-1 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover"
            >
              <Trash2 size={16} />
              Delete completed ({completedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirm("all")}
            className="flex min-h-[44px] items-center gap-1 rounded-md border border-danger px-3 text-sm font-medium text-danger hover:bg-danger hover:text-danger-fg"
          >
            <Trash2 size={16} />
            Delete all
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "completed"}
        title={`Delete ${completedCount} completed item${completedCount === 1 ? "" : "s"}?`}
        message="Only completed items will be removed. This cannot be undone."
        confirmLabel="Delete completed"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteCompletedItems();
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
