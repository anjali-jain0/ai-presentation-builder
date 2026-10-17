import { BoundingBox } from "@/types/deck";

export type HandlePos = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: HandlePos[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const CURSORS: Record<HandlePos, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

interface Props {
  box: BoundingBox; // already in screen px, relative to artboard container
  showHandles: boolean;
  onResizeStart?: (handle: HandlePos, e: React.PointerEvent) => void;
}

export default function SelectionOverlay({ box, showHandles, onResizeStart }: Props) {
  const HANDLE_SIZE = 9;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        border: "1.5px solid #6366f1",
        pointerEvents: "none",
        boxShadow: "0 0 0 1px rgba(99,102,241,0.15)",
      }}
    >
      {showHandles &&
        HANDLES.map((h) => {
          const pos: React.CSSProperties = { position: "absolute", width: HANDLE_SIZE, height: HANDLE_SIZE };
          if (h.includes("n")) pos.top = -HANDLE_SIZE / 2;
          if (h.includes("s")) pos.bottom = -HANDLE_SIZE / 2;
          if (h.includes("w")) pos.left = -HANDLE_SIZE / 2;
          if (h.includes("e")) pos.right = -HANDLE_SIZE / 2;
          if (h === "n" || h === "s") pos.left = "50%";
          if (h === "e" || h === "w") pos.top = "50%";
          if (h === "n" || h === "s") (pos as any).marginLeft = -HANDLE_SIZE / 2;
          if (h === "e" || h === "w") (pos as any).marginTop = -HANDLE_SIZE / 2;

          return (
            <div
              key={h}
              style={{
                ...pos,
                background: "white",
                border: "1.5px solid #6366f1",
                borderRadius: 2,
                cursor: CURSORS[h],
                pointerEvents: "auto",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart?.(h, e);
              }}
            />
          );
        })}
    </div>
  );
}
