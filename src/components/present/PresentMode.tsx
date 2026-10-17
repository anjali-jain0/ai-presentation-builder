import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, Deck } from "@/types/deck";
import SlideSurface from "@/components/canvas/SlideSurface";

interface Props {
  deck: Deck;
  startSlideId: string | null;
  onExit: () => void;
}

export default function PresentMode({ deck, startSlideId, onExit }: Props) {
  const startIdx = Math.max(
    0,
    deck.slides.findIndex((s) => s.id === startSlideId)
  );
  const [index, setIndex] = useState(startIdx);
  const [showNotes, setShowNotes] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(ARTBOARD_WIDTH);

  const slide = deck.slides[index];

  // just a nice-to-have - the overlay below covers the viewport either way
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const fitWidth = Math.min(width, height * (ARTBOARD_WIDTH / ARTBOARD_HEIGHT));
      setSlideWidth(Math.max(fitWidth, 1));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, deck.slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key.toLowerCase() === "n") {
        setShowNotes((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.slides.length, onExit]);

  if (!slide) {
    onExit();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div ref={containerRef} className="flex min-h-0 flex-1 items-center justify-center">
        <SlideSurface slide={slide} width={slideWidth} />
      </div>

      {showNotes && slide.notes && (
        <div className="max-h-28 shrink-0 overflow-y-auto border-t border-white/10 bg-black/80 px-6 py-3 text-sm text-slate-200">
          {slide.notes}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-white/50">
        {index + 1} / {deck.slides.length}
      </div>
      <button
        onClick={onExit}
        title="Exit (Escape)"
        className="absolute right-4 top-4 rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
      >
        Exit ✕
      </button>
    </div>
  );
}
