import { z } from "zod";

// runtime validation for tool call args -- TS types don't check what the model actually sends

const LAYOUTS = ["title", "content", "two-column", "comparison", "section-break", "chart-forward", "blank"] as const;
const CHART_TYPES = ["bar", "line", "pie", "area"] as const;
const TEXT_ROLES = ["title", "subtitle", "body", "bullets", "caption"] as const;

const box = {
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  width: z.number().finite().positive().optional(),
  height: z.number().finite().positive().optional(),
};

const nonEmpty = z.string().min(1);

// nonempty and rectangular -- every row must have the same column count
const tableRows = z
  .array(z.array(z.string()).min(1, "Each table row must have at least one column."))
  .min(1, "A table must have at least one row.")
  .refine((rows) => rows.every((r) => r.length === rows[0].length), {
    message: "All table rows must have the same number of columns (the table must be rectangular).",
  });

const seriesEntry = z.object({
  name: z
    .string()
    .min(1, "Series name cannot be empty.")
    .refine((n) => n.trim().toLowerCase() !== "category", {
      message: 'Series name cannot be "category" -- that key is reserved for the chart\'s x-axis/category field.',
    }),
  data: z.array(z.number().finite()).default([]),
});

const seriesSchema = z
  .array(seriesEntry)
  .min(1)
  .refine((series) => new Set(series.map((s) => s.name.trim().toLowerCase())).size === series.length, {
    message: "Series names must be unique.",
  });

export const TOOL_SCHEMAS = {
  add_slide: z.object({
    title: nonEmpty,
    layout: z.enum(LAYOUTS),
    afterSlideId: z.string().optional(),
    backgroundColor: z.string().optional(),
    notes: z.string().optional(),
  }),
  update_slide: z.object({
    slideId: nonEmpty,
    title: z.string().optional(),
    layout: z.enum(LAYOUTS).optional(),
    backgroundColor: z.string().optional(),
    notes: z.string().optional(),
  }),
  delete_slide: z.object({ slideId: nonEmpty }),
  reorder_slides: z.object({ slideIds: z.array(nonEmpty).min(1) }),
  duplicate_slide: z.object({ slideId: nonEmpty }),
  change_layout: z.object({ slideId: nonEmpty, layout: z.enum(LAYOUTS) }),

  add_text_element: z.object({
    slideId: nonEmpty,
    text: z.string(),
    role: z.enum(TEXT_ROLES),
    listStyle: z.enum(["none", "bullet", "number"]).optional(),
    fontSize: z.number().finite().positive().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    color: z.string().optional(),
    ...box,
  }),
  add_image_element: z.object({
    slideId: nonEmpty,
    src: nonEmpty,
    alt: z.string().optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    ...box,
  }),
  add_shape_element: z.object({
    slideId: nonEmpty,
    shape: z.enum(["rect", "ellipse", "line"]).optional(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    ...box,
  }),
  add_table_element: z.object({
    slideId: nonEmpty,
    rows: tableRows,
    hasHeaderRow: z.boolean().optional(),
    ...box,
  }),
  add_chart: z
    .object({
      slideId: nonEmpty,
      chartType: z.enum(CHART_TYPES),
      title: z.string().optional(),
      categories: z.array(z.string()).default([]),
      series: seriesSchema,
      ...box,
    })
    .refine((data) => data.series.every((s) => s.data.length === data.categories.length), {
      message: "Each series' data array must have the same length as categories.",
      path: ["series"],
    }),

  update_text: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    text: z.string().optional(),
    role: z.enum(TEXT_ROLES).optional(),
    listStyle: z.enum(["none", "bullet", "number"]).optional(),
    fontSize: z.number().finite().positive().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    color: z.string().optional(),
  }),
  update_image: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    src: z.string().optional(),
    fit: z.enum(["cover", "contain"]).optional(),
  }),
  update_shape: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    shape: z.enum(["rect", "ellipse", "line"]).optional(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
  }),
  update_table: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    rows: tableRows.optional(),
    hasHeaderRow: z.boolean().optional(),
  }),

  delete_element: z.object({ slideId: nonEmpty, elementId: nonEmpty }),
  move_element: z.object({
    fromSlideId: nonEmpty,
    toSlideId: nonEmpty,
    elementId: nonEmpty,
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    copy: z.boolean().optional(),
  }),
  resize_element: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  }),
  reorder_elements: z.object({ slideId: nonEmpty, elementIds: z.array(nonEmpty).min(1) }),

  update_chart_data: z
    .object({
      slideId: nonEmpty,
      elementId: nonEmpty,
      categories: z.array(z.string()).optional(),
      series: seriesSchema.optional(),
    })
    .refine((data) => !data.categories || !data.series || data.series.every((s) => s.data.length === data.categories!.length), {
      message: "Each series' data array must have the same length as categories.",
      path: ["series"],
    }),
  change_chart_type: z.object({
    slideId: nonEmpty,
    elementId: nonEmpty,
    chartType: z.enum(CHART_TYPES),
  }),
} as const;
