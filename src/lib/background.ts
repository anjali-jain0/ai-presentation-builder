import { SlideBackground } from "@/types/deck";
import { CSSProperties } from "react";

export function backgroundStyle(bg: SlideBackground): CSSProperties {
  switch (bg.kind) {
    case "color":
      return { background: bg.value };
    case "gradient":
      return { backgroundImage: bg.value };
    case "image":
      return { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
}
