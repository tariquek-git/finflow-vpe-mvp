import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import type { LaneOrientation, Swimlane } from '../../types';

interface Props {
  open: boolean;
  lanes: Swimlane[];
  orientation: LaneOrientation;
  onClose: () => void;
  onAddLane: () => void;
  onSetOrientation: (orientation: LaneOrientation) => void;
  onUpdateLane: (id: string, patch: Partial<Swimlane>) => void;
  onReorderLanes: (orderedIds: string[]) => void;
}

function SortableLaneRow({
  lane,
  onUpdateLane,
}: {
  lane: Swimlane;
  onUpdateLane: (id: string, patch: Partial<Swimlane>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lane.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-2 py-2 opacity-85 dark:border-blue-500/50 dark:bg-blue-500/10'
          : 'flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800'
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-slate-500 hover:bg-slate-100 active:cursor-grabbing dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label={`Drag ${lane.label}`}
      >
        <GripVertical size={14} />
      </button>
      <input
        value={lane.label}
        onChange={(event) => onUpdateLane(lane.id, { label: event.target.value })}
        className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <input
        type="number"
        min={80}
        value={Math.round(lane.size)}
        onChange={(event) => onUpdateLane(lane.id, { size: Math.max(80, Number(event.target.value) || 80) })}
        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <label className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={lane.visible}
          onChange={(event) => onUpdateLane(lane.id, { visible: event.target.checked })}
        />
        visible
      </label>
    </div>
  );
}

export function LaneManagerModal(props: Props) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ordered = [...props.lanes].sort((a, b) => a.order - b.order);
  const orderedIds = ordered.map((lane) => lane.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = orderedIds.indexOf(String(active.id));
    const toIndex = orderedIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    props.onReorderLanes(arrayMove(orderedIds, fromIndex, toIndex));
  };

  if (!props.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Swimlane Manager</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            {(['horizontal', 'vertical'] as LaneOrientation[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => props.onSetOrientation(value)}
                className={
                  props.orientation === value
                    ? 'bg-blue-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white'
                    : 'bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300'
                }
              >
                {value}
              </button>
            ))}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {ordered.map((lane) => (
                  <SortableLaneRow key={lane.id} lane={lane} onUpdateLane={props.onUpdateLane} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={props.onAddLane}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus size={12} />
            Add lane
          </button>
        </div>
      </div>
    </div>
  );
}
