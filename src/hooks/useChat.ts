import { useCallback, useRef } from "react";
import { useDeckStore } from "@/store/deckStore";
import { useChatStore, ChatMessage } from "@/store/chatStore";
import { DeckOp } from "@/store/ops";

type ServerEvent =
  | { type: "text"; value: string }
  | { type: "op"; op: DeckOp }
  | { type: "done" }
  | { type: "error"; message: string };

function extractElementId(op: DeckOp): string | null {
  switch (op.type) {
    case "add_element":
      return op.element.id;
    case "add_chart":
      return op.elementId ?? null;
    case "update_element":
    case "delete_element":
    case "resize_element":
    case "update_chart_data":
    case "change_chart_type":
      return op.elementId;
    case "move_element":
      return op.newElementId ?? op.elementId;
    default:
      return null;
  }
}

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const idRef = useRef(0);
  const nextId = () => `m${Date.now()}_${++idRef.current}`;

  const send = useCallback(async (userText: string) => {
    const { addMessages, appendToMessage, patchMessage, setIsStreaming } = useChatStore.getState();
    const { applyOp, startBatch, commitBatch, flashTouched } = useDeckStore.getState();

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: userText, status: "done" };
    const assistantId = nextId();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", status: "streaming" };
    addMessages([userMsg, assistantMsg]);
    setIsStreaming(true);

    const history = [...useChatStore.getState().messages]
      .filter((m) => m.id !== assistantId && m.status !== "error")
      .slice(-16) // keep recent context small; the full deck is sent fresh every turn regardless
      .map((m) => ({ role: m.role, content: m.content }));

    startBatch();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          deck: useDeckStore.getState().deck,
          selection: useDeckStore.getState().selection,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Request failed." }));
        throw new Error(body.error ?? "Request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          const event = JSON.parse(payload) as ServerEvent;

          if (event.type === "text") {
            appendToMessage(assistantId, event.value);
          } else if (event.type === "op") {
            applyOp(event.op, { batch: true });
            const elId = extractElementId(event.op);
            if (elId) {
              flashTouched(elId);
              setTimeout(() => {
                if (useDeckStore.getState().lastTouchedElementId === elId) flashTouched(null);
              }, 1200);
            }
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "done") {
            // handled after loop
          }
        }
      }

      patchMessage(assistantId, { status: "done" });
    } catch (err: any) {
      const current = useChatStore.getState().messages.find((m) => m.id === assistantId);
      patchMessage(assistantId, {
        status: "error",
        content: current?.content || err?.message || "Something went wrong talking to the AI.",
      });
    } finally {
      commitBatch();
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, send };
}
