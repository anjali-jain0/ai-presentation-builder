# AI Presentation Builder

A web-based AI presentation builder: describe a deck, get a first draft, then refine it through chat or by editing directly on a free-form canvas. Built for the "AI-Powered Presentation Builder" take-home assignment.

## Setup

**Requirements:** Node 20+, a Gemini API key (free tier works) from [aistudio.google.com](https://aistudio.google.com) → "Get API key".

```bash
npm install
cp .env.example .env        # then paste your key into .env
npm run dev                 # runs Vite (client, :5173) + Express (API, :8787) together
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to the Express backend, so the app feels like one server in the browser.

### Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | Server-side only, never sent to the browser. |
| `GEMINI_MODEL` | no | `gemini-3.1-flash-lite` | Override if you hit capacity issues on the default (see Known Issues). |
| `API_PORT` | no | `8787` | Express port. Not named `PORT` on purpose, since some hosts inject their own generic `PORT` var for the main process and that collides with Vite's dev server. |

### Production build

```bash
npm run build   # vite build -> dist/
npm start       # Express serves dist/ and the API on one port
```

## Architecture

**Stack:** Vite + React + TypeScript on the frontend, a minimal Express server on the backend (it only exists to keep the Gemini API key off the client and run the agentic tool-calling loop), Zustand + Immer for state/undo, dnd-kit for filmstrip reordering, Recharts for charts, html2canvas + jsPDF for PDF export with the browser's native print as a fallback.

Went with Vite/React + Express instead of Next.js by request — same end product, fewer framework conventions to learn going in. The backend stays intentionally small: one route (`POST /api/chat`), no database, no auth.

### Data flow

```
src/types/deck.ts          Deck / Slide / SlideElement schema (the contract)
        │
src/store/ops.ts           DeckOp union + applyDeckOp(draft, op) — the ONLY function
        │                  that knows how to mutate a Deck
        │
src/store/deckStore.ts     Zustand store. Wraps every mutation in
                            immer.produceWithPatches to get [patches, inversePatches]
                            for undo/redo. Exposes applyOp / applyOps.
        │
        ├── Canvas (Artboard.tsx)        manual drag/resize/edit → applyOp(s)
        ├── Filmstrip (Filmstrip.tsx)    manual reorder/duplicate/delete → applyOp
        ├── Inspector (*.tsx)            manual property edits → applyOp
        └── Chat (useChat.ts)            AI tool calls, streamed from the server,
                                          applied via the SAME applyOp → batched into
                                          one undo entry per chat turn
```

There's exactly one `Deck` object in memory, living in the Zustand store. Manual edits and AI edits are both just `DeckOp`s applied through `applyDeckOp`, so "the AI sees the deck after a manual drag" and "undo works for both" are just true by construction. There's only one code path to get that wrong in, and it's shared.

### Schema (`src/types/deck.ts`)

- **Deck**: `id, title, theme, aspectRatio ("16:9"), slides[]`.
- **Slide**: `id, layout` (title / content / two-column / comparison / section-break / chart-forward / blank), `background, notes, elements[]`. Array order is z-order — last item renders on top.
- **Element** (discriminated union on `type`): `text | image | chart | table | shape | icon`. Every type shares a bounding box (`x, y, width, height`, slide-relative units on a fixed 1280×720 artboard) plus its own payload — text content, chart spec with `categories`/`series`, table rows, and so on.

Every element has a stable id. That id is what lets drag/move/AI-tools address one specific object anywhere in the deck.

### Agentic tool-calling (`server/ai/`)

`toolDeclarations.ts` defines 21 Gemini function declarations. Slide-level ones (`add_slide`, `update_slide`, `delete_slide`, `reorder_slides`, `duplicate_slide`, `change_layout`), element ones split by type for schema reliability (`add_text_element`, `add_image_element`, `add_shape_element`, `add_table_element`, `update_text`, `update_image`, `update_shape`, `update_table`, `delete_element`, `move_element`, `resize_element`, `reorder_elements`), and chart ones (`add_chart`, `update_chart_data`, `change_chart_type`).

`toolSchemas.ts` has zod schemas that gate every call's arguments before anything touches the deck: finite numbers only (no `NaN`/`Infinity` sneaking into chart data), chart series data length has to match `categories` length, series names have to be non-empty, unique, and not literally `"category"` (that key is reserved for the renderer's x-axis field, so a colliding name would silently overwrite it), and tables have to be non-empty and rectangular — every row the same column count.

`applyTools.ts` validates each call against the live deck on top of that. `requireSlide`/`requireElement` check existence. `requireElementOfType` goes a step further and checks the target element's actual type matches the tool — `change_chart_type` on a text element is now a tool error instead of silently doing nothing, which is what it used to do (the reducer just bails on a type mismatch, and the model never learned its call had no effect). `requireUniqueKnownIds` rejects duplicate or unknown ids in reorder lists. On success this all becomes a `DeckOp`. New slides/elements get a server-generated UUID that's handed back in the tool's response, so the model can reference the same object again later in the same turn — `add_slide` returns an id, `add_text_element` targets it; `duplicate_slide` returns the whole old-id → new-id map for its clone's elements.

`chat.ts` is the orchestration loop: send the conversation plus a fresh full-deck snapshot plus the tool declarations to Gemini, stream the response, execute each tool call as it lands against a server-side working copy (so later rounds in the same turn see earlier results), stream each resulting op to the client as soon as it's applied, and keep going until the model stops calling tools or hits a safety cap (12 rounds / 60 calls). Retries transient `503`s with backoff.

`systemPrompt.ts` carries the actual behavioral rules: generate in two phases for a whole new deck (all `add_slide` calls first, then populate every slide); make diff-only edits to existing content, never delete-and-recreate a slide just to change one field; resolve "the chart" / "that table" / "this" against the current editor selection first (slide id + selected element ids, sent fresh every turn), then the deck JSON if nothing's selected, and ask which one if it's still ambiguous rather than guess; and for unrelated or meaningless messages, reply briefly and don't touch the deck.

One deliberate choice worth explaining: element tools are split by type instead of one generic `add_element(element: AnyElementPayload)`. Gemini's function-calling schema has no clean way to say "this object's shape depends on this enum field" — no real discriminated-union support in the subset it accepts. Flat, type-specific schemas are just far more reliable for the model to fill in correctly. They all still funnel into the same generic `add_element`/`update_element` ops internally, so the Deck schema itself stays one discriminated union.

**Streaming.** The server streams Server-Sent Events over `POST /api/chat` — text deltas, landed ops, done, error. The client applies each op to the store the instant it arrives, so tool calls show up on the canvas as they land, not after the whole response finishes. A chat turn is wrapped in `startBatch()`/`commitBatch()` so the whole turn (could be 10+ tool calls for a fresh deck) becomes one undo step, matching a manual drag's granularity.

**Two-phase generation is actually enforced, not just asked for in the prompt.** `chat.ts` tracks a real phase transition: for a turn starting from an empty deck, every element-creation call gets rejected with a tool error telling the model to finish outlining first, for as many rounds as it takes until a round adds zero new slides while at least one already exists. That protects a multi-round outline (say 3 slides in round 0, 2 more in round 1), not just round 0 — an earlier version of this only checked round zero, which was a real gap.

### Canvas editor (`src/components/canvas/Artboard.tsx`)

Select, drag-move, resize, multi-select/marquee, cross-slide move — all of it is built on raw Pointer Events rather than a DnD library. The canvas needs continuous coordinate math (artboard-unit to screen-pixel conversion, snapping, clamping) and that fights native/library HTML5 drag-and-drop more than it helps. A `ResizeObserver` keeps the artboard's CSS pixel scale synced to its container. Element positions are always stored in artboard units (0–1280 × 0–720) and only converted to screen pixels at render time. `SlideSurface.tsx` is the one shared renderer used by the live canvas, the filmstrip thumbnails, and export, so none of them can visually disagree with each other.

Move: pointerdown on an element starts a drag. While dragging, the box is tracked in local React state only (nothing hits the store yet), snapped to the grid and other elements' edges via `src/lib/snap.ts` (alignment guides plus grid snap, 6px threshold), and committed as a single `update_element` on pointerup — or one batched `applyOps` call if it's a multi-selection. Escape during a drag just clears that local state; since the store was never touched, the cancel is free.

Resize works the same way through 8 handles in `SelectionOverlay.tsx`, clamped to a minimum size and the artboard bounds. Multi-select is shift-click to toggle, or marquee-drag on empty canvas to select everything the marquee rect intersects.

Cross-slide move checks `src/lib/dragRegistry.ts` on every pointermove. Filmstrip thumbnails register their DOM rect there on mount, so the canvas can ask "is the pointer over slide N's thumbnail right now" without the canvas and filmstrip knowing about each other directly. A drop-target highlight shows up on both sides if so, and dropping turns into a `move_element` op per selected element. Hold Alt/Option to copy instead of move — read live on every pointermove and at drop, not captured once when the drag starts, so toggling the key mid-drag actually flips the indicator and the resulting behavior.

Dropping used to send every selected element to the same hardcoded spot, so a multi-element drop collapsed onto one point and could land on top of existing content. `findGroupDropPosition` fixes that: it computes the dragged selection's combined bounding box, tries the original position on the destination slide first, and if that collides, grid-searches the slide (40-unit steps, nearest first) for a free spot. Every member then gets offset by the same delta from that one anchor, so the selection keeps its shape instead of collapsing or scattering. If nothing's free anywhere on the slide, it falls back to the clamped original position — the drop always completes, it just might overlap something.

Same idea applies to group bounds generally: in-canvas drag, keyboard nudge, duplicate (⌘D), and paste (⌘V) all clamp a multi-selection's offset once for the whole group via `clampGroupOffset`, instead of clamping each element independently. Independent clamping is what used to let a selection visually break apart the moment any single member crossed an artboard edge before the rest did.

### Filmstrip (`src/components/filmstrip/`)

Slide reordering uses `@dnd-kit/core` + `@dnd-kit/sortable` — a real sortable list, not two dropdowns pretending to be one. It's a completely separate drag interaction from the canvas's cross-slide element drag above (one starts from a thumbnail's drag handle through dnd-kit's own pointer sensor, the other starts from an element on the canvas through raw pointer events, so they can't collide). An insertion line renders at the exact gap the dragged slide would land in — computed to match `arrayMove`'s own semantics — and it's a real flex item when shown, so the list visibly opens a slot rather than just relying on the reflow animation. dnd-kit cancels an in-progress drag on Escape by itself; the indicator line just gets cleared to match via `onDragCancel`.

### Undo/redo (`src/store/deckStore.ts`)

Every `applyOp`/`applyOps` call runs through `immer.produceWithPatches`, which hands back `[nextDeck, patches, inversePatches]`. Those get pushed onto a `past` stack. `undo()` applies the inverse patches and moves the entry to `future`; `redo()` re-applies the forward patches. Since every mutation, manual or AI, goes through this same path, there's one unified history stack instead of two separate ones to keep in sync.

The one tricky part was ordering when an AI turn and a manual edit interleave. An AI turn's ops accumulate without touching `past` until `commitBatch()` runs at the very end of the turn. If a manual edit happens while that's still streaming, it pushes its own entry immediately, wherever `past` happens to be at that moment. Naively appending the AI's entry once the turn finishes would put it after that manual entry in the stack — even though the AI's change actually happened first. The fix is `startBatch()` recording `past.length` up front as `batchInsertIndex`, and `commitBatch()` splicing the AI's entry back in at that index instead of appending it. This was verified with a manual test: change a heading via AI mid-stream, then change it again manually before the AI turn finishes, then undo twice — it now correctly walks back through the manual edit first and the AI edit second, in the order they actually happened.

`undo()`/`redo()` also run the same selection-reconciliation logic every other mutation does — if the selected slide got deleted, fall back to the first slide; if a selected element is gone but the slide's still valid, just drop that element from the selection; if there's an in-progress inline edit on something that no longer exists, clear it. Otherwise undoing a slide or element creation could leave the UI pointing at a dead id.

### Export (`src/components/export/PrintView.tsx`, `src/lib/pdfExport.ts`)

Two export options live in the toolbar. **Download PDF** is the primary one and generates a real PDF file automatically. **Print** opens the browser's native print dialog, which doubles as a "Save as PDF" option or lets you actually print.

The brief explicitly allows a print-to-PDF view in place of full export, so that's what shipped first. An earlier attempt at automated export (the same html2canvas + jsPDF approach used now) got pulled after it triggered unexplained OS-level side effects during testing that couldn't be root-caused at the time. Automated export was revisited later, tested step by step in an isolated environment first, and shipped once it ran clean. Print stays in the toolbar on purpose rather than getting replaced — it's a genuinely different capability (an actual print dialog, choice of printer) and a fallback if PDF export ever misbehaves somewhere it wasn't tested.

Both paths render through the same hidden `PrintView` component, which uses the same `SlideSurface` the canvas and filmstrip use, one slide per page. Each slide renders at exactly 1280 CSS px wide; `index.css` sets `@page { size: 13.333in 7.5in; margin: 0; }`, which comes out to exactly 1280×720px at 96px/inch, so a printed or saved slide fills the page with no runtime scaling needed.

`pdfExport.ts` walks each slide (tagged `data-pdf-slide` in `PrintView`), captures it with html2canvas at 2x scale, and adds each capture as a page to a jsPDF document, saved once at the end. It's guarded against double-invocation (disabled button plus a module-level flag), since firing the capture/save twice at once is exactly the kind of thing that could cause erratic behavior.

The hidden container is positioned off-screen with `position:fixed`, not hidden with `display:none` or `visibility:hidden`. Two separate bugs pushed toward this same fix. Charts measure themselves with `ResizeObserver`, which never fires on a `display:none` box since there's no layout to observe. And separately, html2canvas can't capture real pixel content from inside a `visibility:hidden` ancestor — it runs without erroring but silently produces a blank canvas, which is exactly the "empty PDF" bug this had at one point (caught by checking the actual captured pixel data, not just the absence of errors). Off-screen positioning keeps the element genuinely laid out and painted either way.

One more print-specific fix: `print-color-adjust: exact` (plus the `-webkit-` prefix) applied globally in `@media print`. Browsers suppress `background-color`/`background-image` by default when printing to save ink, which was silently dropping shape fills, the "line" shape variant (drawn via `background`, not `border`), table header shading, and slide backgrounds from printed output — even though they look fine on screen. This only affects the Print path; html2canvas rasterizes actual rendered pixels so it was never affected.

### Persistence

The whole deck is serialized to `localStorage` on every mutation and restored on load, so a refresh doesn't lose work. Chat history is deliberately not persisted — it lives in React state only. The deck itself always travels fresh to the server on every chat turn regardless of chat history length, so AI context-awareness never depends on persisted chat.

## What's implemented

- Structured schema with bounding boxes; 21 agentic tools at slide/element/chart granularity with zod-validated arguments and element-type checks
- Two-phase generation, hard-enforced server-side (a real phase transition, not a prompt instruction or a round-zero check)
- Diff-only edits — changing a chart's type only touches that one element, verified byte-identical elsewhere
- Ambiguous/unrelated-request handling — the model asks which object you mean when several match, and does nothing for messages like "asdfgh" instead of editing speculatively
- Streaming, both text and op-by-op
- One canonical store shared by chat, canvas, filmstrip, and inspector
- Canvas select/drag/resize/multi-select/marquee with snap guides, visually consistent across canvas, filmstrip, and export
- Filmstrip reorder with an insertion-line indicator
- Collision-aware cross-slide element move/copy, live Alt/Option read, relative positions preserved for group drops
- Group-consistent bounds clamping for drag, nudge, duplicate, and paste
- Charts: bar/line/pie/area, with an editable data-table inspector
- Editable tables, image upload, AI-placed images
- Undo/redo unified across manual and AI edits, chronologically correct even with interleaved edits, selection reconciled after every undo/redo
- Automated PDF export (html2canvas + jsPDF) plus a native print fallback
- localStorage persistence; chat history survives switching to the Inspector tab and back
- Empty/loading/error states
- Keyboard shortcuts: ⌘A select all, ⌘C/⌘X/⌘V copy/cut/paste, ⌘D duplicate, Delete, arrow-key nudge (Shift for larger steps), PageUp/PageDown or arrow keys (when nothing's selected) to change slide, ⌘Z/⌘⇧Z undo/redo, Escape to cancel a drag or clear selection

**One cross-process detail worth flagging:** `applyDeckOp` runs independently in two places — the server's working copy (used to build each round's prompt) and the client's real store. Any id generated with a fresh `uuid()` inside that reducer would diverge between the two, since they'd be separate random calls on each side. `move_element` (copy) and `duplicate_slide` both avoid this by generating the id once, at the point the op is created, and passing it through the op instead of letting the reducer invent its own.

## Known issues / deliberately out of scope

- **Present/slideshow mode, themes that restyle existing content, multiple saved projects, speaker-notes-in-present-mode, group/ungroup, element locking** — not built. Speaker notes and themes exist in the schema (`slide.notes`, `deck.theme`) and notes are already editable in the inspector, but there's no present-mode UI to consume either of them, and no theme-switcher.
- **Rotation** is modeled in the schema (`rotation` on the bounding box) but there's no drag-to-rotate handle in the UI — explicitly optional per the brief.
- **Group resize** isn't implemented — only single-element resize. Group move, nudge, duplicate, and paste all are.
- **Chat history doesn't survive a page reload** (the deck does). It does survive switching between the AI Chat and Inspector tabs, since it lives in its own store instead of component state.
- **Undo granularity for AI turns** is one step per chat message, not one per tool call — a deliberate trade-off so a 15-tool-call deck generation doesn't flood the history stack. Ordering stays chronologically correct even against interleaved manual edits, and undo/redo are disabled while an AI turn is actively streaming.
- **No abort-on-disconnect** for an in-flight AI request — closing the tab mid-generation doesn't cancel the call server-side, it just has nowhere to stream to anymore.
- **Model capacity**: the default model, `gemini-3.1-flash-lite`, is free-tier and can return transient `503` errors under load. The server retries up to 3× with backoff and the UI shows a friendly error if it still fails. Set `GEMINI_MODEL` to something else if this happens a lot.
- **Icon element type** exists in the schema with a small built-in SVG set but has no insert-toolbar button yet, and AI tools don't target it either — the other five element types cover the required surface.
- **`reorder_slides`/`reorder_elements`** reject a duplicate or unknown id outright at the tool layer. The reducer itself has a second, independent defensive layer regardless of where an op came from — a duplicate id is only honored once and anything missing is appended rather than dropped — so a malformed op can't duplicate or delete content even if it somehow got past tool-layer validation.

## Deployment

Not deployed yet. Local setup above is the only way to run it right now — a live URL will be added here once it's up.
