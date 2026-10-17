import { useDeckStore } from "@/store/deckStore";
import { SlideElement } from "@/types/deck";
import TextInspector from "./TextInspector";
import ChartInspector from "./ChartInspector";
import TableInspector from "./TableInspector";
import ImageInspector from "./ImageInspector";
import ShapeInspector from "./ShapeInspector";
import SlideInspector from "./SlideInspector";
import { SlideIcon, TextIcon, ChartIcon, TableIcon, ImageIcon, ShapeIcon } from "@/components/toolbar/icons";

const SECTION_ICON: Record<SlideElement["type"] | "slide", React.ReactNode> = {
  slide: <SlideIcon />,
  text: <TextIcon />,
  chart: <ChartIcon />,
  table: <TableIcon />,
  image: <ImageIcon />,
  shape: <ShapeIcon />,
  icon: <ShapeIcon />,
};

export default function Inspector() {
  const deck = useDeckStore((s) => s.deck);
  const selection = useDeckStore((s) => s.selection);

  const slide = deck.slides.find((s) => s.id === selection.slideId);
  const singleElement =
    slide && selection.elementIds.length === 1 ? slide.elements.find((e) => e.id === selection.elementIds[0]) : undefined;
  const sectionKind = singleElement?.type ?? "slide";
  const sectionLabel = singleElement
    ? singleElement.type[0].toUpperCase() + singleElement.type.slice(1)
    : "Slide";

  return (
    <div className="flex h-full w-[260px] flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-2 text-slate-400">
        {slide && SECTION_ICON[sectionKind]}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {slide ? `${sectionLabel} properties` : "Inspector"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!slide ? (
          <p className="text-xs text-slate-400">No slide selected.</p>
        ) : selection.elementIds.length === 0 ? (
          <SlideInspector slide={slide} />
        ) : selection.elementIds.length > 1 ? (
          <p className="text-xs text-slate-400">{selection.elementIds.length} elements selected. Drag to move as a group, or press Delete.</p>
        ) : (
          (() => {
            const el = slide.elements.find((e) => e.id === selection.elementIds[0]);
            if (!el) return <p className="text-xs text-slate-400">Element not found.</p>;
            switch (el.type) {
              case "text":
                return <TextInspector slideId={slide.id} element={el} />;
              case "chart":
                return <ChartInspector slideId={slide.id} element={el} />;
              case "table":
                return <TableInspector slideId={slide.id} element={el} />;
              case "image":
                return <ImageInspector slideId={slide.id} element={el} />;
              case "shape":
                return <ShapeInspector slideId={slide.id} element={el} />;
              default:
                return <p className="text-xs text-slate-400">No editable properties.</p>;
            }
          })()
        )}
      </div>
    </div>
  );
}
