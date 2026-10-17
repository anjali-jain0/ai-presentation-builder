import { ChartSpec } from "@/types/deck";

// recharts wants one row object per category, with a key per series
export function toRowData(chart: ChartSpec) {
  return chart.categories.map((category, i) => {
    const row: Record<string, string | number> = { category };
    for (const series of chart.series) {
      row[series.name] = series.data[i] ?? 0;
    }
    return row;
  });
}

// pie only shows one series, so just grab the first one
export function toPieData(chart: ChartSpec) {
  const series = chart.series[0];
  return chart.categories.map((category, i) => ({
    name: category,
    value: series?.data[i] ?? 0,
  }));
}
