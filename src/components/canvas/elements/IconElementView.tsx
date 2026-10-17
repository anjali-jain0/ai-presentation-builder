import { IconElement } from "@/types/deck";

const PATHS: Record<string, string> = {
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M13 5l7 7-7 7",
  bolt: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  flag: "M4 22V4h14l-3 5 3 5H4",
};

export default function IconElementView({ element }: { element: IconElement }) {
  const d = PATHS[element.icon] ?? PATHS.star;
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke={element.color} strokeWidth={2}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
