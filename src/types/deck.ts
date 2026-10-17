// deck schema - the AI tools, the store, and every UI surface all agree on this shape

export const ARTBOARD_WIDTH = 1280;
export const ARTBOARD_HEIGHT = 720; // 16:9

export type SlideLayout =
  | "title"
  | "content"
  | "two-column"
  | "comparison"
  | "section-break"
  | "chart-forward"
  | "blank";

export type ElementType =
  | "text"
  | "image"
  | "chart"
  | "table"
  | "shape"
  | "icon";

export interface BoundingBox {
  x: number; // slide-relative units, artboard is 1280x720
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees, optional
}

interface ElementBase extends BoundingBox {
  id: string;
  type: ElementType;
}

export type TextRole = "title" | "subtitle" | "body" | "bullets" | "caption";

export interface TextElement extends ElementBase {
  type: "text";
  text: string; // plain text; "\n" separates lines/bullets
  role: TextRole;
  listStyle?: "none" | "bullet" | "number";
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  align: "left" | "center" | "right";
  color: string;
}

export interface ImageElement extends ElementBase {
  type: "image";
  src: string; // URL or data URL
  alt?: string;
  fit: "cover" | "contain";
  radius?: number;
}

export type ChartType = "bar" | "line" | "pie" | "area";

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ChartSpec {
  chartType: ChartType;
  title?: string;
  categories: string[]; // x-axis categories / pie labels
  series: ChartSeries[]; // for pie, series[0].data is used
  colors?: string[];
  showLegend?: boolean;
  showDataLabels?: boolean;
}

export interface ChartElement extends ElementBase {
  type: "chart";
  chart: ChartSpec;
}

export interface TableElement extends ElementBase {
  type: "table";
  rows: string[][]; // rows[0] is header if hasHeaderRow
  hasHeaderRow: boolean;
}

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface IconElement extends ElementBase {
  type: "icon";
  icon: string; // key into a small built-in icon set
  color: string;
}

export type SlideElement =
  | TextElement
  | ImageElement
  | ChartElement
  | TableElement
  | ShapeElement
  | IconElement;

export interface SlideBackground {
  kind: "color" | "gradient" | "image";
  value: string; // css color, css gradient, or image url
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string; // short internal label, not necessarily rendered
  background: SlideBackground;
  notes: string; // speaker notes
  elements: SlideElement[]; // array order === z-order (last = topmost)
}

export type AspectRatio = "16:9";

export interface Deck {
  id: string;
  title: string;
  theme: string; // theme id, see THEMES in src/lib/themes.ts
  aspectRatio: AspectRatio;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export function emptyDeck(title = "Untitled presentation"): Deck {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    theme: "light",
    aspectRatio: "16:9",
    slides: [],
    createdAt: now,
    updatedAt: now,
  };
}
