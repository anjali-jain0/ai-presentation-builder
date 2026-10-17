// rolled these by hand instead of adding an icon library, 24x24 / 2px stroke

type IconProps = { className?: string };
const base = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };

export function TextIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" className={p.className}>
      <path d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  );
}

export function ImageIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 20" />
    </svg>
  );
}

export function ChartIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" className={p.className}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

export function TableIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" className={p.className}>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 10h18M3 16h18M9 4v16" />
    </svg>
  );
}

export function ShapeIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" className={p.className}>
      <rect x="3" y="5" width="8" height="8" rx="1" />
      <circle cx="16.5" cy="16.5" r="4.5" />
    </svg>
  );
}

export function DuplicateIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M4 16V4a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function DeleteIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
    </svg>
  );
}

export function ForwardIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 4l9 16 9-16" />
    </svg>
  );
}

export function BackwardIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 20l9-16 9 16" />
    </svg>
  );
}

export function UndoIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export function RedoIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}

export function SlideIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" className={p.className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h6M7 14h4" />
    </svg>
  );
}

export function ExportIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M12 15V3M7 10l5 5 5-5" />
      <path d="M3 17v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function PresentIcon(p: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 16v5" />
      <path d="M10 8l5 2.5-5 2.5V8z" fill="currentColor" stroke="none" />
    </svg>
  );
}
