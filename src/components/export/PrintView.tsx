import { ARTBOARD_WIDTH, Deck } from "@/types/deck";
import SlideSurface from "@/components/canvas/SlideSurface";

// one slide per page, used by both window.print() and the PDF export below.
// 1280px wide matches the 13.333in @page size in index.css at 96px/inch.
//
// has to stay actually visible (just off-screen), not display:none or
// visibility:hidden -- charts need real layout for ResizeObserver to fire,
// and html2canvas just renders blank if an ancestor is visibility:hidden
export default function PrintView({ deck }: { deck: Deck }) {
  return (
    <div className="fixed left-[-9999px] top-0 -z-10 pointer-events-none print:static print:left-0 print:z-auto print:pointer-events-auto">
      {deck.slides.map((slide, i) => (
        <div
          key={slide.id}
          data-pdf-slide={slide.id}
          style={{
            width: ARTBOARD_WIDTH,
            pageBreakAfter: i < deck.slides.length - 1 ? "always" : "auto",
          }}
        >
          <SlideSurface slide={slide} width={ARTBOARD_WIDTH} />
        </div>
      ))}
    </div>
  );
}
