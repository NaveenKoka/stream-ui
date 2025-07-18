import { create } from "zustand";
import type { Message, ChatSession } from "../types";

interface ChatState {
  sessions: ChatSession[];
  currentId: string;
  loading: boolean;
  setSessions: (sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  setCurrentId: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [
    {
      id: "1",
      title: "Welcome Chat",
      messages: [
        { id: "m1", sender: "assistant", content: "Hello! How can I help you today?", timestamp: Date.now() },
      ],
      createdAt: Date.now(),
    },
  ],
  currentId: "1",
  loading: false,
  setSessions: (sessionsOrUpdater) =>
    set((state) => ({
      sessions:
        typeof sessionsOrUpdater === "function"
          ? sessionsOrUpdater(state.sessions)
          : sessionsOrUpdater,
    })),
  setCurrentId: (id) => set({ currentId: id }),
  setLoading: (loading) => set({ loading }),
})); 