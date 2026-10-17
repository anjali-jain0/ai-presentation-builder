import { v4 as uuid } from "uuid";
import { DeckOp } from "../../src/store/ops";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, ChartSeries, Deck, SlideElement } from "../../src/types/deck";
import { clampBox } from "../../src/lib/elementFactory";
import { TOOL_SCHEMAS } from "./toolSchemas";

export class ToolCallError extends Error {}

interface ToolResult {
  op: DeckOp;
  responsePayload: Record<string, unknown>;
}

function box(args: any, fallback: { x: number; y: number; width: number; height: number }) {
  return clampBox({
    x: typeof args.x === "number" ? args.x : fallback.x,
    y: typeof args.y === "number" ? args.y : fallback.y,
    width: typeof args.width === "number" ? args.width : fallback.width,
    height: typeof args.height === "number" ? args.height : fallback.height,
  });
}

function centered(width: number, height: number) {
  return { x: ARTBOARD_WIDTH / 2 - width / 2, y: ARTBOARD_HEIGHT / 2 - height / 2, width, height };
}

// default positions by role so title/subtitle/body don't all stack on the same spot
const TEXT_ROLE_DEFAULTS: Record<string, { x: number; y: number; width: number; height: number }> = {
  title: { x: 100, y: 110, width: 1080, height: 110 },
  subtitle: { x: 100, y: 240, width: 1080, height: 70 },
  body: { x: 100, y: 190, width: 1080, height: 440 },
  bullets: { x: 100, y: 190, width: 1080, height: 440 },
  caption: { x: 100, y: 650, width: 1080, height: 50 },
};

function requireSlide(deck: Deck, slideId: string) {
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) throw new ToolCallError(`No such slideId: ${slideId}`);
  return slide;
}

function requireElement(deck: Deck, slideId: string, elementId: string): SlideElement {
  const slide = requireSlide(deck, slideId);
  const el = slide.elements.find((e) => e.id === elementId);
  if (!el) throw new ToolCallError(`No such elementId ${elementId} on slide ${slideId}`);
  return el;
}

// a type-specific tool call against the wrong element type should error, not
// silently no-op (the reducer just bails on a type mismatch otherwise)
function requireElementOfType<T extends SlideElement["type"]>(
  deck: Deck,
  slideId: string,
  elementId: string,
  expectedType: T,
  toolLabel: string
): Extract<SlideElement, { type: T }> {
  const el = requireElement(deck, slideId, elementId);
  if (el.type !== expectedType) {
    throw new ToolCallError(
      `${toolLabel} targets elementId ${elementId}, but that element is a "${el.type}", not a "${expectedType}". Use the matching element-type tool or a different elementId.`
    );
  }
  return el as Extract<SlideElement, { type: T }>;
}

// rejects duplicate or unknown ids in a reorder list with a clear error
function requireUniqueKnownIds(ids: string[], validIds: Set<string>, label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new ToolCallError(`Duplicate ${label} id in the list: ${id}`);
    seen.add(id);
    if (!validIds.has(id)) throw new ToolCallError(`Unknown ${label} id: ${id}`);
  }
}

// models sometimes send a literal "\n" instead of an actual newline
function normalizeText(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function normalizeSeries(series: any): ChartSeries[] | undefined {
  if (!Array.isArray(series)) return undefined;
  return series.map((s: any) => ({ name: String(s.name ?? "Series"), data: (s.data ?? []).map(Number) }));
}

// validates a tool call's args (zod) and references, then converts it to a DeckOp
export function toolCallToOp(name: string, rawArgs: any, deck: Deck): ToolResult {
  const schema = TOOL_SCHEMAS[name as keyof typeof TOOL_SCHEMAS];
  if (!schema) throw new ToolCallError(`Unknown tool: ${name}`);
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new ToolCallError(`Invalid arguments for ${name}: ${issues}`);
  }
  const args: any = parsed.data;

  switch (name) {
    case "add_slide": {
      const id = uuid();
      let index = deck.slides.length;
      if (args.afterSlideId) {
        const idx = deck.slides.findIndex((s) => s.id === args.afterSlideId);
        if (idx !== -1) index = idx + 1;
      }
      return {
        op: {
          type: "add_slide",
          index,
          slide: {
            id,
            title: String(args.title ?? "Untitled slide"),
            layout: args.layout ?? "content",
            background: { kind: "color", value: args.backgroundColor ?? "#ffffff" },
            notes: args.notes ?? "",
            elements: [],
          },
        },
        responsePayload: { status: "ok", slideId: id },
      };
    }
    case "update_slide": {
      requireSlide(deck, args.slideId);
      const patch: any = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.layout !== undefined) patch.layout = args.layout;
      if (args.backgroundColor !== undefined) patch.background = { kind: "color", value: args.backgroundColor };
      if (args.notes !== undefined) patch.notes = args.notes;
      return { op: { type: "update_slide", slideId: args.slideId, patch }, responsePayload: { status: "ok" } };
    }
    case "delete_slide": {
      requireSlide(deck, args.slideId);
      return { op: { type: "delete_slide", slideId: args.slideId }, responsePayload: { status: "ok" } };
    }
    case "reorder_slides": {
      requireUniqueKnownIds(
        args.slideIds,
        new Set(deck.slides.map((s) => s.id)),
        "slide"
      );
      return { op: { type: "reorder_slides", slideIds: args.slideIds }, responsePayload: { status: "ok" } };
    }
    case "duplicate_slide": {
      const slide = requireSlide(deck, args.slideId);
      const newSlideId = uuid();
      // precomputed here, not in the reducer, so client/server don't diverge
      const newElementIds = Object.fromEntries(slide.elements.map((el) => [el.id, uuid()]));
      return {
        op: { type: "duplicate_slide", slideId: args.slideId, newSlideId, newElementIds },
        responsePayload: { status: "ok", newSlideId, newElementIds },
      };
    }
    case "change_layout": {
      requireSlide(deck, args.slideId);
      return { op: { type: "change_layout", slideId: args.slideId, layout: args.layout }, responsePayload: { status: "ok" } };
    }

    case "add_text_element": {
      requireSlide(deck, args.slideId);
      const id = uuid();
      const b = box(args, TEXT_ROLE_DEFAULTS[args.role] ?? TEXT_ROLE_DEFAULTS.body);
      return {
        op: {
          type: "add_element",
          slideId: args.slideId,
          element: {
            id,
            type: "text",
            ...b,
            text: normalizeText(String(args.text ?? "")),
            role: args.role ?? "body",
            listStyle: args.listStyle ?? (args.role === "bullets" ? "bullet" : "none"),
            fontSize: args.fontSize ?? (args.role === "title" ? 36 : 20),
            fontWeight: args.role === "title" ? 700 : 400,
            align: args.align ?? "left",
            color: args.color ?? "#1f2430",
          },
        },
        responsePayload: { status: "ok", elementId: id },
      };
    }
    case "add_image_element": {
      requireSlide(deck, args.slideId);
      const id = uuid();
      const b = box(args, centered(360, 240));
      return {
        op: {
          type: "add_element",
          slideId: args.slideId,
          element: { id, type: "image", ...b, src: args.src, alt: args.alt ?? "", fit: args.fit ?? "cover", radius: 8 },
        },
        responsePayload: { status: "ok", elementId: id },
      };
    }
    case "add_shape_element": {
      requireSlide(deck, args.slideId);
      const id = uuid();
      const b = box(args, centered(200, 200));
      return {
        op: {
          type: "add_element",
          slideId: args.slideId,
          element: { id, type: "shape", ...b, shape: args.shape ?? "rect", fill: args.fill ?? "#e2e8f0", stroke: args.stroke },
        },
        responsePayload: { status: "ok", elementId: id },
      };
    }
    case "add_table_element": {
      requireSlide(deck, args.slideId);
      const id = uuid();
      const b = box(args, { x: 140, y: 220, width: 1000, height: 320 });
      return {
        op: {
          type: "add_element",
          slideId: args.slideId,
          element: { id, type: "table", ...b, rows: args.rows, hasHeaderRow: args.hasHeaderRow ?? true },
        },
        responsePayload: { status: "ok", elementId: id },
      };
    }
    case "add_chart": {
      requireSlide(deck, args.slideId);
      const id = uuid();
      const b = box(args, { x: 240, y: 150, width: 800, height: 420 });
      return {
        op: {
          type: "add_chart",
          slideId: args.slideId,
          elementId: id,
          box: b,
          chart: {
            chartType: args.chartType ?? "bar",
            title: args.title,
            categories: args.categories ?? [],
            series: normalizeSeries(args.series) ?? [],
            showLegend: true,
          },
        },
        responsePayload: { status: "ok", elementId: id },
      };
    }

    case "update_text": {
      requireElementOfType(deck, args.slideId, args.elementId, "text", "update_text");
      const patch: any = {};
      for (const k of ["text", "role", "listStyle", "fontSize", "align", "color"]) {
        if (args[k] !== undefined) patch[k] = args[k];
      }
      if (typeof patch.text === "string") patch.text = normalizeText(patch.text);
      return { op: { type: "update_element", slideId: args.slideId, elementId: args.elementId, patch }, responsePayload: { status: "ok" } };
    }
    case "update_image": {
      requireElementOfType(deck, args.slideId, args.elementId, "image", "update_image");
      const patch: any = {};
      if (args.src !== undefined) patch.src = args.src;
      if (args.fit !== undefined) patch.fit = args.fit;
      return { op: { type: "update_element", slideId: args.slideId, elementId: args.elementId, patch }, responsePayload: { status: "ok" } };
    }
    case "update_shape": {
      requireElementOfType(deck, args.slideId, args.elementId, "shape", "update_shape");
      const patch: any = {};
      for (const k of ["shape", "fill", "stroke"]) if (args[k] !== undefined) patch[k] = args[k];
      return { op: { type: "update_element", slideId: args.slideId, elementId: args.elementId, patch }, responsePayload: { status: "ok" } };
    }
    case "update_table": {
      requireElementOfType(deck, args.slideId, args.elementId, "table", "update_table");
      const patch: any = {};
      if (args.rows !== undefined) patch.rows = args.rows;
      if (args.hasHeaderRow !== undefined) patch.hasHeaderRow = args.hasHeaderRow;
      return { op: { type: "update_element", slideId: args.slideId, elementId: args.elementId, patch }, responsePayload: { status: "ok" } };
    }

    case "delete_element": {
      requireElement(deck, args.slideId, args.elementId);
      return { op: { type: "delete_element", slideId: args.slideId, elementId: args.elementId }, responsePayload: { status: "ok" } };
    }
    case "move_element": {
      requireElement(deck, args.fromSlideId, args.elementId);
      requireSlide(deck, args.toSlideId);
      return {
        op: {
          type: "move_element",
          fromSlideId: args.fromSlideId,
          toSlideId: args.toSlideId,
          elementId: args.elementId,
          x: args.x,
          y: args.y,
          copy: Boolean(args.copy),
          newElementId: args.copy ? uuid() : undefined,
        },
        responsePayload: { status: "ok" },
      };
    }
    case "resize_element": {
      requireElement(deck, args.slideId, args.elementId);
      return {
        op: { type: "resize_element", slideId: args.slideId, elementId: args.elementId, width: args.width, height: args.height },
        responsePayload: { status: "ok" },
      };
    }
    case "reorder_elements": {
      const slide = requireSlide(deck, args.slideId);
      requireUniqueKnownIds(
        args.elementIds,
        new Set(slide.elements.map((e) => e.id)),
        "element"
      );
      return { op: { type: "reorder_elements", slideId: args.slideId, elementIds: args.elementIds }, responsePayload: { status: "ok" } };
    }

    case "update_chart_data": {
      const chartEl = requireElementOfType(deck, args.slideId, args.elementId, "chart", "update_chart_data");
      // if only one of categories/series is given, it must match the chart's existing other half
      const effectiveCategoryCount = args.categories ? args.categories.length : chartEl.chart.categories.length;
      if (args.series) {
        const mismatched = args.series.find((s: any) => s.data.length !== effectiveCategoryCount);
        if (mismatched) {
          throw new ToolCallError(
            `update_chart_data: series "${mismatched.name}" has ${mismatched.data.length} data point(s), but this chart has ${effectiveCategoryCount} categories. Provide matching categories and series data together, or make the lengths match the chart's current categories.`
          );
        }
      }
      return {
        op: {
          type: "update_chart_data",
          slideId: args.slideId,
          elementId: args.elementId,
          categories: args.categories,
          series: normalizeSeries(args.series),
        },
        responsePayload: { status: "ok" },
      };
    }
    case "change_chart_type": {
      requireElementOfType(deck, args.slideId, args.elementId, "chart", "change_chart_type");
      return {
        op: { type: "change_chart_type", slideId: args.slideId, elementId: args.elementId, chartType: args.chartType },
        responsePayload: { status: "ok" },
      };
    }

    default:
      throw new ToolCallError(`Unknown tool: ${name}`);
  }
}
