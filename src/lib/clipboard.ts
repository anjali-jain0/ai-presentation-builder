import { SlideElement } from "@/types/deck";

// in-memory clipboard for canvas elements, not navigator.clipboard (that's for text/images)
let clipboard: SlideElement[] = [];

export function setClipboard(elements: SlideElement[]) {
  clipboard = elements.map((el) => JSON.parse(JSON.stringify(el)));
}

export function getClipboard(): SlideElement[] {
  return clipboard;
}

export function hasClipboard(): boolean {
  return clipboard.length > 0;
}
