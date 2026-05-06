/*
 * ItemRow — a single todo row.
 *
 * Renders:
 *   [select checkbox] [drag handle] [completed checkbox] [text or edit input] [edit btn] [delete btn]
 *
 * Drag-and-drop:
 *   We use the `useSortable` hook from @dnd-kit/sortable. It returns:
 *     - attributes / listeners — applied to the DRAG HANDLE only (not the whole row),
 *       so tapping/clicking the row does not trigger a drag on touch devices.
 *     - transform / transition — CSS we apply to the row to animate movement.
 *     - isDragging — true while this row is being dragged; we dim it.
 *
 * Editing:
 *   Click the pencil icon to swap the text into an editable input. Save on
 *   Enter or blur. Cancel on Escape.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLists } from "@/hooks/useLists";
import type { Item } from "@/lib/storage/types";

export function ItemRow({ item }: { item: Item }) {
  const {
    toggleComplete,
    updateItemText,
    deleteItem,
    selectedItemIds,
    toggleItemSelected,
  } = useLists();

  const isSelected = selectedItemIds.has(item.id);

  // dnd-kit hook: gives us all the wiring needed for sortable behavior.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // The transform CSS comes from dnd-kit; we just apply it.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // ---- Inline edit state ----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // When we enter edit mode, focus the input and select all text.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(item.text);
    setEditing(true);
  };

  const commitEdit = async () => {
    if (draft.trim() && draft !== item.text) {
      await updateItemText(item.id, draft);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(item.text);
    setEditing(false);
  };

  // [request to confirm delete] is a separate action up-tree (the ListView
  // handles confirmation). We just call the trigger here.
  const onDeleteClick = async () => {
    // ItemRow doesn't handle the confirmation dialog itself — it would clutter
    // the row component. Instead the parent passes us a delete handler? For
    // simplicity in v1, we delete directly. The plan calls for confirmation on
    // single-item delete — we delegate to the ListView's confirm flow via a
    // small custom event.
    window.dispatchEvent(
      new CustomEvent<string>("list-app:request-delete-item", { detail: item.id }),
    );
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-2 sm:px-3",
        isDragging && "opacity-40",
        item.completed && "opacity-70",
      )}
    >
      {/* Multi-select checkbox (separate from the "completed" checkbox). */}
      <label className="flex h-11 w-6 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelected(item.id)}
          aria-label="Select item for bulk actions"
          className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
        />
      </label>

      {/* Drag handle — only this element starts a drag (not the whole row).
          That makes the row safe to tap on touch devices. */}
      <button
        type="button"
        aria-label="Drag to reorder"
        className="flex h-11 w-7 shrink-0 cursor-grab items-center justify-center text-muted touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      {/* Completed checkbox + text (or edit input). */}
      <button
        type="button"
        onClick={() => toggleComplete(item.id)}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          item.completed
            ? "border-accent bg-accent text-accent-fg"
            : "border-border bg-bg",
        )}
      >
        {item.completed && <Check size={14} />}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-base text-fg"
        />
      ) : (
        <span
          // Double-click to edit (desktop convenience). Tap pencil on mobile.
          onDoubleClick={startEdit}
          className={cn(
            "min-w-0 flex-1 truncate text-base text-fg sm:text-sm",
            item.completed && "line-through text-muted",
          )}
        >
          {item.text}
        </span>
      )}

      {/* Edit button — visible on hover (desktop) and always on mobile. */}
      {!editing && (
        <button
          type="button"
          onClick={startEdit}
          aria-label="Edit item"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
        >
          <Pencil size={16} />
        </button>
      )}

      {editing ? (
        <button
          type="button"
          onClick={cancelEdit}
          aria-label="Cancel edit"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onDeleteClick}
          aria-label="Delete item"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded text-muted hover:bg-danger hover:text-danger-fg"
        >
          <Trash2 size={16} />
        </button>
      )}
    </li>
  );
}
