import { v4 as uuid } from "uuid";
import {
  ARTBOARD_HEIGHT,
  ARTBOARD_WIDTH,
  ChartSpec,
  ChartElement,
  ImageElement,
  ShapeElement,
  SlideElement,
  TableElement,
  TextElement,
} from "../types/deck";

export function clampBox(box: { x: number; y: number; width: number; height: number }) {
  const width = Math.min(Math.max(box.width, 40), ARTBOARD_WIDTH);
  const height = Math.min(Math.max(box.height, 30), ARTBOARD_HEIGHT);
  const x = Math.min(Math.max(box.x, 0), ARTBOARD_WIDTH - width);
  const y = Math.min(Math.max(box.y, 0), ARTBOARD_HEIGHT - height);
  return { x, y, width, height };
}

export function makeText(partial: Partial<TextElement> = {}): TextElement {
  return {
    id: partial.id ?? uuid(),
    type: "text",
    x: partial.x ?? 80,
    y: partial.y ?? 80,
    width: partial.width ?? 420,
    height: partial.height ?? 120,
    role: partial.role ?? "body",
    text: partial.text ?? "New text",
    listStyle: partial.listStyle ?? "none",
    fontSize: partial.fontSize ?? 20,
    fontWeight: partial.fontWeight ?? 400,
    align: partial.align ?? "left",
    color: partial.color ?? "#1f2430",
    rotation: partial.rotation,
  };
}

export function makeImage(partial: Partial<ImageElement> = {}): ImageElement {
  return {
    id: partial.id ?? uuid(),
    type: "image",
    x: partial.x ?? 100,
    y: partial.y ?? 100,
    width: partial.width ?? 360,
    height: partial.height ?? 240,
    src: partial.src ?? "https://picsum.photos/seed/slide/800/600",
    alt: partial.alt ?? "Image",
    fit: partial.fit ?? "cover",
    radius: partial.radius ?? 8,
    rotation: partial.rotation,
  };
}

const DEFAULT_CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

export function makeChartSpec(partial: Partial<ChartSpec> = {}): ChartSpec {
  return {
    chartType: partial.chartType ?? "bar",
    title: partial.title ?? "Chart",
    categories: partial.categories ?? ["Q1", "Q2", "Q3", "Q4"],
    series: partial.series ?? [{ name: "Series 1", data: [10, 20, 15, 30] }],
    colors: partial.colors ?? DEFAULT_CHART_COLORS,
    showLegend: partial.showLegend ?? true,
    showDataLabels: partial.showDataLabels ?? false,
  };
}

export function makeChart(partial: Partial<ChartElement> = {}): ChartElement {
  return {
    id: partial.id ?? uuid(),
    type: "chart",
    x: partial.x ?? 120,
    y: partial.y ?? 140,
    width: partial.width ?? 480,
    height: partial.height ?? 320,
    chart: makeChartSpec(partial.chart),
    rotation: partial.rotation,
  };
}

export function makeTable(partial: Partial<TableElement> = {}): TableElement {
  return {
    id: partial.id ?? uuid(),
    type: "table",
    x: partial.x ?? 120,
    y: partial.y ?? 140,
    width: partial.width ?? 500,
    height: partial.height ?? 220,
    hasHeaderRow: partial.hasHeaderRow ?? true,
    rows:
      partial.rows ?? [
        ["Column A", "Column B", "Column C"],
        ["Row 1", "-", "-"],
        ["Row 2", "-", "-"],
      ],
    rotation: partial.rotation,
  };
}

export function makeShape(partial: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: partial.id ?? uuid(),
    type: "shape",
    x: partial.x ?? 150,
    y: partial.y ?? 150,
    width: partial.width ?? 200,
    height: partial.height ?? 200,
    shape: partial.shape ?? "rect",
    fill: partial.fill ?? "#e2e8f0",
    stroke: partial.stroke,
    strokeWidth: partial.strokeWidth,
    rotation: partial.rotation,
  };
}

export function defaultElementFor(type: SlideElement["type"]): SlideElement {
  switch (type) {
    case "text":
      return makeText();
    case "image":
      return makeImage();
    case "chart":
      return makeChart();
    case "table":
      return makeTable();
    case "shape":
      return makeShape();
    case "icon":
      return { id: uuid(), type: "icon", x: 150, y: 150, width: 64, height: 64, icon: "star", color: "#6366f1" };
  }
}
