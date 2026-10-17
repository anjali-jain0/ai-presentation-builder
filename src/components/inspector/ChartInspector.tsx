import { ChartElement, ChartType } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { Field, inputClass } from "./fields";

const CHART_TYPES: ChartType[] = ["bar", "line", "pie", "area"];

export default function ChartInspector({ slideId, element }: { slideId: string; element: ChartElement }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const { chart } = element;

  const patchChart = (patch: Partial<ChartElement["chart"]>) =>
    applyOp({ type: "update_element", slideId, elementId: element.id, patch: { chart: { ...chart, ...patch } } });

  const setCategory = (idx: number, value: string) => {
    const categories = [...chart.categories];
    categories[idx] = value;
    patchChart({ categories });
  };

  const setValue = (seriesIdx: number, catIdx: number, value: number) => {
    const series = chart.series.map((s, i) =>
      i === seriesIdx ? { ...s, data: s.data.map((d, j) => (j === catIdx ? value : d)) } : s
    );
    patchChart({ series });
  };

  const setSeriesName = (seriesIdx: number, name: string) => {
    const series = chart.series.map((s, i) => (i === seriesIdx ? { ...s, name } : s));
    patchChart({ series });
  };

  const addCategory = () => {
    const categories = [...chart.categories, `Cat ${chart.categories.length + 1}`];
    const series = chart.series.map((s) => ({ ...s, data: [...s.data, 0] }));
    patchChart({ categories, series });
  };

  const removeCategory = (idx: number) => {
    const categories = chart.categories.filter((_, i) => i !== idx);
    const series = chart.series.map((s) => ({ ...s, data: s.data.filter((_, i) => i !== idx) }));
    patchChart({ categories, series });
  };

  const addSeries = () => {
    const series = [...chart.series, { name: `Series ${chart.series.length + 1}`, data: chart.categories.map(() => 0) }];
    patchChart({ series });
  };

  const removeSeries = (idx: number) => {
    patchChart({ series: chart.series.filter((_, i) => i !== idx) });
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Title">
        <input className={inputClass} value={chart.title ?? ""} onChange={(e) => patchChart({ title: e.target.value })} />
      </Field>
      <Field label="Chart type (data is preserved)">
        <div className="grid grid-cols-4 gap-1">
          {CHART_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => applyOp({ type: "change_chart_type", slideId, elementId: element.id, chartType: t })}
              className={`rounded-md border px-1 py-1.5 text-xs capitalize ${
                chart.chartType === t ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Data</span>
        <div className="flex gap-2">
          <button onClick={addCategory} className="text-xs text-indigo-600 hover:underline">
            + row
          </button>
          {chart.chartType !== "pie" && (
            <button onClick={addSeries} className="text-xs text-indigo-600 hover:underline">
              + series
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-24 px-1.5 py-1 text-left font-medium">Category</th>
              {chart.series.map((s, i) => (
                <th key={i} className="px-1.5 py-1 text-left font-medium">
                  <div className="flex items-center gap-1">
                    <input
                      value={s.name}
                      onChange={(e) => setSeriesName(i, e.target.value)}
                      className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-300 focus:border-indigo-300 focus:outline-none"
                    />
                    {chart.series.length > 1 && (
                      <button onClick={() => removeSeries(i)} className="text-slate-400 hover:text-red-500">
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {chart.categories.map((cat, catIdx) => (
              <tr key={catIdx} className="border-t border-slate-100">
                <td className="px-1.5 py-1">
                  <input
                    value={cat}
                    onChange={(e) => setCategory(catIdx, e.target.value)}
                    className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-300 focus:border-indigo-300 focus:outline-none"
                  />
                </td>
                {chart.series.map((s, seriesIdx) => (
                  <td key={seriesIdx} className="px-1.5 py-1">
                    <input
                      type="number"
                      value={s.data[catIdx] ?? 0}
                      onChange={(e) => setValue(seriesIdx, catIdx, Number(e.target.value))}
                      className="w-16 rounded border border-transparent px-1 py-0.5 hover:border-slate-300 focus:border-indigo-300 focus:outline-none"
                    />
                  </td>
                ))}
                <td>
                  {chart.categories.length > 1 && (
                    <button onClick={() => removeCategory(catIdx)} className="text-slate-400 hover:text-red-500">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={chart.showLegend ?? true} onChange={(e) => patchChart({ showLegend: e.target.checked })} />
        Show legend
      </label>
    </div>
  );
}
