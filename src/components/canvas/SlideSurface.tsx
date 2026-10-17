import { CSSProperties } from "react";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, Slide } from "@/types/deck";
import { backgroundStyle } from "@/lib/background";
import ElementContent from "./ElementContent";

interface Props {
  slide: Slide;
  width: number; // rendered pixel width; height derived from 16:9
  className?: string;
}

// non-interactive slide render, reused by the filmstrip and export view so
// both match exactly what the canvas shows
export default function SlideSurface({ slide, width, className }: Props) {
  const scale = width / ARTBOARD_WIDTH;
  const height = ARTBOARD_HEIGHT * scale;

  const style: CSSProperties = {
    width,
    height,
    position: "relative",
    overflow: "hidden",
    ...backgroundStyle(slide.background),
  };

  return (
    <div className={className} style={style}>
      {slide.elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: el.x * scale,
            top: el.y * scale,
            width: el.width * scale,
            height: el.height * scale,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: el.width,
              height: el.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <ElementContent element={el} />
          </div>
        </div>
      ))}
    </div>
  );
}
