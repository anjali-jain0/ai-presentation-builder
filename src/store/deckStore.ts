// single source of truth for the deck - everything reads/writes this directly,
// no local copies, which is why manual edits and AI edits share one undo stack
import { create } from "zustand";
import { enablePatches, produceWithPatches, applyPatches, Patch } from "immer";
import { Deck, emptyDeck } from "@/types/deck";
import { DeckOp, applyDeckOp } from "./ops";

enablePatches();

const STORAGE_KEY = "ai-slide-builder:deck:v1";

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

export interface Selection {
  slideId: string | null;
  elementIds: string[];
}

interface DeckState {
  deck: Deck;
  selection: Selection;
  past: HistoryEntry[];
  future: HistoryEntry[];
  isBatching: boolean;
  batchPatches: Patch[];
  batchInverse: Patch[];
  // past.length when the AI batch started -- commitBatch splices back in here,
  // not appends, so a manual edit mid-stream doesn't land in the wrong order
  batchInsertIndex: number | null;
  lastTouchedElementId: string | null;
  hoveredDropSlideId: string | null;
  setHoveredDropSlideId: (slideId: string | null) => void;
  editingElementId: string | null;
  setEditingElementId: (elementId: string | null) => void;

  applyOp: (op: DeckOp, opts?: { batch?: boolean }) => void;
  applyOps: (ops: DeckOp[], opts?: { batch?: boolean }) => void;
  startBatch: () => void;
  commitBatch: () => void;

  undo: () => void;
  redo: () => void;

  selectSlide: (slideId: string | null) => void;
  selectElements: (elementIds: string[], slideId?: string | null) => void;
  clearSelection: () => void;

  flashTouched: (elementId: string | null) => void;
}

function loadFromStorage(): Deck | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Deck;
  } catch {
    return null;
  }
}

function persist(deck: Deck) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch {
    // localStorage might be full or disabled, doesn't matter much either way
  }
}

const initialDeck = loadFromStorage() ?? emptyDeck();

// drops stale slide/element ids after any mutation or undo/redo
function reconcileSelection(next: Deck, selection: Selection): Selection {
  const slide = selection.slideId ? next.slides.find((s) => s.id === selection.slideId) : undefined;
  if (!slide) {
    return { slideId: next.slides[0]?.id ?? null, elementIds: [] };
  }
  if (selection.elementIds.length === 0) return selection;
  const validIds = new Set(slide.elements.map((e) => e.id));
  const elementIds = selection.elementIds.filter((id) => validIds.has(id));
  if (elementIds.length === selection.elementIds.length) return selection;
  return { slideId: selection.slideId, elementIds };
}

// clears an in-progress inline edit if its element no longer exists
function reconcileEditingElementId(next: Deck, editingElementId: string | null): string | null {
  if (!editingElementId) return null;
  const stillExists = next.slides.some((s) => s.elements.some((e) => e.id === editingElementId));
  return stillExists ? editingElementId : null;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  deck: initialDeck,
  selection: { slideId: initialDeck.slides[0]?.id ?? null, elementIds: [] },
  past: [],
  future: [],
  isBatching: false,
  batchPatches: [],
  batchInverse: [],
  batchInsertIndex: null,
  lastTouchedElementId: null,

  applyOp: (op, opts) => {
    // batching is opt-in per-call (useChat passes {batch:true}), not a global flag --
    // that way a manual edit mid-AI-stream still gets its own undo entry
    const { deck, batchPatches, batchInverse, selection, editingElementId } = get();
    const [next, patches, inverse] = produceWithPatches(deck, (draft) => {
      applyDeckOp(draft as Deck, op);
    });
    persist(next);
    const nextSelection = reconcileSelection(next, selection);
    const nextEditing = reconcileEditingElementId(next, editingElementId);

    if (opts?.batch) {
      set({
        deck: next,
        selection: nextSelection,
        editingElementId: nextEditing,
        batchPatches: [...batchPatches, ...patches],
        batchInverse: [...inverse, ...batchInverse],
      });
      return;
    }

    if (patches.length === 0) {
      set({ deck: next, selection: nextSelection, editingElementId: nextEditing });
      return;
    }

    set({
      deck: next,
      selection: nextSelection,
      editingElementId: nextEditing,
      past: [...get().past, { patches, inversePatches: inverse }],
      future: [],
    });
  },

  applyOps: (ops, opts) => {
    const { deck, selection, editingElementId, batchPatches, batchInverse } = get();
    const [next, patches, inverse] = produceWithPatches(deck, (draft) => {
      for (const op of ops) applyDeckOp(draft as Deck, op);
    });
    persist(next);
    const nextSelection = reconcileSelection(next, selection);
    const nextEditing = reconcileEditingElementId(next, editingElementId);

    if (opts?.batch) {
      set({
        deck: next,
        selection: nextSelection,
        editingElementId: nextEditing,
        batchPatches: [...batchPatches, ...patches],
        batchInverse: [...inverse, ...batchInverse],
      });
      return;
    }

    if (patches.length === 0) {
      set({ deck: next, selection: nextSelection, editingElementId: nextEditing });
      return;
    }
    set({
      deck: next,
      selection: nextSelection,
      editingElementId: nextEditing,
      past: [...get().past, { patches, inversePatches: inverse }],
      future: [],
    });
  },

  startBatch: () =>
    set((s) => ({ isBatching: true, batchPatches: [], batchInverse: [], batchInsertIndex: s.past.length })),

  commitBatch: () => {
    const { batchPatches, batchInverse, batchInsertIndex } = get();
    if (batchPatches.length > 0) {
      const insertAt = batchInsertIndex ?? get().past.length;
      set((s) => ({
        past: [...s.past.slice(0, insertAt), { patches: batchPatches, inversePatches: batchInverse }, ...s.past.slice(insertAt)],
        future: [],
      }));
    }
    set({ isBatching: false, batchPatches: [], batchInverse: [], batchInsertIndex: null });
  },

  undo: () => {
    const { past, deck, isBatching, selection, editingElementId } = get();
    if (isBatching || past.length === 0) return; // AI batch isn't in `past` yet, can't safely undo under it
    const entry = past[past.length - 1];
    const next = applyPatches(deck, entry.inversePatches);
    persist(next);
    set((s) => ({
      deck: next,
      selection: reconcileSelection(next, selection),
      editingElementId: reconcileEditingElementId(next, editingElementId),
      past: s.past.slice(0, -1),
      future: [...s.future, entry],
    }));
  },

  redo: () => {
    const { future, deck, isBatching, selection, editingElementId } = get();
    if (isBatching || future.length === 0) return;
    const entry = future[future.length - 1];
    const next = applyPatches(deck, entry.patches);
    persist(next);
    set((s) => ({
      deck: next,
      selection: reconcileSelection(next, selection),
      editingElementId: reconcileEditingElementId(next, editingElementId),
      future: s.future.slice(0, -1),
      past: [...s.past, entry],
    }));
  },

  selectSlide: (slideId) => set({ selection: { slideId, elementIds: [] } }),

  selectElements: (elementIds, slideId) =>
    set((s) => ({
      selection: { slideId: slideId ?? s.selection.slideId, elementIds },
    })),

  clearSelection: () =>
    set((s) => ({ selection: { slideId: s.selection.slideId, elementIds: [] } })),

  flashTouched: (elementId) => set({ lastTouchedElementId: elementId }),

  hoveredDropSlideId: null,
  setHoveredDropSlideId: (slideId) => set({ hoveredDropSlideId: slideId }),

  editingElementId: null,
  setEditingElementId: (elementId) => set({ editingElementId: elementId }),
}));
