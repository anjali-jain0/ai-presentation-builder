import { useRef } from "react";
import { ImageElement } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { Field, inputClass } from "./fields";

export default function ImageInspector({ slideId, element }: { slideId: string; element: ImageElement }) {
  const applyOp = useDeckStore((s) => s.applyOp);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<ImageElement>) => applyOp({ type: "update_element", slideId, elementId: element.id, patch: p });

  const replaceFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ src: String(reader.result) });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <img src={element.src} alt="" className="h-28 w-full rounded-md border border-slate-200 object-cover" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Replace image
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={replaceFromFile} />
      <Field label="Image URL">
        <input className={inputClass} value={element.src} onChange={(e) => patch({ src: e.target.value })} />
      </Field>
      <Field label="Fit">
        <select className={inputClass} value={element.fit} onChange={(e) => patch({ fit: e.target.value as ImageElement["fit"] })}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
      </Field>
    </div>
  );
}
