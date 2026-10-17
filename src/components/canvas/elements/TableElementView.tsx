import { TableElement } from "@/types/deck";

interface Props {
  element: TableElement;
  editing: boolean;
  onCommitCell: (rowIdx: number, colIdx: number, value: string) => void;
}

export default function TableElementView({ element, editing, onCommitCell }: Props) {
  return (
    <table className="h-full w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
      <tbody>
        {element.rows.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, colIdx) => {
              const isHeader = element.hasHeaderRow && rowIdx === 0;
              return (
                <td
                  key={colIdx}
                  data-row={rowIdx}
                  data-col={colIdx}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onPointerDown={(e) => editing && e.stopPropagation()}
                  onBlur={(e) => {
                    if (!editing) return;
                    const value = e.currentTarget.innerText;
                    if (value !== cell) onCommitCell(rowIdx, colIdx, value);
                  }}
                  className="overflow-hidden border border-slate-300 px-2 py-1 align-top"
                  style={{
                    fontWeight: isHeader ? 700 : 400,
                    background: isHeader ? "#f1f5f9" : "white",
                    cursor: editing ? "text" : "inherit",
                  }}
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
