import { ShapeElement } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { Field, inputClass } from "./fields";

export default function ShapeInspector({ slideId, element }: { slideId: string; element: ShapeElement }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const patch = (p: Partial<ShapeElement>) => applyOp({ type: "update_element", slideId, elementId: element.id, patch: p });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Shape">
        <select className={inputClass} value={element.shape} onChange={(e) => patch({ shape: e.target.value as ShapeElement["shape"] })}>
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="line">Line</option>
        </select>
      </Field>
      <Field label="Fill">
        <input type="color" value={element.fill} onChange={(e) => patch({ fill: e.target.value })} className="h-8 w-full" />
      </Field>
      <Field label="Stroke">
        <input type="color" value={element.stroke ?? "#000000"} onChange={(e) => patch({ stroke: e.target.value })} className="h-8 w-full" />
      </Field>
    </div>
  );
}
