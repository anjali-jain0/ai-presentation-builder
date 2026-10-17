import { useEffect } from "react";
import { v4 as uuid } from "uuid";
import { useDeckStore } from "@/store/deckStore";
import { DeckOp } from "@/store/ops";
import { GRID_SIZE, clampGroupOffset } from "@/lib/snap";
import { clampBox } from "@/lib/elementFactory";
import { setClipboard, getClipboard, hasClipboard } from "@/lib/clipboard";
import { useCanvasActions } from "./useCanvasActions";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function useKeyboardShortcuts() {
  const applyOps = useDeckStore((s) => s.applyOps);
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const clearSelection = useDeckStore((s) => s.clearSelection);
  const { duplicateSelected, deleteSelected } = useCanvasActions();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (isEditableTarget(document.activeElement)) return;

      const { deck, selection } = useDeckStore.getState();
      const slide = deck.slides.find((s) => s.id === selection.slideId);
      if (!slide) return;

      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (slide.elements.length > 0) {
          useDeckStore.getState().selectElements(
            slide.elements.map((el) => el.id),
            slide.id
          );
        }
        return;
      }

      if (meta && e.key.toLowerCase() === "d" && selection.elementIds.length > 0) {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (meta && e.key.toLowerCase() === "c" && selection.elementIds.length > 0) {
        e.preventDefault();
        const toCopy = slide.elements.filter((el) => selection.elementIds.includes(el.id));
        setClipboard(toCopy);
        return;
      }

      if (meta && e.key.toLowerCase() === "x" && selection.elementIds.length > 0) {
        e.preventDefault();
        const toCut = slide.elements.filter((el) => selection.elementIds.includes(el.id));
        setClipboard(toCut);
        deleteSelected();
        return;
      }

      if (meta && e.key.toLowerCase() === "v" && hasClipboard()) {
        e.preventDefault();
        const clipped = getClipboard();
        const { dx, dy } = clampGroupOffset(clipped, 20, 20);
        const newIds: string[] = [];
        // pastes onto whichever slide is currently open, so this covers cross-slide paste too
        const pasted = clipped.map((el) => {
          const newId = uuid();
          newIds.push(newId);
          const box = clampBox({ x: el.x + dx, y: el.y + dy, width: el.width, height: el.height });
          return { ...el, ...box, id: newId };
        });
        const ops: DeckOp[] = pasted.map((element) => ({ type: "add_element", slideId: slide.id, element }) as DeckOp);
        applyOps(ops);
        useDeckStore.getState().selectElements(newIds, slide.id);
        setClipboard(pasted); // so a second paste cascades instead of stacking
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selection.elementIds.length > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      const nudgeKeys: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (nudgeKeys[e.key] && selection.elementIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? GRID_SIZE * 2 : GRID_SIZE / 2;
        const [dx, dy] = nudgeKeys[e.key];
        const selected = selection.elementIds.flatMap((id) => {
          const el = slide.elements.find((e2) => e2.id === id);
          return el ? [el] : [];
        });
        if (selected.length === 0) return;
        const { dx: clampedDx, dy: clampedDy } = clampGroupOffset(selected, dx * step, dy * step);
        if (clampedDx === 0 && clampedDy === 0) return;
        const ops: DeckOp[] = selected.map(
          (el) =>
            ({
              type: "update_element",
              slideId: slide.id,
              elementId: el.id,
              patch: { x: el.x + clampedDx, y: el.y + clampedDy },
            }) as DeckOp
        );
        applyOps(ops);
        return;
      }

      // arrow keys only navigate slides when nothing's selected (otherwise they nudge, above)
      const isNextKey = e.key === "PageDown" || e.key === "ArrowDown";
      const isPrevKey = e.key === "PageUp" || e.key === "ArrowUp";
      if (isNextKey || isPrevKey) {
        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && selection.elementIds.length > 0) return;
        e.preventDefault();
        const idx = deck.slides.findIndex((s) => s.id === selection.slideId);
        const nextIdx = isNextKey ? idx + 1 : idx - 1;
        const next = deck.slides[nextIdx];
        if (next) useDeckStore.getState().selectSlide(next.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyOps, undo, redo, clearSelection, duplicateSelected, deleteSelected]);
}
