import { ARTBOARD_WIDTH, Deck } from "@/types/deck";
import SlideSurface from "@/components/canvas/SlideSurface";

// one slide per page, only shown inside window.print(). 1280px wide matches
// the 13.333in @page size in index.css at 96px/inch, so nothing needs
// rescaling -- same SlideSurface the canvas/filmstrip already render.
//
// NOTE: has to stay genuinely visible (just off-screen), NOT display:none
// or visibility:hidden. charts size themselves via ResizeObserver, which
// never fires on a display:none box. html2canvas (PDF export) has the same
// problem with visibility:hidden -- it renders blank for hidden ancestors.
// position:fixed off-screen keeps real layout + real paint without the user
// ever seeing it.
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
