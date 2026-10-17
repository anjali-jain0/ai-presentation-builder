import { v4 as uuid } from "uuid";
import { useDeckStore } from "@/store/deckStore";
import { DeckOp } from "@/store/ops";
import { defaultElementFor, makeImage } from "@/lib/elementFactory";
import { clampGroupOffset } from "@/lib/snap";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, SlideElement } from "@/types/deck";

// toolbar buttons and keyboard shortcuts both call into here, one impl for each action
export function useCanvasActions() {
  const applyOp = useDeckStore((s) => s.applyOp);
  const applyOps = useDeckStore((s) => s.applyOps);
  const selectElements = useDeckStore((s) => s.selectElements);
  const clearSelection = useDeckStore((s) => s.clearSelection);
  const setEditingElementId = useDeckStore((s) => s.setEditingElementId);

  function currentSlide() {
    const { deck, selection } = useDeckStore.getState();
    return deck.slides.find((s) => s.id === selection.slideId) ?? null;
  }

  function insertElement(type: SlideElement["type"]) {
    const slide = currentSlide();
    if (!slide) return;
    const el = defaultElementFor(type);
    el.x = ARTBOARD_WIDTH / 2 - el.width / 2;
    el.y = ARTBOARD_HEIGHT / 2 - el.height / 2;
    applyOp({ type: "add_element", slideId: slide.id, element: el });
    selectElements([el.id], slide.id);
    if (type === "text") setEditingElementId(el.id); // start typing immediately, like Slides/Figma
  }

  function insertImageWithSrc(src: string) {
    const slide = currentSlide();
    if (!slide) return;
    const el = makeImage({
      src,
      x: ARTBOARD_WIDTH / 2 - 180,
      y: ARTBOARD_HEIGHT / 2 - 120,
    });
    applyOp({ type: "add_element", slideId: slide.id, element: el });
    selectElements([el.id], slide.id);
  }

  function duplicateSelected() {
    const slide = currentSlide();
    const { selection } = useDeckStore.getState();
    if (!slide || selection.elementIds.length === 0) return;
    const selected = selection.elementIds.flatMap((id) => {
      const el = slide.elements.find((e) => e.id === id);
      return el ? [el] : [];
    });
    if (selected.length === 0) return;
    const { dx, dy } = clampGroupOffset(selected, 20, 20);
    const newIds: string[] = [];
    const ops: DeckOp[] = selected.map((el) => {
      const newId = uuid();
      newIds.push(newId);
      return {
        type: "add_element",
        slideId: slide.id,
        element: { ...JSON.parse(JSON.stringify(el)), id: newId, x: el.x + dx, y: el.y + dy },
      } as DeckOp;
    });
    applyOps(ops);
    selectElements(newIds, slide.id);
  }

  function deleteSelected() {
    const slide = currentSlide();
    const { selection } = useDeckStore.getState();
    if (!slide || selection.elementIds.length === 0) return;
    applyOps(selection.elementIds.map((id) => ({ type: "delete_element", slideId: slide.id, elementId: id }) as DeckOp));
    clearSelection();
  }

  function reorderZ(direction: "forward" | "backward" | "front" | "back") {
    const slide = currentSlide();
    const { selection } = useDeckStore.getState();
    if (!slide || selection.elementIds.length !== 1) return;
    const id = selection.elementIds[0];
    const order = slide.elements.map((e) => e.id);
    const idx = order.indexOf(id);
    if (idx === -1) return;
    order.splice(idx, 1);
    if (direction === "forward") order.splice(Math.min(idx + 1, order.length), 0, id);
    else if (direction === "backward") order.splice(Math.max(idx - 1, 0), 0, id);
    else if (direction === "front") order.push(id);
    else order.unshift(id);
    applyOp({ type: "reorder_elements", slideId: slide.id, elementIds: order });
  }

  return { insertElement, insertImageWithSrc, duplicateSelected, deleteSelected, reorderZ };
}
