import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Slide } from "@/types/deck";
import SlideSurface from "@/components/canvas/SlideSurface";
import { registerSlideDropTarget, unregisterSlideDropTarget } from "@/lib/dragRegistry";

const THUMB_WIDTH = 160;

interface Props {
  slide: Slide;
  index: number;
  isActive: boolean;
  isDropTarget: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function SlideThumbnail({ slide, index, isActive, isDropTarget, onSelect, onDuplicate, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    registerSlideDropTarget(slide.id, el);
    return () => unregisterSlideDropTarget(slide.id);
  }, [slide.id]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        dropRef.current = node;
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group relative shrink-0"
    >
      <div
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={`cursor-pointer rounded-md border-2 p-0.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
          isActive ? "border-indigo-500" : isDropTarget ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:border-slate-300"
        }`}
      >
        <SlideSurface slide={slide} width={THUMB_WIDTH} className="rounded bg-white" />
      </div>
      <div className="mt-1 flex items-center justify-between px-0.5 text-[11px] text-slate-500">
        <span>{index + 1}</span>
        <div className="hidden gap-1 group-hover:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded px-1 hover:bg-slate-200"
            title="Duplicate slide"
          >
            ⧉
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded px-1 hover:bg-red-100 hover:text-red-600"
            title="Delete slide"
          >
            ✕
          </button>
        </div>
      </div>
      {isDropTarget && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-emerald-500/10 text-[11px] font-semibold text-emerald-700">
          Drop here
        </div>
      )}
    </div>
  );
}
