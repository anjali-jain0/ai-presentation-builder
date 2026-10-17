import { TableElement } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";

export default function TableInspector({ slideId, element }: { slideId: string; element: TableElement }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const patch = (p: Partial<TableElement>) => applyOp({ type: "update_element", slideId, elementId: element.id, patch: p });

  const colCount = element.rows[0]?.length ?? 0;

  const addRow = () => patch({ rows: [...element.rows, Array.from({ length: Math.max(colCount, 1) }, () => "")] });
  const addCol = () => patch({ rows: element.rows.map((r) => [...r, ""]) });
  const removeRow = (idx: number) => patch({ rows: element.rows.filter((_, i) => i !== idx) });
  const removeCol = (idx: number) => patch({ rows: element.rows.map((r) => r.filter((_, i) => i !== idx)) });

  if (element.rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-red-500">This table has no rows, which shouldn't normally happen.</p>
        <button onClick={addRow} className="rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Add a row to recover it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={element.hasHeaderRow} onChange={(e) => patch({ hasHeaderRow: e.target.checked })} />
        First row is header
      </label>
      <div className="flex gap-3 text-xs">
        <button onClick={addRow} className="text-indigo-600 hover:underline">
          + row
        </button>
        <button onClick={addCol} className="text-indigo-600 hover:underline">
          + column
        </button>
      </div>
      <p className="text-xs text-slate-400">Edit cell text directly on the canvas (double-click the table).</p>
      <div className="flex flex-col gap-1">
        {element.rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <span className="w-4 text-slate-400">{i + 1}</span>
            <span className="flex-1 truncate rounded border border-slate-200 px-1.5 py-1">{row.join(" · ")}</span>
            {element.rows.length > 1 && (
              <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500">
                ✕
              </button>
            )}
          </div>
        ))}
        {colCount > 1 && (
          <button onClick={() => removeCol(colCount - 1)} className="self-start text-xs text-slate-400 hover:text-red-500">
            Remove last column
          </button>
        )}
      </div>
    </div>
  );
}
