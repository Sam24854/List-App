/*
 * ListSidebar — left rail showing all lists.
 *
 * Allows the user to:
 *   - Click a list to make it active.
 *   - Create a new list via inline input.
 *   - Rename a list (double-click name, or pencil icon).
 *   - Delete a list (trash icon, with confirmation).
 *
 * On desktop this is always visible. On mobile (<768px) the parent renders
 * this inside a slide-in drawer that opens from a hamburger button.
 */

"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLists } from "@/hooks/useLists";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { List } from "@/lib/storage/types";

export function ListSidebar({ onSelect }: { onSelect?: () => void }) {
  const {
    lists,
    activeListId,
    selectList,
    createList,
    renameList,
    deleteList,
  } = useLists();

  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await createList(newListName);
    setNewListName("");
    onSelect?.(); // close mobile drawer if open
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
    selectList(id);
    onSelect?.();
  };

  const listToDelete = lists.find((l) => l.id === confirmDeleteId);

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-border bg-surface p-3 sm:w-72 sm:border-r">
      <h2 className="px-2 pt-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Lists
      </h2>

      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {lists.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted">
            No lists yet. Create one below.
          </li>
        )}
        {lists.map((list) => {
          const isActive = list.id === activeListId;
          const isEditing = editingId === list.id;
          return (
            <li key={list.id} className="group flex items-center gap-1">
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
                  onDoubleClick={() => startRename(list)}
                  className={cn(
                    "min-h-[44px] flex-1 truncate rounded-md px-3 text-left text-base text-fg hover:bg-surface-2",
                    isActive &&
                      "bg-accent text-accent-fg hover:bg-accent-hover",
                  )}
                >
                  {list.name}
                </button>
              )}
              {!isEditing && (
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
    </aside>
  );
}
