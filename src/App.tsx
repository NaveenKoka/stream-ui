import React, { useEffect, useState, useMemo } from "react";
import "./index.css";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import { useChatStore } from "./hooks/useChatStore";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import EntityPanel from "./components/AdminLayout";
import AppView from "./components/AppView";
import UserView from "./components/UserView";
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

function SettingsMenu({ dark, setDark, adminMode, setAdminMode, userMode, setUserMode }: {
  dark: boolean;
  setDark: (d: boolean) => void;
  adminMode: boolean;
  setAdminMode: (a: boolean) => void;
  userMode: boolean;
  setUserMode: (u: boolean) => void;
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
              onClick={() => {
                setAdminMode(!adminMode);
                if (userMode) setUserMode(false);
              }}
              aria-label="Toggle admin mode"
            >
              {adminMode ? "On" : "Off"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200 font-medium">User Mode</span>
            <button
              className={`px-3 py-1 rounded-full border transition font-medium ${userMode ? "bg-green-600 text-white border-green-700" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              onClick={() => {
                setUserMode(!userMode);
                if (adminMode) setAdminMode(false);
              }}
              aria-label="Toggle user mode"
            >
              {userMode ? "On" : "Off"}
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
  const [userMode, setUserMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(1); // Default to user ID 1
  const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [previewSchema, setPreviewSchema] = useState<Record<string, unknown> | null>(null);

  // Handle app selection
  const handleAppSelect = (appId: number) => {
    console.log("App selection triggered with appId:", appId);
    console.log("Current selectedAppId before:", selectedAppId);
    setSelectedAppId(appId);
    console.log("selectedAppId state updated to:", appId);
  };

  // Handle clearing app selection (go back to chat view)
  const handleClearAppSelection = () => {
    setSelectedAppId(null);
  };

  // Handle app creation from modal
  const handleAppCreated = (appId: number) => {
    setSelectedAppId(appId);
    console.log("Created and selected app:", appId);
  };

  // Handle preview schema
  const handlePreviewSchema = (schema: Record<string, unknown>) => {
    console.log("Preview schema requested:", schema);
    setPreviewSchema(schema);
  };

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
      <SettingsMenu dark={dark} setDark={setDark} adminMode={adminMode} setAdminMode={setAdminMode} userMode={userMode} setUserMode={setUserMode} />
      
      {userMode ? (
        /* Show User View when in user mode - takes over entire interface */
        <UserView userId={currentUserId} isAdmin={adminMode} />
      ) : (
        /* Show Admin Interface */
        <PanelGroup direction="horizontal">
          <Panel defaultSize={16} minSize={10} maxSize={22}>
            <Sidebar 
              sessions={sessions} 
              currentId={currentId} 
              selectedAppId={selectedAppId}
              onSelectChat={setCurrentId}
              onSelectApp={handleAppSelect}
            />
          </Panel>
          <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full w-full border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col items-stretch justify-stretch">
              {selectedAppId ? (
              /* Show App View when an app is selected */
              <AppView appId={selectedAppId} adminMode={adminMode} onBack={handleClearAppSelection} />
            ) : latestAdminResponse ? (
              /* Show Admin Data when available */
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
                  <div className="text-sm">Chat with the assistant to generate an admin interface or select an app from the sidebar</div>
                </div>
              </div>
            )}
          </div>
        </Panel>
        <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
        <Panel defaultSize={24} minSize={15} maxSize={35}>
          <ChatPanel session={currentSession} onSend={sendMessage} loading={loading} onAppCreated={handleAppCreated} selectedAppId={selectedAppId} onPreviewSchema={handlePreviewSchema} />
        </Panel>
      </PanelGroup>
      )}

      {/* Preview Schema Modal */}
      {previewSchema && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Schema Preview</h3>
              <button
                onClick={() => setPreviewSchema(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Objects Preview */}
              {previewSchema.objects && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Objects</h4>
                  <div className="space-y-3">
                                         {Object.entries(previewSchema.objects as Record<string, any>).map(([objectName, objectData]) => (
                       <div key={objectName} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                         <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{objectName}</h5>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                           {Object.entries(objectData.fields || {}).map(([fieldName, fieldType]) => {
                             // Handle both simple string types and object types
                             let displayType = 'unknown';
                             if (typeof fieldType === 'string') {
                               displayType = fieldType;
                             } else if (typeof fieldType === 'object' && fieldType !== null) {
                               displayType = (fieldType as any).type || JSON.stringify(fieldType);
                             }
                             
                             return (
                               <div key={fieldName} className="text-sm text-gray-600 dark:text-gray-400">
                                 <span className="font-medium">{fieldName}:</span> <span className="text-blue-600 dark:text-blue-400">{displayType}</span>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {/* Workflows Preview */}
              {previewSchema.workflows && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Workflows</h4>
                  <div className="space-y-3">
                    {Object.entries(previewSchema.workflows as Record<string, any>).map(([workflowName, workflowData]) => (
                      <div key={workflowName} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{workflowName}</h5>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {(workflowData.steps || []).map((step: any, index: number) => (
                            <li key={index}>{typeof step === 'string' ? step : step.name || `Step ${index + 1}`}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Raw Schema (JSON)</h4>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(previewSchema, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPreviewSchema(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  // Save schema to backend
                  try {
                    const response = await fetch('http://localhost:8000/save-schema', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...previewSchema, app_id: selectedAppId })
                    });
                    if (response.ok) {
                      alert('Schema saved successfully!');
                      setPreviewSchema(null);
                    } else {
                      alert('Failed to save schema');
                    }
                  } catch (error) {
                    console.error('Error saving schema:', error);
                    alert('Error saving schema');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Schema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;