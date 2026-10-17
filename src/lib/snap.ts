import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, BoundingBox } from "@/types/deck";

export const GRID_SIZE = 10;
const SNAP_THRESHOLD = 6;

export interface Guides {
  vertical: number[]; // x positions (artboard units) to draw a vertical guide line
  horizontal: number[];
}

interface SnapResult {
  x: number;
  y: number;
  guides: Guides;
}

// snaps box to the grid, or to edges/centers of other elements if closer than the threshold
export function snapBox(
  box: BoundingBox,
  others: BoundingBox[],
  opts: { snapToGrid?: boolean } = {}
): SnapResult {
  const snapToGrid = opts.snapToGrid ?? true;
  let x = box.x;
  let y = box.y;
  const guides: Guides = { vertical: [], horizontal: [] };

  const selfEdgesX = [x, x + box.width / 2, x + box.width];
  const selfEdgesY = [y, y + box.height / 2, y + box.height];

  const candidatesX = [0, ARTBOARD_WIDTH / 2, ARTBOARD_WIDTH];
  const candidatesY = [0, ARTBOARD_HEIGHT / 2, ARTBOARD_HEIGHT];
  for (const other of others) {
    candidatesX.push(other.x, other.x + other.width / 2, other.x + other.width);
    candidatesY.push(other.y, other.y + other.height / 2, other.y + other.height);
  }

  let bestDx = Infinity;
  let bestGuideX: number | null = null;
  for (const edge of selfEdgesX) {
    for (const cand of candidatesX) {
      const d = Math.abs(edge - cand);
      if (d < SNAP_THRESHOLD && d < bestDx) {
        bestDx = d;
        bestGuideX = cand - (edge - x); // resulting x if this edge snaps to cand
      }
    }
  }
  let bestDy = Infinity;
  let bestGuideY: number | null = null;
  for (const edge of selfEdgesY) {
    for (const cand of candidatesY) {
      const d = Math.abs(edge - cand);
      if (d < SNAP_THRESHOLD && d < bestDy) {
        bestDy = d;
        bestGuideY = cand - (edge - y);
      }
    }
  }

  if (bestGuideX !== null) {
    x = bestGuideX;
    guides.vertical.push(x);
    guides.vertical.push(x + box.width / 2);
    guides.vertical.push(x + box.width);
  } else if (snapToGrid) {
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
  }

  if (bestGuideY !== null) {
    y = bestGuideY;
    guides.horizontal.push(y);
    guides.horizontal.push(y + box.height / 2);
    guides.horizontal.push(y + box.height);
  } else if (snapToGrid) {
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;
  }

  return { x, y, guides };
}

// one dx/dy for the whole group, so a multi-selection moves as a unit near an edge
export function clampGroupOffset(startBoxes: BoundingBox[], dx: number, dy: number): { dx: number; dy: number } {
  let minDx = -Infinity;
  let maxDx = Infinity;
  let minDy = -Infinity;
  let maxDy = Infinity;
  for (const box of startBoxes) {
    minDx = Math.max(minDx, -box.x);
    maxDx = Math.min(maxDx, ARTBOARD_WIDTH - box.x - box.width);
    minDy = Math.max(minDy, -box.y);
    maxDy = Math.min(maxDy, ARTBOARD_HEIGHT - box.y - box.height);
  }
  const clampedDx = minDx > maxDx ? 0 : Math.min(Math.max(dx, minDx), maxDx); // guard: oversized box
  const clampedDy = minDy > maxDy ? 0 : Math.min(Math.max(dy, minDy), maxDy);
  return { dx: clampedDx, dy: clampedDy };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// finds a spot for a cross-slide group drop that doesn't overlap destElements,
// falls back to the (clamped) original spot if nothing's free so the drop never fails
export function findGroupDropPosition(
  groupBox: { x: number; y: number; width: number; height: number },
  destElements: BoundingBox[]
): { x: number; y: number } {
  const w = Math.min(groupBox.width, ARTBOARD_WIDTH);
  const h = Math.min(groupBox.height, ARTBOARD_HEIGHT);
  const maxX = Math.max(ARTBOARD_WIDTH - w, 0);
  const maxY = Math.max(ARTBOARD_HEIGHT - h, 0);

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY),
  });
  const collides = (x: number, y: number) => destElements.some((e) => boxesOverlap({ x, y, width: w, height: h }, e));

  const first = clamp(groupBox.x, groupBox.y);
  if (!collides(first.x, first.y)) return first;

  const STEP = 40;
  const candidates: { x: number; y: number; dist: number }[] = [];
  for (let y = 0; y <= maxY; y += STEP) {
    for (let x = 0; x <= maxX; x += STEP) {
      candidates.push({ x, y, dist: Math.hypot(x - first.x, y - first.y) });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  for (const c of candidates) {
    if (!collides(c.x, c.y)) return { x: c.x, y: c.y };
  }

  return first; // no free spot found -- drop anyway, it'll overlap
}
