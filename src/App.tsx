import React, { useEffect, useState, useMemo } from "react";
import "./index.css";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import ChatList from "./components/ChatList";
import ChatPanel from "./components/ChatPanel";
import { useChatStore } from "./hooks/useChatStore";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import EntityPanel from "./components/AdminLayout";
import { useRef } from "react";

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

function SettingsMenu({ dark, setDark, adminMode, setAdminMode }: {
  dark: boolean;
  setDark: (d: boolean) => void;
  adminMode: boolean;
  setAdminMode: (a: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200 font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open settings menu"
      >
        <span role="img" aria-label="Settings">⚙️</span>
        Settings
      </button>
      {open && (
        <div ref={menuRef} className="mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200 font-medium">Dark Mode</span>
            <button
              className={`px-3 py-1 rounded-full border transition font-medium ${dark ? "bg-blue-600 text-white border-blue-700" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              onClick={() => setDark(!dark)}
              aria-label="Toggle dark mode"
            >
              {dark ? "On" : "Off"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200 font-medium">Admin Mode</span>
            <button
              className={`px-3 py-1 rounded-full border transition font-medium ${adminMode ? "bg-blue-600 text-white border-blue-700" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              onClick={() => setAdminMode(!adminMode)}
              aria-label="Toggle admin mode"
            >
              {adminMode ? "On" : "Off"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { sessions, currentId, setCurrentId, loading } = useChatStore();
  const { sendMessage } = useChatWebSocket();
  const [dark, setDark] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);

  // Extract metadata from the latest admin response in the current session
  // Extract metadata from the latest admin response in the current session
  const currentSession = sessions.find((s) => s.id === currentId)!;
  const latestAdminResponse = useMemo(() => {
    const adminMessages = currentSession.messages
      .filter(msg => msg.sender === "assistant")
      .reverse()
      .find(msg => {
        const parsed = parseResponse(msg.content);
        return parsed?.type === "admin";
      });
    
    if (adminMessages) {
      return parseResponse(adminMessages.content);
    }
    return null;
  }, [currentSession.messages]);

  // Extract all objects/entities from the admin response
  type LLMObject = { name?: string; fields?: { name: string; type: string; options?: string[] }[] };
  const allObjects = useMemo(() => {
    if (latestAdminResponse?.config && typeof latestAdminResponse.config === "object" && latestAdminResponse.config.objects) {
      // Convert objects to array if it's a dictionary
      let objectsArr: LLMObject[] = [];
      const rawObjects = latestAdminResponse.config.objects;
      if (Array.isArray(rawObjects)) {
        objectsArr = rawObjects;
      } else if (typeof rawObjects === 'object' && rawObjects !== null) {
        objectsArr = Object.entries(rawObjects).map(([name, obj]) => ({
          name,
          fields: obj.fields
        }));
      }
      return objectsArr.map((object, idx) => {
        // Convert fields to array if it's a dictionary
        let fields: { name: string; type: string; options?: string[] }[] = [];
        if (Array.isArray(object.fields)) {
          fields = object.fields;
        } else if (typeof object.fields === 'object' && object.fields !== null) {
          fields = Object.entries(object.fields).map(([fname, ftype]) => ({ name: fname, type: String(ftype) }));
        }
        const entityType = object.name || `Entity ${idx + 1}`;
        const detailsObj: Record<string, string> = {};
        fields.forEach((f) => {
          detailsObj[f.name] = "";
        });
        const labelField = fields[0]?.name || "Sample";
        const entities = [{ id: 1, label: labelField }];
        const entityDetails = { 1: detailsObj };
        return { entityType, entities, entityDetails, fields };
      });
    }
    return [];
  }, [latestAdminResponse]);

  // If there are objects, use the selected one; else fallback to empty
  const hasObjects = allObjects && allObjects.length > 0;
  const selectedObject = hasObjects ? allObjects[selectedObjectIndex] : { entityType: "Entity", entities: [], entityDetails: {} };

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 font-sans relative">
      {/* Settings menu bottom left */}
      <SettingsMenu dark={dark} setDark={setDark} adminMode={adminMode} setAdminMode={setAdminMode} />
      <PanelGroup direction="horizontal">
        <Panel defaultSize={18} minSize={12} maxSize={25}>
          <ChatList sessions={sessions} currentId={currentId} onSelect={setCurrentId} />
        </Panel>
        <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full w-full border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col items-stretch justify-stretch">
            {latestAdminResponse ? (
              <>
                {/* Tab bar for multiple objects */}
                {hasObjects && (
                  <div className="flex gap-2 px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#23232b]">
                    {allObjects.map((obj, idx) => (
                      <button
                        key={obj.entityType}
                        className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${selectedObjectIndex === idx ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                        onClick={() => setSelectedObjectIndex(idx)}
                      >
                        {obj.entityType}
                      </button>
                    ))}
                  </div>
                )}
                {/* Debug panel for raw config */}
                {latestAdminResponse.config && (
                  <details className="mx-6 my-2 bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs text-gray-700 dark:text-gray-200 select-all">
                    <summary className="cursor-pointer font-semibold">Raw JSON Config (debug)</summary>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(latestAdminResponse.config, null, 2)}</pre>
                  </details>
                )}
                {/* EntityPanel or message if no fields */}
                {hasObjects ? (
                  allObjects[selectedObjectIndex].fields && allObjects[selectedObjectIndex].fields.length > 0 ? (
                    <EntityPanel 
                      entityType={selectedObject.entityType} 
                      entities={selectedObject.entities} 
                      entityDetails={selectedObject.entityDetails}
                      onEntitiesChange={() => {}}
                      onEntityDetailsChange={() => {}}
                      isAdminMode={adminMode}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg">
                      No fields defined for this object.
                    </div>
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg">
                    No entities available.
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-white dark:bg-[#23232b]">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-lg font-semibold mb-2">No Admin Data Available</div>
                  <div className="text-sm">Chat with the assistant to generate an admin interface</div>
                </div>
              </div>
            )}
          </div>
        </Panel>
        <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
        <Panel defaultSize={32} minSize={20} maxSize={40}>
          <ChatPanel session={currentSession} onSend={sendMessage} loading={loading} />
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;