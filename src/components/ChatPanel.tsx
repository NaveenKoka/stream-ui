import React, { useState, useRef, useEffect } from "react";
import EntityPanel from "./AdminLayout";
import AppSelectionModal from "./AppSelectionModal";
import { useChatWebSocket } from "../hooks/useChatWebSocket";

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

// Component to display admin response with bullet points and entity panel
function AdminResponse({ reply, config, onAppCreated, selectedAppId, onSchemaSaved, onPreviewSchema }: { 
  reply: string; 
  config?: Record<string, unknown>;
  onAppCreated?: (appId: number) => void;
  selectedAppId?: number | null;
  onSchemaSaved?: () => void;
  onPreviewSchema?: (schema: Record<string, unknown>) => void;
}) {
  const [showAppModal, setShowAppModal] = useState(false);
  
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

  // Auto-save to selected app if available
  useEffect(() => {
    if (config && selectedAppId && !showAppModal) {
      // Auto-save to the selected app
      // handleSaveToApp(selectedAppId); // Removed direct save logic
    }
  }, [config, selectedAppId]);

  function handlePreview() {
    console.log('Preview in Designer clicked', config);
    if (config && onPreviewSchema) {
      onPreviewSchema(config);
    }
  }

  return (
    <div className="space-y-4">
      {/* Bullet points */}
      {bulletPoints.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Generated Components:</h4>
          <ul className="space-y-1">
            {bulletPoints.map((point, index) => (
              <li key={index} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Entity panel */}
      {entities.length > 0 && (
        <EntityPanel
          entityType={entityType}
          entities={entities}
          entityDetails={entityDetails}
        />
      )}
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Preview in Designer
        </button>
      </div>
      
      {/* App selection modal (not used in preview flow) */}
    </div>
  );
}

const ChatPanel: React.FC<{ onSchemaSaved?: () => void; onPreviewSchema?: (schema: Record<string, unknown>) => void }> = ({ onSchemaSaved, onPreviewSchema }) => {
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  // Use the new WebSocket hook
  const { messages, sendMessage, isLoading, isConnected } = useChatWebSocket({
    onNewAppCreated: (appData) => {
      console.log('New app created:', appData);
      // Handle new app creation
    }
  });

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Debug: log all messages before rendering
  console.log('Messages:', messages);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#23232b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat Assistant</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="text-sm">Start a conversation to create your app</div>
            <div className="text-xs mt-1">Try saying "create a field service app"</div>
          </div>
        )}
        
        {messages
          .filter(message => message && message.sender)
          .filter((message) => message.sender === 'user' || !!message.parsedResponse)
          .map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.parsedResponse ? message.parsedResponse.reply : message.content}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </div>
                
                {/* Admin response with special handling */}
                {message.parsedResponse?.type === "admin" && (
                  <AdminResponse
                    key={`admin-${message.id}`}
                    reply={message.parsedResponse.reply}
                    config={message.parsedResponse.config}
                    onAppCreated={setSelectedAppId}
                    selectedAppId={selectedAppId}
                    onSchemaSaved={onSchemaSaved}
                    onPreviewSchema={onPreviewSchema}
                  />
                )}
              </div>
            </div>
          ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none overflow-y-auto"
            disabled={isLoading}
            rows={1}
            style={{ minHeight: '42px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '42px';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel; 