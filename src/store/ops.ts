// every deck mutation (manual or AI) is one of these, goes through applyDeckOp below
import { v4 as uuid } from "uuid";
import {
  ChartSpec,
  ChartType,
  Deck,
  Slide,
  SlideElement,
  SlideLayout,
} from "../types/deck";
import { clampBox } from "../lib/elementFactory";

export type DeckOp =
  | { type: "rename_deck"; title: string }
  | { type: "add_slide"; slide: Slide; index?: number }
  | {
      type: "update_slide";
      slideId: string;
      patch: Partial<Pick<Slide, "title" | "layout" | "background" | "notes">>;
    }
  | { type: "delete_slide"; slideId: string }
  | { type: "reorder_slides"; slideIds: string[] }
  | {
      type: "duplicate_slide";
      slideId: string;
      newSlideId?: string;
      // original id -> clone id, precomputed by the caller. this reducer runs
      // on both client and server separately, they have to agree on ids
      newElementIds?: Record<string, string>;
    }
  | { type: "change_layout"; slideId: string; layout: SlideLayout }
  | { type: "add_element"; slideId: string; element: SlideElement; index?: number }
  | {
      type: "update_element";
      slideId: string;
      elementId: string;
      patch: Partial<SlideElement>;
    }
  | { type: "delete_element"; slideId: string; elementId: string }
  | {
      type: "move_element";
      fromSlideId: string;
      toSlideId: string;
      elementId: string;
      x?: number;
      y?: number;
      copy?: boolean;
      newElementId?: string;
    }
  | {
      type: "resize_element";
      slideId: string;
      elementId: string;
      width: number;
      height: number;
    }
  | { type: "reorder_elements"; slideId: string; elementIds: string[] }
  | {
      type: "add_chart";
      slideId: string;
      chart: ChartSpec;
      box?: Partial<{ x: number; y: number; width: number; height: number }>;
      elementId?: string;
    }
  | {
      type: "update_chart_data";
      slideId: string;
      elementId: string;
      categories?: string[];
      series?: ChartSpec["series"];
    }
  | { type: "change_chart_type"; slideId: string; elementId: string; chartType: ChartType };

function findSlide(deck: Deck, slideId: string): Slide | undefined {
  return deck.slides.find((s) => s.id === slideId);
}

// mutates deck in place, meant to run inside an immer produce()
export function applyDeckOp(deck: Deck, op: DeckOp): void {
  switch (op.type) {
    case "rename_deck": {
      deck.title = op.title;
      break;
    }
    case "add_slide": {
      const index = op.index ?? deck.slides.length;
      deck.slides.splice(index, 0, op.slide);
      break;
    }
    case "update_slide": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      Object.assign(slide, op.patch);
      break;
    }
    case "delete_slide": {
      deck.slides = deck.slides.filter((s) => s.id !== op.slideId);
      break;
    }
    case "reorder_slides": {
      // dedupe ids defensively; the tool layer also rejects bad lists outright
      const bySlideId = new Map(deck.slides.map((s) => [s.id, s]));
      const seen = new Set<string>();
      const ordered: Slide[] = [];
      for (const id of op.slideIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        const s = bySlideId.get(id);
        if (s) ordered.push(s);
      }
      const missing = deck.slides.filter((s) => !seen.has(s.id));
      deck.slides = [...ordered, ...missing];
      break;
    }
    case "duplicate_slide": {
      const idx = deck.slides.findIndex((s) => s.id === op.slideId);
      if (idx === -1) return;
      const original = deck.slides[idx];
      const clone: Slide = JSON.parse(JSON.stringify(original));
      clone.id = op.newSlideId ?? uuid();
      clone.elements = clone.elements.map((el) => ({
        ...el,
        id: op.newElementIds?.[el.id] ?? uuid(),
      }));
      deck.slides.splice(idx + 1, 0, clone);
      break;
    }
    case "change_layout": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      slide.layout = op.layout;
      break;
    }
    case "add_element": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const index = op.index ?? slide.elements.length;
      slide.elements.splice(index, 0, op.element);
      break;
    }
    case "update_element": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const el = slide.elements.find((e) => e.id === op.elementId);
      if (!el) return;
      Object.assign(el, op.patch);
      break;
    }
    case "delete_element": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      slide.elements = slide.elements.filter((e) => e.id !== op.elementId);
      break;
    }
    case "move_element": {
      const from = findSlide(deck, op.fromSlideId);
      const to = findSlide(deck, op.toSlideId);
      if (!from || !to) return;
      const el = from.elements.find((e) => e.id === op.elementId);
      if (!el) return;

      const moved: SlideElement = op.copy
        ? { ...(JSON.parse(JSON.stringify(el)) as SlideElement), id: op.newElementId ?? uuid() }
        : el;

      if (typeof op.x === "number") moved.x = op.x;
      if (typeof op.y === "number") moved.y = op.y;
      const clamped = clampBox(moved);
      moved.x = clamped.x;
      moved.y = clamped.y;
      moved.width = clamped.width;
      moved.height = clamped.height;

      if (!op.copy) {
        from.elements = from.elements.filter((e) => e.id !== op.elementId);
      }
      to.elements.push(moved);
      break;
    }
    case "resize_element": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const el = slide.elements.find((e) => e.id === op.elementId);
      if (!el) return;
      const clamped = clampBox({ x: el.x, y: el.y, width: op.width, height: op.height });
      el.width = clamped.width;
      el.height = clamped.height;
      el.x = clamped.x;
      el.y = clamped.y;
      break;
    }
    case "reorder_elements": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      // same dedupe safeguard as reorder_slides above
      const byId = new Map(slide.elements.map((e) => [e.id, e]));
      const seen = new Set<string>();
      const ordered: SlideElement[] = [];
      for (const id of op.elementIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        const e = byId.get(id);
        if (e) ordered.push(e);
      }
      const missing = slide.elements.filter((e) => !seen.has(e.id));
      slide.elements = [...ordered, ...missing];
      break;
    }
    case "add_chart": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const box = clampBox({
        x: op.box?.x ?? 120,
        y: op.box?.y ?? 140,
        width: op.box?.width ?? 480,
        height: op.box?.height ?? 320,
      });
      slide.elements.push({
        id: op.elementId ?? uuid(),
        type: "chart",
        ...box,
        chart: op.chart,
      });
      break;
    }
    case "update_chart_data": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const el = slide.elements.find((e) => e.id === op.elementId);
      if (!el || el.type !== "chart") return;
      if (op.categories) el.chart.categories = op.categories;
      if (op.series) el.chart.series = op.series;
      break;
    }
    case "change_chart_type": {
      const slide = findSlide(deck, op.slideId);
      if (!slide) return;
      const el = slide.elements.find((e) => e.id === op.elementId);
      if (!el || el.type !== "chart") return;
      el.chart.chartType = op.chartType;
      break;
    }
  }
  deck.updatedAt = Date.now();
}
