import { useEffect, useRef } from "react";
import { useChatStore } from "./useChatStore";
import type { Message } from "../types";

export function useChatWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { sessions, currentId, setSessions, setLoading } = useChatStore();

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws/chat");
    ws.current.onclose = () => console.log("WebSocket closed");
    return () => ws.current?.close();
  }, []);

  const sendMessage = (msg: string) => {
    const newMsg: Message = {
      id: Math.random().toString(36).slice(2),
      sender: "user",
      content: msg,
      timestamp: Date.now(),
    };
    setSessions((prevSessions) =>
      prevSessions.map((s) =>
        s.id === currentId ? { ...s, messages: [...s.messages, newMsg] } : s
      )
    );
    setLoading(true);

    // Prepare context data
    const currentSession = sessions.find(s => s.id === currentId);
    const context = {
      session_id: currentId,
      message_count: currentSession?.messages.length || 0,
      user_attributes: {
        // Add any user-specific data here
        last_activity: Date.now(),
        session_start: currentSession?.createdAt || Date.now()
      }
    };

    // Map messages to OpenAI format
    const mappedMessages = (currentSession?.messages ? [...currentSession.messages, newMsg] : [newMsg])
      .map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content
      }));
    const messageWithContext = {
      messages: mappedMessages,
      context: context
    };

    ws.current?.send(JSON.stringify(messageWithContext));

    // Prepare to receive streaming response
    const assistantMsg: Message = {
      id: Math.random().toString(36).slice(2),
      sender: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setSessions((prevSessions) =>
      prevSessions.map((s) =>
        s.id === currentId ? { ...s, messages: [...s.messages, assistantMsg] } : s
      )
    );

    ws.current!.onmessage = (event) => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id !== currentId) return s;
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: msgs[msgs.length - 1].content + event.data,
          };
          return { ...s, messages: msgs };
        })
      );
      setLoading(false);
    };
  };

  return { sendMessage };
} 