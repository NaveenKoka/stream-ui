import React, { useState, useRef, useEffect } from "react";
import EntityPanel from "./AdminLayout";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: number;
  parsedResponse?: {
    reply: string;
    type: "continue" | "admin" | "user";
    config?: Record<string, unknown>;
  };
}
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Component to display admin response with bullet points and entity panel
function AdminResponse({ reply, config }: { reply: string; config?: Record<string, unknown> }) {
  // Extract bullet points from reply (lines starting with - or •)
  const bulletPoints: string[] = reply
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.trim().replace(/^[-•]\s*/, ''))
    .filter((line): line is string => line.length > 0); // Type guard to ensure string[]

  // Try to extract entity panel data from config
  let entityType = "Entity";
  let entities: { id: string | number; label: string; status?: string }[] = [];
  let entityDetails: Record<string | number, Record<string, string>> = {};
  if (config && typeof config === "object" && config["entities"] && config["entityDetails"]) {
    entityType = typeof config["entityType"] === "string" ? config["entityType"] : "Entity";
    entities = Array.isArray(config["entities"]) ? config["entities"] as { id: string | number; label: string; status?: string }[] : [];
    entityDetails = typeof config["entityDetails"] === "object" ? config["entityDetails"] as Record<string | number, Record<string, string>> : {};
  }

  function handleSaveConfig() {
    if (!config) return;
    
    // Send to backend
    fetch('http://localhost:8000/save-schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const savedObjects = data.saved.objects.join(', ');
        const savedWorkflows = data.saved.workflows.join(', ');
        alert(`Schema saved successfully to database!\nObjects: ${savedObjects}\nWorkflows: ${savedWorkflows}`);
      } else {
        alert('Failed to save schema: ' + (data.detail || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error saving schema:', error);
      alert('Failed to save schema. Check console for details.');
    });
  }

  return (
    <div className="space-y-4">
      {/* Bullet points or fallback to paragraph */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">What we're building:</h3>
        {bulletPoints.length > 0 ? (
          <ul className="space-y-2">
            {bulletPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 dark:text-blue-300 mr-2">•</span>
                <span className="text-blue-700 dark:text-blue-100">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-blue-700 dark:text-blue-100 whitespace-pre-line">{reply}</div>
        )}
        {/* Save button always shown if config exists */}
        {config && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-4 py-2 rounded-lg shadow hover:bg-blue-200 dark:hover:bg-blue-800 transition font-semibold"
              onClick={handleSaveConfig}
              style={{ minWidth: 0 }}
            >
              Save Schema
            </button>
          </div>
        )}
      </div>
      {/* EntityPanel if config is present */}
      {entities.length > 0 && (
        <div className="mt-4">
          <EntityPanel entityType={entityType} entities={entities} entityDetails={entityDetails} />
        </div>
      )}
    </div>
  );
}

// Helper function to parse JSON response
function parseResponse(content: string): { reply: string; type: "continue" | "admin" | "user"; config?: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && parsed.reply && parsed.type) {
      return parsed;
    }
  } catch {
    // Not valid JSON, ignore
  }
  return null;
}

const ChatPanel = ({ session, onSend, loading }: {
  session: ChatSession;
  onSend: (msg: string) => void;
  loading: boolean;
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput("");
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#23232b] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-gray-400 dark:text-gray-500 text-center mt-8">Start chatting...</div>
        )}
        {session.messages.map((msg) => {
          // Parse response for assistant messages
          const parsedResponse = msg.sender === "assistant" ? parseResponse(msg.content) : null;
          
          return (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow text-base whitespace-pre-line transition-colors
                ${msg.sender === "user"
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"}
              `}
              >
                {/* Render based on response type */}
                {msg.sender === "assistant" && parsedResponse ? (
                  <div>
                    {parsedResponse.type === "admin" ? (
                      <AdminResponse reply={parsedResponse.reply} config={parsedResponse.config} />
                    ) : (
                      <div className="whitespace-pre-wrap">{parsedResponse.reply}</div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                <div className="text-[10px] text-right text-gray-300 dark:text-gray-500 mt-1">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {loading && <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-6">Assistant is typing...</div>}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#23232b]">
        <textarea
          className="flex-1 w-full border rounded-lg p-2 focus:outline-none focus:ring focus:border-blue-300 transition resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-600 transition disabled:opacity-50 self-end"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel; 