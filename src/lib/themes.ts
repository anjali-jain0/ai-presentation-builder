export interface Theme {
  id: string;
  name: string;
  background: string;
  titleColor: string;
  bodyColor: string;
  accent: string;
  fontFamily: string;
}

export const THEMES: Theme[] = [
  {
    id: "light",
    name: "Light",
    background: "#ffffff",
    titleColor: "#111827",
    bodyColor: "#374151",
    accent: "#6366f1",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "dark",
    name: "Midnight",
    background: "#0f172a",
    titleColor: "#f8fafc",
    bodyColor: "#cbd5e1",
    accent: "#38bdf8",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "warm",
    name: "Warm",
    background: "#fff7ed",
    titleColor: "#7c2d12",
    bodyColor: "#78350f",
    accent: "#ea580c",
    fontFamily: "'Georgia', serif",
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
