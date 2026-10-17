import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, BoundingBox, Slide, SlideElement } from "@/types/deck";
import { useDeckStore } from "@/store/deckStore";
import { DeckOp } from "@/store/ops";
import { snapBox, Guides, GRID_SIZE, clampGroupOffset, findGroupDropPosition } from "@/lib/snap";
import { clampBox } from "@/lib/elementFactory";
import { backgroundStyle } from "@/lib/background";
import { findSlideAtPoint } from "@/lib/dragRegistry";
import ElementContent from "./ElementContent";
import SelectionOverlay, { HandlePos } from "./SelectionOverlay";

type DragInfo =
  | {
      kind: "move";
      elementIds: string[];
      primaryId: string;
      pointerStart: { x: number; y: number };
      startBoxes: Record<string, BoundingBox>;
    }
  | {
      kind: "resize";
      elementId: string;
      handle: HandlePos;
      pointerStart: { x: number; y: number };
      startBox: BoundingBox;
    }
  | { kind: "marquee"; pointerStart: { x: number; y: number }; current: { x: number; y: number }; additive: boolean };

const MIN_W = 40;
const MIN_H = 30;

export default function Artboard({ slide }: { slide: Slide }) {
  const selection = useDeckStore((s) => s.selection);
  const applyOp = useDeckStore((s) => s.applyOp);
  const applyOps = useDeckStore((s) => s.applyOps);
  const selectElements = useDeckStore((s) => s.selectElements);
  const clearSelection = useDeckStore((s) => s.clearSelection);
  const lastTouchedElementId = useDeckStore((s) => s.lastTouchedElementId);
  const setHoveredDropSlideId = useDeckStore((s) => s.setHoveredDropSlideId);
  const editingElementId = useDeckStore((s) => s.editingElementId);
  const setEditingElementId = useDeckStore((s) => s.setEditingElementId);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [transient, setTransient] = useState<Record<string, BoundingBox>>({});
  const [guides, setGuides] = useState<Guides | null>(null);
  const [dropTargetSlideId, setDropTargetSlideId] = useState<string | null>(null);
  // read live so toggling Alt mid-drag switches move/copy before drop
  const [liveAltKey, setLiveAltKey] = useState(false);

  const isActiveSlide = selection.slideId === slide.id;
  const selectedIds = isActiveSlide ? selection.elementIds : [];

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(w / ARTBOARD_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toArtboardPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current!.getBoundingClientRect();
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    },
    [scale]
  );

  const boxOf = (el: SlideElement): BoundingBox => ({ x: el.x, y: el.y, width: el.width, height: el.height });

  // ---- element pointer down: select + start move drag ----
  const onElementPointerDown = (e: React.PointerEvent, el: SlideElement) => {
    if (editingElementId === el.id) return; // let inline edit handle its own events
    e.stopPropagation();

    // e.detail===2 is unreliable on some trackpads, so also check timing manually
    const now = Date.now();
    const isDoubleClick =
      e.detail === 2 || (lastClickRef.current?.id === el.id && now - lastClickRef.current.time < 400);
    lastClickRef.current = { id: el.id, time: now };

    if (isDoubleClick && (el.type === "text" || el.type === "table")) {
      setEditingElementId(el.id);
      return;
    }

    const sel = selectedIds;
    let next: string[];
    if (e.shiftKey) {
      next = sel.includes(el.id) ? sel.filter((id) => id !== el.id) : [...sel, el.id];
    } else if (sel.includes(el.id) && sel.length > 1) {
      next = sel;
    } else {
      next = [el.id];
    }
    selectElements(next, slide.id);
    setEditingElementId(null);

    const startBoxes: Record<string, BoundingBox> = {};
    for (const id of next) {
      const found = slide.elements.find((e2) => e2.id === id);
      if (found) startBoxes[id] = boxOf(found);
    }
    setLiveAltKey(e.altKey);
    setDrag({
      kind: "move",
      elementIds: next,
      primaryId: el.id,
      pointerStart: toArtboardPoint(e.clientX, e.clientY),
      startBoxes,
    });
  };

  const onResizeStart = (handle: HandlePos, e: React.PointerEvent, el: SlideElement) => {
    e.stopPropagation();
    selectElements([el.id], slide.id);
    setDrag({
      kind: "resize",
      elementId: el.id,
      handle,
      pointerStart: toArtboardPoint(e.clientX, e.clientY),
      startBox: boxOf(el),
    });
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    setEditingElementId(null);
    if (!e.shiftKey) clearSelection();
    const pt = toArtboardPoint(e.clientX, e.clientY);
    setDrag({ kind: "marquee", pointerStart: pt, current: pt, additive: e.shiftKey });
  };

  // ---- global pointermove/up while dragging ----
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (drag.kind === "move") {
        setLiveAltKey(e.altKey);
        const pt = toArtboardPoint(e.clientX, e.clientY);
        const dx = pt.x - drag.pointerStart.x;
        const dy = pt.y - drag.pointerStart.y;

        const hoverSlide = findSlideAtPoint(e.clientX, e.clientY);
        const crossSlide = hoverSlide && hoverSlide !== slide.id ? hoverSlide : null;
        setDropTargetSlideId(crossSlide);
        setHoveredDropSlideId(crossSlide);

        if (crossSlide) {
          setGuides(null);
          return;
        }

        const primaryStart = drag.startBoxes[drag.primaryId];
        const rawPrimary = { ...primaryStart, x: primaryStart.x + dx, y: primaryStart.y + dy };
        const others = slide.elements
          .filter((e2) => !drag.elementIds.includes(e2.id))
          .map(boxOf);
        const snapped = snapBox(rawPrimary, others);
        const snapDx = snapped.x - primaryStart.x;
        const snapDy = snapped.y - primaryStart.y;

        // clamp the group as one unit so it doesn't break apart near an edge
        const { dx: actualDx, dy: actualDy } = clampGroupOffset(
          drag.elementIds.map((id) => drag.startBoxes[id]),
          snapDx,
          snapDy
        );

        const nextTransient: Record<string, BoundingBox> = {};
        for (const id of drag.elementIds) {
          const sb = drag.startBoxes[id];
          nextTransient[id] = { x: sb.x + actualDx, y: sb.y + actualDy, width: sb.width, height: sb.height };
        }
        setTransient(nextTransient);
        setGuides(snapped.guides);
      } else if (drag.kind === "resize") {
        const pt = toArtboardPoint(e.clientX, e.clientY);
        const dx = pt.x - drag.pointerStart.x;
        const dy = pt.y - drag.pointerStart.y;
        const sb = drag.startBox;
        let { x, y, width, height } = sb;

        if (drag.handle.includes("e")) width = sb.width + dx;
        if (drag.handle.includes("s")) height = sb.height + dy;
        if (drag.handle.includes("w")) {
          width = sb.width - dx;
          x = sb.x + dx;
        }
        if (drag.handle.includes("n")) {
          height = sb.height - dy;
          y = sb.y + dy;
        }

        if (width < MIN_W) {
          if (drag.handle.includes("w")) x -= MIN_W - width;
          width = MIN_W;
        }
        if (height < MIN_H) {
          if (drag.handle.includes("n")) y -= MIN_H - height;
          height = MIN_H;
        }

        const clamped = clampBox({
          x: Math.round(x / GRID_SIZE) * GRID_SIZE,
          y: Math.round(y / GRID_SIZE) * GRID_SIZE,
          width: Math.round(width / GRID_SIZE) * GRID_SIZE,
          height: Math.round(height / GRID_SIZE) * GRID_SIZE,
        });
        setTransient({ [drag.elementId]: clamped });
      } else if (drag.kind === "marquee") {
        setDrag({ ...drag, current: toArtboardPoint(e.clientX, e.clientY) });
      }
    };

    const onUp = () => {
      if (drag.kind === "move") {
        if (dropTargetSlideId) {
          const toSlide = useDeckStore.getState().deck.slides.find((s) => s.id === dropTargetSlideId);
          const boxes = drag.elementIds.map((id) => drag.startBoxes[id]);
          // box in the original coords -- this is what we search for free space with
          const groupBox = {
            x: Math.min(...boxes.map((b) => b.x)),
            y: Math.min(...boxes.map((b) => b.y)),
            width: Math.max(...boxes.map((b) => b.x + b.width)) - Math.min(...boxes.map((b) => b.x)),
            height: Math.max(...boxes.map((b) => b.y + b.height)) - Math.min(...boxes.map((b) => b.y)),
          };
          const anchor = toSlide
            ? findGroupDropPosition(groupBox, toSlide.elements.map(boxOf))
            : { x: groupBox.x, y: groupBox.y };
          const { dx: groupDx, dy: groupDy } = clampGroupOffset(boxes, anchor.x - groupBox.x, anchor.y - groupBox.y);

          const copy = liveAltKey;
          const ops: DeckOp[] = drag.elementIds.map((id) => {
            const sb = drag.startBoxes[id];
            return {
              type: "move_element",
              fromSlideId: slide.id,
              toSlideId: dropTargetSlideId,
              elementId: id,
              x: sb.x + groupDx,
              y: sb.y + groupDy,
              copy,
              newElementId: copy ? uuid() : undefined,
            };
          });
          applyOps(ops);
          clearSelection();
        } else {
          const moved = drag.elementIds.some((id) => {
            const t = transient[id];
            const o = drag.startBoxes[id];
            return t && (Math.abs(t.x - o.x) > 0.5 || Math.abs(t.y - o.y) > 0.5);
          });
          if (moved) {
            const ops: DeckOp[] = drag.elementIds
              .filter((id) => transient[id])
              .map((id) => ({
                type: "update_element",
                slideId: slide.id,
                elementId: id,
                patch: { x: transient[id].x, y: transient[id].y },
              }));
            applyOps(ops);
          }
        }
      } else if (drag.kind === "resize") {
        const box = transient[drag.elementId];
        if (box) {
          applyOp({ type: "update_element", slideId: slide.id, elementId: drag.elementId, patch: box });
        }
      } else if (drag.kind === "marquee") {
        const rx = Math.min(drag.pointerStart.x, drag.current.x);
        const ry = Math.min(drag.pointerStart.y, drag.current.y);
        const rw = Math.abs(drag.current.x - drag.pointerStart.x);
        const rh = Math.abs(drag.current.y - drag.pointerStart.y);
        const hits = slide.elements
          .filter((el) => el.x < rx + rw && el.x + el.width > rx && el.y < ry + rh && el.y + el.height > ry)
          .map((el) => el.id);
        if (hits.length > 0) {
          const base = drag.additive ? selectedIds : [];
          const merged = Array.from(new Set([...base, ...hits]));
          selectElements(merged, slide.id);
        }
      }

      setDrag(null);
      setTransient({});
      setGuides(null);
      setDropTargetSlideId(null);
      setHoveredDropSlideId(null);
      setLiveAltKey(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrag(null);
        setTransient({});
        setGuides(null);
        setDropTargetSlideId(null);
        setLiveAltKey(false);
        setHoveredDropSlideId(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, dropTargetSlideId, transient]);

  const boxFor = (el: SlideElement): BoundingBox => transient[el.id] ?? boxOf(el);

  const commitText = (el: SlideElement, text: string) => {
    if (el.type !== "text" || el.text === text) {
      setEditingElementId(null);
      return;
    }
    applyOp({ type: "update_element", slideId: slide.id, elementId: el.id, patch: { text } });
    setEditingElementId(null);
  };

  const commitCell = (el: SlideElement, rowIdx: number, colIdx: number, value: string) => {
    if (el.type !== "table") return;
    const rows = el.rows.map((r) => [...r]);
    rows[rowIdx][colIdx] = value;
    applyOp({ type: "update_element", slideId: slide.id, elementId: el.id, patch: { rows } });
  };

  const marqueeRect =
    drag?.kind === "marquee"
      ? {
          x: Math.min(drag.pointerStart.x, drag.current.x) * scale,
          y: Math.min(drag.pointerStart.y, drag.current.y) * scale,
          width: Math.abs(drag.current.x - drag.pointerStart.x) * scale,
          height: Math.abs(drag.current.y - drag.pointerStart.y) * scale,
        }
      : null;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full select-none shadow-xl"
      style={{
        aspectRatio: "16/9",
        maxWidth: 1120,
        ...backgroundStyle(slide.background),
      }}
      onPointerDown={onCanvasPointerDown}
    >
      {slide.elements.map((el) => {
        const box = boxFor(el);
        const isSelected = selectedIds.includes(el.id);
        const isTouched = lastTouchedElementId === el.id;
        // z-index follows array order (Forward/Backward reorders it), not
        // selection -- only float an element up while it's being dragged.
        const isDragging = drag?.kind === "move" && drag.elementIds.includes(el.id);
        return (
          <div
            key={el.id}
            onPointerDown={(e) => onElementPointerDown(e, el)}
            style={{
              position: "absolute",
              left: box.x * scale,
              top: box.y * scale,
              width: box.width * scale,
              height: box.height * scale,
              cursor: "move",
              transition: drag ? "none" : "box-shadow 0.2s",
              boxShadow: isTouched ? "0 0 0 3px #f59e0b" : undefined,
              zIndex: isDragging ? 1000 : undefined,
            }}
          >
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              {/* Render content at its TRUE artboard-unit size, then scale the
                  whole thing down with a CSS transform -- the same pattern
                  SlideSurface uses for thumbnails/print. This keeps fonts,
                  strokes, and chart tick sizes visually consistent between
                  the live canvas, the filmstrip, and exported output,
                  instead of rendering content at literal unscaled pixel
                  values inside an already-shrunk container. */}
              <div style={{ width: box.width, height: box.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <ElementContent
                  element={el}
                  editing={editingElementId === el.id}
                  onCommitText={(text) => commitText(el, text)}
                  onCommitCell={(r, c, v) => commitCell(el, r, c, v)}
                />
              </div>
            </div>
            {isSelected && selectedIds.length === 1 && (
              <SelectionOverlay
                box={{ x: 0, y: 0, width: box.width * scale, height: box.height * scale }}
                showHandles={!drag || drag.kind === "resize"}
                onResizeStart={(handle, e) => onResizeStart(handle, e, el)}
              />
            )}
            {isSelected && selectedIds.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "1.5px dashed #6366f1",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        );
      })}

      {guides?.vertical.map((x, i) => (
        <div
          key={`v${i}`}
          style={{ position: "absolute", left: x * scale, top: 0, bottom: 0, width: 1, background: "#f43f5e" }}
        />
      ))}
      {guides?.horizontal.map((y, i) => (
        <div
          key={`h${i}`}
          style={{ position: "absolute", top: y * scale, left: 0, right: 0, height: 1, background: "#f43f5e" }}
        />
      ))}

      {marqueeRect && (
        <div
          style={{
            position: "absolute",
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid #6366f1",
          }}
        />
      )}

      {dropTargetSlideId && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-indigo-500/10">
          <span className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
            Drop on another slide to {liveAltKey ? "copy" : "move"}
          </span>
        </div>
      )}
    </div>
  );
}
