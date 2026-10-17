import { Fragment, useState } from "react";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragCancelEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { v4 as uuid } from "uuid";
import { useDeckStore } from "@/store/deckStore";
import SlideThumbnail from "./SlideThumbnail";
import { emptySlide } from "@/lib/slideFactory";

export default function Filmstrip() {
  const deck = useDeckStore((s) => s.deck);
  const selection = useDeckStore((s) => s.selection);
  const selectSlide = useDeckStore((s) => s.selectSlide);
  const applyOp = useDeckStore((s) => s.applyOp);
  const hoveredDropSlideId = useDeckStore((s) => s.hoveredDropSlideId);

  // gap index (0..slides.length) the dragged slide would land in; null = no active drag
  const [insertionGap, setInsertionGap] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const computeGap = (activeId: string, overId: string | null): number | null => {
    if (!overId) return null;
    const ids = deck.slides.map((s) => s.id);
    const activeIdx = ids.indexOf(activeId);
    const overIdx = ids.indexOf(overId);
    if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return null;
    return overIdx > activeIdx ? overIdx + 1 : overIdx;
  };

  const onDragStart = (e: DragStartEvent) => {
    setInsertionGap(computeGap(String(e.active.id), null));
  };
  const onDragOver = (e: DragOverEvent) => {
    setInsertionGap(computeGap(String(e.active.id), e.over ? String(e.over.id) : null));
  };
  const onDragEnd = (e: DragEndEvent) => {
    setInsertionGap(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = deck.slides.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    applyOp({ type: "reorder_slides", slideIds: arrayMove(ids, from, to) });
  };
  // dnd-kit cancels the drag itself on Escape; this just clears the indicator line
  const onDragCancel = (_e: DragCancelEvent) => {
    setInsertionGap(null);
  };

  const addBlankSlide = () => {
    const slide = emptySlide();
    const idx = deck.slides.findIndex((s) => s.id === selection.slideId);
    applyOp({ type: "add_slide", slide, index: idx === -1 ? deck.slides.length : idx + 1 });
    selectSlide(slide.id);
  };

  return (
    <div className="flex h-full w-[190px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slides</span>
        <span className="text-xs text-slate-400">{deck.slides.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {deck.slides.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 px-2 text-center text-xs text-slate-400">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="6" width="24" height="17" rx="2" fill="#eef2ff" />
              <rect x="6" y="10" width="9" height="2" rx="1" fill="#c7d2fe" />
              <rect x="6" y="14" width="13" height="2" rx="1" fill="#c7d2fe" />
            </svg>
            No slides yet. Generate a deck from the chat, or add a blank slide below.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <SortableContext items={deck.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                <InsertionLine show={insertionGap === 0} />
                {deck.slides.map((slide, i) => (
                  <Fragment key={slide.id}>
                    <SlideThumbnail
                      slide={slide}
                      index={i}
                      isActive={selection.slideId === slide.id}
                      isDropTarget={hoveredDropSlideId === slide.id}
                      onSelect={() => selectSlide(slide.id)}
                      onDuplicate={() => {
                        const newElementIds = Object.fromEntries(slide.elements.map((el) => [el.id, uuid()]));
                        applyOp({ type: "duplicate_slide", slideId: slide.id, newSlideId: uuid(), newElementIds });
                      }}
                      onDelete={() => {
                        applyOp({ type: "delete_slide", slideId: slide.id });
                        if (selection.slideId === slide.id) {
                          const remaining = deck.slides.filter((s) => s.id !== slide.id);
                          selectSlide(remaining[0]?.id ?? null);
                        }
                      }}
                    />
                    <InsertionLine show={insertionGap === i + 1} />
                  </Fragment>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      <button
        onClick={addBlankSlide}
        className="m-2 rounded-md border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
      >
        + Add blank slide
      </button>
    </div>
  );
}

function InsertionLine({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="relative h-0.5 shrink-0 rounded-full bg-indigo-500">
      <div className="absolute -left-0.5 -top-[3px] h-2 w-2 rounded-full bg-indigo-500" />
    </div>
  );
}
