/*
 * ListSidebar — left rail (or mobile drawer) showing all lists.
 *
 * Two modes:
 *
 *   Normal mode:
 *     [Lists]                                       [Select]
 *     [Active list ✓]            [pencil] [trash]
 *     [Other list]               [pencil] [trash]
 *     [New list input                          ][ + ]
 *
 *   Select mode (entered via the "Select" button):
 *     [Cancel]                              [Select all (N)]
 *     [ ] List A ✓
 *     [x] List B
 *     ...
 *                                       [Delete (M selected)]
 *
 * "Complete" indicator: a list is considered complete when it has items AND
 * every item is checked off. Empty lists never show as complete (the user
 * probably just hasn't added anything yet).
 */

"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLists } from "@/hooks/useLists";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { List } from "@/lib/storage/types";

export function ListSidebar({ onSelect }: { onSelect?: () => void }) {
  const {
    lists,
    activeListId,
    listStats,
    selectList,
    createList,
    renameList,
    deleteList,
    listSelectMode,
    selectedListIds,
    enterListSelectMode,
    exitListSelectMode,
    toggleListSelected,
    selectAllLists,
    deleteSelectedLists,
  } = useLists();

  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await createList(newListName);
    setNewListName("");
    onSelect?.();
  };

  const startRename = (list: List) => {
    setEditingId(list.id);
    setEditingName(list.name);
  };

  const commitRename = async () => {
    if (editingId && editingName.trim()) {
      await renameList(editingId, editingName);
    }
    setEditingId(null);
  };

  const onListClick = (id: string) => {
    if (listSelectMode) {
      // In select mode, clicks toggle the checkbox instead of switching list.
      toggleListSelected(id);
    } else {
      selectList(id);
      onSelect?.();
    }
  };

  const listToDelete = lists.find((l) => l.id === confirmDeleteId);
  const allSelected = selectedListIds.size === lists.length && lists.length > 0;

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-border bg-surface p-3 sm:w-72 sm:border-r">
      {/* Header — varies by mode */}
      {listSelectMode ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={exitListSelectMode}
            className="min-h-[44px] rounded-md border border-border bg-bg px-3 text-sm font-medium text-fg hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={selectAllLists}
            disabled={lists.length === 0}
            className="min-h-[44px] rounded-md border border-border bg-bg px-3 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-50"
          >
            {allSelected ? "Clear" : `Select all (${lists.length})`}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Lists
          </h2>
          <button
            type="button"
            onClick={enterListSelectMode}
            disabled={lists.length === 0}
            className="rounded-md px-2 py-1 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            Select
          </button>
        </div>
      )}

      {/* List of lists */}
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {lists.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted">
            No lists yet. Create one below.
          </li>
        )}
        {lists.map((list) => {
          const isActive = list.id === activeListId;
          const isEditing = editingId === list.id;
          const isSelected = selectedListIds.has(list.id);
          const stats = listStats[list.id];
          const isComplete = stats?.isComplete ?? false;
          return (
            <li key={list.id} className="group flex items-center gap-1">
              {listSelectMode && (
                <label className="flex h-11 w-7 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleListSelected(list.id)}
                    aria-label={`Select ${list.name}`}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
                  />
                </label>
              )}

              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="min-h-[44px] flex-1 rounded-md border border-border bg-bg px-3 text-base text-fg"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onListClick(list.id)}
                  onDoubleClick={() => !listSelectMode && startRename(list)}
                  className={cn(
                    "flex min-h-[44px] flex-1 items-center gap-2 truncate rounded-md px-3 text-left text-base text-fg hover:bg-surface-2",
                    isActive &&
                      !listSelectMode &&
                      "bg-accent text-accent-fg hover:bg-accent-hover",
                    isComplete && !isActive && "text-muted line-through",
                  )}
                >
                  <span className="truncate">{list.name}</span>
                  {isComplete && (
                    <Check
                      size={16}
                      className={cn(
                        "shrink-0",
                        isActive ? "text-accent-fg" : "text-accent",
                      )}
                      aria-label="All items completed"
                    />
                  )}
                  {stats && stats.total > 0 && !isComplete && (
                    <span
                      className={cn(
                        "ml-auto shrink-0 text-xs",
                        isActive ? "text-accent-fg/80" : "text-muted",
                      )}
                    >
                      {stats.completed}/{stats.total}
                    </span>
                  )}
                </button>
              )}

              {/* Per-row controls — hidden in select mode to reduce clutter. */}
              {!listSelectMode && !isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => startRename(list)}
                    aria-label={`Rename ${list.name}`}
                    className="flex h-11 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(list.id)}
                    aria-label={`Delete ${list.name}`}
                    className="flex h-11 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-danger hover:text-danger-fg"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* Footer — varies by mode */}
      {listSelectMode ? (
        <button
          type="button"
          onClick={() => setConfirmBulk(true)}
          disabled={selectedListIds.size === 0}
          className="flex min-h-[44px] items-center justify-center gap-1 rounded-md bg-danger px-3 text-sm font-medium text-danger-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} />
          Delete ({selectedListIds.size} selected)
        </button>
      ) : (
        <form onSubmit={onCreate} className="flex gap-2 border-t border-border pt-3">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="New list..."
            className="min-h-[44px] flex-1 rounded-md border border-border bg-bg px-3 text-base text-fg placeholder:text-muted"
          />
          <button
            type="submit"
            aria-label="Create list"
            disabled={!newListName.trim()}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-accent px-3 text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </form>
      )}

      {/* Single-list delete confirmation */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={`Delete "${listToDelete?.name ?? ""}"?`}
        message="This list and all of its items will be permanently removed."
        confirmLabel="Delete list"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deleteList(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={confirmBulk}
        title={`Delete ${selectedListIds.size} list${selectedListIds.size === 1 ? "" : "s"}?`}
        message="The selected lists and all of their items will be permanently removed."
        confirmLabel="Delete"
        onCancel={() => setConfirmBulk(false)}
        onConfirm={async () => {
          await deleteSelectedLists();
          setConfirmBulk(false);
        }}
      />
    </aside>
  );
}
