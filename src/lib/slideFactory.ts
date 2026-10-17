import { v4 as uuid } from "uuid";
import { Slide, SlideLayout } from "@/types/deck";

export function emptySlide(layout: SlideLayout = "blank", title = "New slide"): Slide {
  return {
    id: uuid(),
    layout,
    title,
    background: { kind: "color", value: "#ffffff" },
    notes: "",
    elements: [],
  };
}
