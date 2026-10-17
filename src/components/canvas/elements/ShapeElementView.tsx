import { ShapeElement } from "@/types/deck";

export default function ShapeElementView({ element }: { element: ShapeElement }) {
  if (element.shape === "line") {
    return (
      <div className="flex h-full w-full items-center">
        <div
          className="w-full"
          style={{
            height: element.strokeWidth ?? 3,
            background: element.stroke ?? element.fill,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full w-full"
      style={{
        background: element.fill,
        border: element.stroke ? `${element.strokeWidth ?? 2}px solid ${element.stroke}` : undefined,
        borderRadius: element.shape === "ellipse" ? "50%" : 8,
      }}
    />
  );
}
