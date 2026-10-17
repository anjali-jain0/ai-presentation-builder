import { useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";

const SUGGESTIONS = [
  "Create a 6-slide deck on our Q3 product roadmap, with one chart and one table",
  "Make slide 2 more concise",
  "Add a bar chart of quarterly revenue: Q1 120, Q2 150, Q3 90, Q4 200",
  "Change the tone to be more formal",
];

export default function ChatPanel() {
  const { messages, isStreaming, send } = useChat();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    send(trimmed);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-1">
              <circle cx="20" cy="20" r="18" fill="#eef2ff" />
              <path d="M14 17h12M14 22h8" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 9l1.4 3.2 3.1 0.8-3.1 1.3L20 17.5l-1.4-3.2-3.1-1.2 3.1-0.8L20 9z" fill="#4f46e5" />
            </svg>
            <p className="text-sm font-medium text-slate-600">Describe the deck you want, or ask for a change.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex animate-fade-in-up ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : m.status === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {m.content ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : m.status === "streaming" ? (
                    <TypingDots />
                  ) : null}
                  {m.status === "streaming" && m.content && <Caret />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask the AI to build or edit the deck…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <button
            onClick={() => submit(input)}
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isStreaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-slate-400 align-middle" style={{ height: "1em" }} />;
}
