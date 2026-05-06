/*
 * ItemList — sortable list of ItemRow components.
 *
 * Wraps the rows in dnd-kit's:
 *   - DndContext: top-level provider that tracks drag state and routes events
 *   - SortableContext: tells dnd-kit which IDs participate in this sortable list
 *
 * Sensors:
 *   - PointerSensor with `distance: 5` — small drag threshold so a tap doesn't
 *     start a drag accidentally. Works for both mouse and touch in modern browsers.
 *   - KeyboardSensor — lets keyboard users reorder via space + arrow keys.
 */

"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useLists } from "@/hooks/useLists";
import { ItemRow } from "./ItemRow";

export function ItemList() {
  const { items, reorderItems } = useLists();

  // Configure how a drag starts. The 5px distance prevents accidental drags
  // when the user just taps the handle.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const orderedIds = arrayMove(items, oldIndex, newIndex).map((i) => i.id);
    reorderItems(orderedIds);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted">
        No items yet. Add one above.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
