import { useState } from "react";
import { useDeckStore } from "@/store/deckStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Toolbar from "@/components/toolbar/Toolbar";
import Filmstrip from "@/components/filmstrip/Filmstrip";
import Artboard from "@/components/canvas/Artboard";
import Inspector from "@/components/inspector/Inspector";
import ChatPanel from "@/components/chat/ChatPanel";
import PrintView from "@/components/export/PrintView";
import PresentMode from "@/components/present/PresentMode";

type RightTab = "chat" | "inspector";

export default function App() {
  useKeyboardShortcuts();

  const deck = useDeckStore((s) => s.deck);
  const selection = useDeckStore((s) => s.selection);
  const [rightTab, setRightTab] = useState<RightTab>("chat");
  const [rightCollapsed, setRightCollapsed] = useState(false); // resets on reload, doesn't persist
  const [presenting, setPresenting] = useState(false);

  const slide = deck.slides.find((s) => s.id === selection.slideId);

  const onExport = () => {
    if (deck.slides.length === 0) return;
    window.print();
  };

  if (presenting) {
    return <PresentMode deck={deck} startSlideId={selection.slideId} onExit={() => setPresenting(false)} />;
  }

  return (
    <>
      <div className="flex h-screen flex-col bg-slate-100 print:hidden">
        <Toolbar onExport={onExport} onPresent={() => setPresenting(true)} />
        <div className="flex min-h-0 flex-1">
          <Filmstrip />

          <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto p-6">
            {deck.slides.length === 0 ? (
              <EmptyDeck />
            ) : slide ? (
              <Artboard slide={slide} />
            ) : (
              <p className="text-sm text-slate-400">Select a slide to start editing.</p>
            )}
          </main>

          <div
            className={`flex flex-col overflow-hidden bg-white transition-all duration-200 ${
              rightCollapsed ? "w-7 border-l border-slate-200" : "w-[300px] border-l border-slate-200"
            }`}
          >
            {rightCollapsed ? (
              <button
                onClick={() => setRightCollapsed(false)}
                title="Expand panel"
                className="flex h-7 w-7 shrink-0 items-center justify-center bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                <ChevronIcon direction="left" />
              </button>
            ) : (
              <>
                <div className="flex w-[300px] shrink-0 items-stretch border-b border-slate-200">
                  <div className="relative flex flex-1">
                    <TabButton label="AI Chat" active={rightTab === "chat"} onClick={() => setRightTab("chat")} />
                    <TabButton label="Inspector" active={rightTab === "inspector"} onClick={() => setRightTab("inspector")} />
                    <div
                      className="absolute bottom-[-1px] h-0.5 w-1/2 rounded-full bg-indigo-500 transition-transform duration-200 ease-out"
                      style={{ transform: rightTab === "inspector" ? "translateX(100%)" : "translateX(0%)" }}
                    />
                  </div>
                  <button
                    onClick={() => setRightCollapsed(true)}
                    title="Collapse panel"
                    className="flex w-7 shrink-0 items-center justify-center border-l border-slate-200 bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    <ChevronIcon direction="right" />
                  </button>
                </div>
                <div className="min-h-0 w-[300px] flex-1">{rightTab === "chat" ? <ChatPanel /> : <InspectorInline />}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <PrintView deck={deck} />
    </>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      {direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 ${
        active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function InspectorInline() {
  // no border here, the column wrapping this already has one
  return (
    <div className="h-full [&>div]:w-full [&>div]:border-l-0">
      <Inspector />
    </div>
  );
}

function EmptyDeck() {
  return (
    <div className="flex max-w-md flex-col items-center gap-3 text-center">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-1">
        <rect x="4" y="10" width="48" height="34" rx="4" fill="#eef2ff" />
        <rect x="11" y="18" width="18" height="3" rx="1.5" fill="#c7d2fe" />
        <rect x="11" y="25" width="26" height="3" rx="1.5" fill="#c7d2fe" />
        <circle cx="40" cy="33" r="6" fill="#ffffff" stroke="#a5b4fc" strokeWidth="2" />
        <path d="M37.5 33l2 2 3.5-4" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="text-lg font-semibold text-slate-700">Start with a prompt</h2>
      <p className="text-sm text-slate-500">
        Use the AI Chat panel to describe your presentation (e.g. "Create a 6-slide deck on our Q3 product roadmap"), or add a
        blank slide from the filmstrip on the left to start manually.
      </p>
    </div>
  );
}
