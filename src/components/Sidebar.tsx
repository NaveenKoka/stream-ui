import React, { useState } from "react";
import { useApps, type App as AppType } from "../hooks/useApps";

interface ChatSession {
  id: string;
  title: string;
  messages: { content: string }[];
}

interface SidebarProps {
  sessions: ChatSession[];
  currentId: string;
  selectedAppId?: number | null;
  onSelectChat: (id: string) => void;
  onSelectApp: (id: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentId, 
  selectedAppId,
  onSelectChat, 
  onSelectApp 
}) => {
  const [activeTab, setActiveTab] = useState<"chats" | "apps">("chats");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apps, loading, error, createApp } = useApps();
  
  const getStatusColor = (status: AppType["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="h-full w-full bg-white dark:bg-[#23232b] border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Stream UI
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "chats"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Chats ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("apps")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "apps"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Apps ({apps.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" ? (
          /* Chats Section */
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Recent Chats
              </h2>
              <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                + New Chat
              </button>
            </div>
            
            <div className="space-y-2">
              {sessions.map((session) => {
                const lastMsg = session.messages[session.messages.length - 1];
                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentId === session.id
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                    onClick={() => onSelectChat(session.id)}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {lastMsg ? lastMsg.content : "No messages yet"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Apps Section */
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Created Apps
              </h2>
              <button 
                className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => {
                  // TODO: Open create app modal
                  console.log("Create new app clicked");
                }}
              >
                + Create New App
              </button>
            </div>
            
            {loading && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                Loading apps...
              </div>
            )}
            
            {error && (
              <div className="text-center py-4 text-red-500 dark:text-red-400">
                Error: {error}
              </div>
            )}
            
            {!loading && !error && (
              <div className="space-y-3">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAppId === app.id
                        ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => {
                      console.log("App clicked:", app.id, app.name);
                      onSelectApp(app.id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {app.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {app.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Created {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 