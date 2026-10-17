// own store (not component state) so switching tabs doesn't unmount ChatPanel and lose history
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessages: (msgs: ChatMessage[]) => void;
  appendToMessage: (id: string, delta: string) => void;
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setIsStreaming: (v: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessages: (msgs) => set((s) => ({ messages: [...s.messages, ...msgs] })),
  appendToMessage: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
    })),
  patchMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  setIsStreaming: (v) => set({ isStreaming: v }),
}));
