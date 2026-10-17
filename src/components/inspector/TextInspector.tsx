import { TextElement } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { Field, inputClass } from "./fields";

export default function TextInspector({ slideId, element }: { slideId: string; element: TextElement }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const patch = (p: Partial<TextElement>) =>
    applyOp({ type: "update_element", slideId, elementId: element.id, patch: p });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Role">
        <select className={inputClass} value={element.role} onChange={(e) => patch({ role: e.target.value as TextElement["role"] })}>
          <option value="title">Title</option>
          <option value="subtitle">Subtitle</option>
          <option value="body">Body</option>
          <option value="bullets">Bullets</option>
          <option value="caption">Caption</option>
        </select>
      </Field>
      <Field label="List style">
        <select
          className={inputClass}
          value={element.listStyle ?? "none"}
          onChange={(e) => patch({ listStyle: e.target.value as TextElement["listStyle"] })}
        >
          <option value="none">None</option>
          <option value="bullet">Bulleted</option>
          <option value="number">Numbered</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Font size">
          <input
            type="number"
            className={inputClass}
            value={element.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Weight">
          <select
            className={inputClass}
            value={element.fontWeight}
            onChange={(e) => patch({ fontWeight: Number(e.target.value) as TextElement["fontWeight"] })}
          >
            {[400, 500, 600, 700, 800].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Align">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => patch({ align: a })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize ${
                element.align === a ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Color">
        <input type="color" value={element.color} onChange={(e) => patch({ color: e.target.value })} className="h-8 w-full" />
      </Field>
    </div>
  );
}
