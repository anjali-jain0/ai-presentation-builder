// tracks filmstrip thumbnail positions so the canvas can detect cross-slide drag-over
type DropTarget = { slideId: string; el: HTMLElement };

const targets = new Map<string, DropTarget>();

export function registerSlideDropTarget(slideId: string, el: HTMLElement) {
  targets.set(slideId, { slideId, el });
}

export function unregisterSlideDropTarget(slideId: string) {
  targets.delete(slideId);
}

export function findSlideAtPoint(clientX: number, clientY: number): string | null {
  for (const { slideId, el } of targets.values()) {
    const rect = el.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return slideId;
    }
  }
  return null;
}
