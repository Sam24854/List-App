/*
 * AddItemInput — text field at the top of the list view.
 *
 * On submit (Enter or button click) we call the `addItem` action from useLists,
 * then clear the input. The hook trims input internally and ignores blanks,
 * so we don't duplicate that check here.
 */

"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useLists } from "@/hooks/useLists";

export function AddItemInput() {
  const { addItem, activeListId } = useLists();
  const [text, setText] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addItem(text);
    setText("");
  };

  // No active list = nothing to add to. Hide the input.
  if (!activeListId) return null;

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new item..."
        // 16px font-size on inputs prevents iOS Safari from auto-zooming on focus.
        // min-w-0 lets the input shrink so the "+" button can't overflow.
        className="min-w-0 min-h-[44px] flex-1 rounded-md border border-border bg-surface px-3 text-base text-fg placeholder:text-muted"
      />
      <button
        type="submit"
        aria-label="Add item"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        disabled={!text.trim()}
      >
        <Plus size={18} />
      </button>
    </form>
  );
}
