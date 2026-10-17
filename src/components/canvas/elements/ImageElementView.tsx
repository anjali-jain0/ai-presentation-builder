import { ImageElement } from "@/types/deck";

export default function ImageElementView({ element }: { element: ImageElement }) {
  return (
    <img
      src={element.src}
      alt={element.alt ?? ""}
      draggable={false}
      className="h-full w-full select-none"
      style={{
        objectFit: element.fit,
        borderRadius: element.radius ?? 0,
      }}
    />
  );
}
