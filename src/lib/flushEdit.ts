import { useDeckStore } from "@/store/deckStore";

// if an inline text/table edit is in progress, commits whatever's currently
// in the DOM directly 
export function flushEditingElement() {
  const { editingElementId, deck, selection, applyOp } = useDeckStore.getState();
  if (!editingElementId) return;
  const active = document.activeElement as HTMLElement | null;
  if (!active?.isContentEditable) return;

  const slide = deck.slides.find((s) => s.id === selection.slideId);
  const el = slide?.elements.find((e) => e.id === editingElementId);
  if (!slide || !el) return;

  if (el.type === "text") {
    const text = active.innerText.replace(/\u00A0/g, " ");
    if (text !== el.text) {
      applyOp({ type: "update_element", slideId: slide.id, elementId: el.id, patch: { text } });
    }
  } else if (el.type === "table" && active.dataset.row !== undefined && active.dataset.col !== undefined) {
    const rowIdx = Number(active.dataset.row);
    const colIdx = Number(active.dataset.col);
    const value = active.innerText;
    if (el.rows[rowIdx]?.[colIdx] !== value) {
      const rows = el.rows.map((r) => [...r]);
      rows[rowIdx][colIdx] = value;
      applyOp({ type: "update_element", slideId: slide.id, elementId: el.id, patch: { rows } });
    }
  }
}
