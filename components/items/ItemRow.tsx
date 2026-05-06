/*
 * ItemRow — a single todo row.
 *
 * Renders:
 *   [drag handle] [completed checkbox] [text or edit input] [edit btn] [delete btn]
 *
 * Drag-and-drop:
 *   We use the `useSortable` hook from @dnd-kit/sortable. It returns:
 *     - attributes / listeners — applied to the DRAG HANDLE only (not the whole row),
 *       so tapping/clicking the row does not trigger a drag on touch devices.
 *     - transform / transition — CSS we apply to the row to animate movement.
 *     - isDragging — true while this row is being dragged; we dim it.
 *
 * Editing:
 *   Click the pencil icon (or double-click the text on desktop) to swap the
 *   text into an editable input. Save on Enter or blur. Cancel on Escape.
 *
 * Deleting:
 *   The trash icon dispatches a custom event ("list-app:request-delete-item")
 *   that ListView catches to show the confirmation dialog. This avoids
 *   threading a delete callback through dnd-kit's row wrapping.
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
  const { toggleComplete, updateItemText } = useLists();

  // dnd-kit hook: gives us all the wiring needed for sortable behavior.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // ---- Inline edit state ----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const onDeleteClick = () => {
    window.dispatchEvent(
      new CustomEvent<string>("list-app:request-delete-item", {
        detail: item.id,
      }),
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
      {/* Drag handle — only this element starts a drag. */}
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
          onDoubleClick={startEdit}
          className={cn(
            "min-w-0 flex-1 truncate text-base text-fg sm:text-sm",
            item.completed && "line-through text-muted",
          )}
        >
          {item.text}
        </span>
      )}

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
