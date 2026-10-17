import { Slide, SlideLayout } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { Field, inputClass } from "./fields";

const LAYOUTS: SlideLayout[] = ["title", "content", "two-column", "comparison", "section-break", "chart-forward", "blank"];

export default function SlideInspector({ slide }: { slide: Slide }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const patch = (p: Partial<Pick<Slide, "title" | "layout" | "background" | "notes">>) =>
    applyOp({ type: "update_slide", slideId: slide.id, patch: p });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Slide label">
        <input className={inputClass} value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Layout hint">
        <select className={inputClass} value={slide.layout} onChange={(e) => patch({ layout: e.target.value as SlideLayout })}>
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Background color">
        <input
          type="color"
          value={slide.background.kind === "color" ? slide.background.value : "#ffffff"}
          onChange={(e) => patch({ background: { kind: "color", value: e.target.value } })}
          className="h-8 w-full"
        />
      </Field>
      <Field label="Speaker notes">
        <textarea
          className={inputClass}
          rows={5}
          value={slide.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Notes visible in present mode / export…"
        />
      </Field>
      <p className="text-xs text-slate-400">Click an element on the canvas to edit its properties here.</p>
    </div>
  );
}
