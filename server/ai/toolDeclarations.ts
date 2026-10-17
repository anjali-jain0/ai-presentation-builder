import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

const BOX_PROPS = {
  x: { type: Type.NUMBER, description: "Left position in artboard units (0-1280)." },
  y: { type: Type.NUMBER, description: "Top position in artboard units (0-720)." },
  width: { type: Type.NUMBER, description: "Width in artboard units." },
  height: { type: Type.NUMBER, description: "Height in artboard units." },
};

const LAYOUTS = ["title", "content", "two-column", "comparison", "section-break", "chart-forward", "blank"];
const CHART_TYPES = ["bar", "line", "pie", "area"];
const TEXT_ROLES = ["title", "subtitle", "body", "bullets", "caption"];

const seriesSchema = {
  type: Type.ARRAY,
  description: "One or more data series. For pie charts, only the first series is used.",
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    },
    required: ["name", "data"],
  },
};

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  // ---- slide-level ----
  {
    name: "add_slide",
    description:
      "Add a new slide to the deck. For a brand-new deck, call this once per slide FIRST (outline pass) before adding any elements to any slide.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Short internal label for the slide, e.g. 'Q3 Revenue'." },
        layout: { type: Type.STRING, enum: LAYOUTS, description: "Layout intent hint." },
        afterSlideId: {
          type: Type.STRING,
          description: "Insert immediately after this existing slide id. Omit to append at the end.",
        },
        backgroundColor: { type: Type.STRING, description: "CSS color, e.g. '#ffffff'. Optional." },
        notes: { type: Type.STRING, description: "Speaker notes. Optional." },
      },
      required: ["title", "layout"],
    },
  },
  {
    name: "update_slide",
    description: "Patch a slide's title, layout, background color, or speaker notes. Does not touch its elements.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        title: { type: Type.STRING },
        layout: { type: Type.STRING, enum: LAYOUTS },
        backgroundColor: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ["slideId"],
    },
  },
  {
    name: "delete_slide",
    description: "Delete a slide entirely, including its elements.",
    parameters: {
      type: Type.OBJECT,
      properties: { slideId: { type: Type.STRING } },
      required: ["slideId"],
    },
  },
  {
    name: "reorder_slides",
    description: "Reorder the deck's slides. Provide the FULL list of slide ids in the new desired order.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["slideIds"],
    },
  },
  {
    name: "duplicate_slide",
    description: "Duplicate a slide and all of its elements, inserting the copy right after the original.",
    parameters: {
      type: Type.OBJECT,
      properties: { slideId: { type: Type.STRING } },
      required: ["slideId"],
    },
  },
  {
    name: "change_layout",
    description: "Change only the layout hint of a slide.",
    parameters: {
      type: Type.OBJECT,
      properties: { slideId: { type: Type.STRING }, layout: { type: Type.STRING, enum: LAYOUTS } },
      required: ["slideId", "layout"],
    },
  },

  // ---- element: add ----
  {
    name: "add_text_element",
    description: "Add a text box (title, subtitle, body paragraph, or bullet list) to a slide.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        text: { type: Type.STRING, description: "The text content. Use \\n to separate bullet/numbered lines." },
        role: { type: Type.STRING, enum: TEXT_ROLES },
        listStyle: { type: Type.STRING, enum: ["none", "bullet", "number"] },
        fontSize: { type: Type.NUMBER },
        align: { type: Type.STRING, enum: ["left", "center", "right"] },
        color: { type: Type.STRING, description: "CSS color, e.g. '#111827'." },
        ...BOX_PROPS,
      },
      required: ["slideId", "text", "role"],
    },
  },
  {
    name: "add_image_element",
    description: "Add an image to a slide, by URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        src: { type: Type.STRING, description: "Image URL." },
        alt: { type: Type.STRING },
        fit: { type: Type.STRING, enum: ["cover", "contain"] },
        ...BOX_PROPS,
      },
      required: ["slideId", "src"],
    },
  },
  {
    name: "add_shape_element",
    description: "Add a basic shape (rectangle, ellipse, or line) to a slide, e.g. for dividers or accents.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        shape: { type: Type.STRING, enum: ["rect", "ellipse", "line"] },
        fill: { type: Type.STRING },
        stroke: { type: Type.STRING },
        ...BOX_PROPS,
      },
      required: ["slideId", "shape"],
    },
  },
  {
    name: "add_table_element",
    description: "Add a table to a slide. rows[0] is the header row if hasHeaderRow is true.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        rows: {
          type: Type.ARRAY,
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: "2D array of cell text, row-major.",
        },
        hasHeaderRow: { type: Type.BOOLEAN },
        ...BOX_PROPS,
      },
      required: ["slideId", "rows"],
    },
  },
  {
    name: "add_chart",
    description: "Add a bar, line, pie, or area chart to a slide with real data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        chartType: { type: Type.STRING, enum: CHART_TYPES },
        title: { type: Type.STRING },
        categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "X-axis / pie-slice labels." },
        series: seriesSchema,
        ...BOX_PROPS,
      },
      required: ["slideId", "chartType", "categories", "series"],
    },
  },

  // ---- element: update ----
  {
    name: "update_text",
    description: "Patch an existing text element's content or style. Only pass the fields you want to change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        text: { type: Type.STRING },
        role: { type: Type.STRING, enum: TEXT_ROLES },
        listStyle: { type: Type.STRING, enum: ["none", "bullet", "number"] },
        fontSize: { type: Type.NUMBER },
        align: { type: Type.STRING, enum: ["left", "center", "right"] },
        color: { type: Type.STRING },
      },
      required: ["slideId", "elementId"],
    },
  },
  {
    name: "update_image",
    description: "Patch an existing image element's source or fit.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        src: { type: Type.STRING },
        fit: { type: Type.STRING, enum: ["cover", "contain"] },
      },
      required: ["slideId", "elementId"],
    },
  },
  {
    name: "update_shape",
    description: "Patch an existing shape element's fill/stroke/shape type.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        shape: { type: Type.STRING, enum: ["rect", "ellipse", "line"] },
        fill: { type: Type.STRING },
        stroke: { type: Type.STRING },
      },
      required: ["slideId", "elementId"],
    },
  },
  {
    name: "update_table",
    description: "Replace an existing table's rows (full 2D array) and/or header flag.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
        hasHeaderRow: { type: Type.BOOLEAN },
      },
      required: ["slideId", "elementId"],
    },
  },

  // ---- element: structural ----
  {
    name: "delete_element",
    description: "Delete a single element from a slide.",
    parameters: {
      type: Type.OBJECT,
      properties: { slideId: { type: Type.STRING }, elementId: { type: Type.STRING } },
      required: ["slideId", "elementId"],
    },
  },
  {
    name: "move_element",
    description:
      "Move (or copy) an element from one slide to another, OR reposition it within the same slide. Set copy=true to duplicate instead of moving.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fromSlideId: { type: Type.STRING },
        toSlideId: { type: Type.STRING, description: "Same as fromSlideId to just reposition in place." },
        elementId: { type: Type.STRING },
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        copy: { type: Type.BOOLEAN },
      },
      required: ["fromSlideId", "toSlideId", "elementId"],
    },
  },
  {
    name: "resize_element",
    description: "Resize an element, keeping its top-left corner fixed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
      },
      required: ["slideId", "elementId", "width", "height"],
    },
  },
  {
    name: "reorder_elements",
    description: "Set the z-order (stacking order) of a slide's elements. Provide the FULL list of element ids, bottom to top.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["slideId", "elementIds"],
    },
  },

  // ---- chart ----
  {
    name: "update_chart_data",
    description: "Replace an existing chart's categories and/or series data, without changing its chart type.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        categories: { type: Type.ARRAY, items: { type: Type.STRING } },
        series: seriesSchema,
      },
      required: ["slideId", "elementId"],
    },
  },
  {
    name: "change_chart_type",
    description: "Change an existing chart's type (e.g. bar -> line) while keeping its data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slideId: { type: Type.STRING },
        elementId: { type: Type.STRING },
        chartType: { type: Type.STRING, enum: CHART_TYPES },
      },
      required: ["slideId", "elementId", "chartType"],
    },
  },
];
