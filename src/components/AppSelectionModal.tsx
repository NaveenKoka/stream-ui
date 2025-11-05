import React, { useState } from "react";
import { useApps, type CreateAppData } from "../hooks/useApps";

interface AppSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appId: number | null) => void;
  onAppCreated?: (appId: number) => void;
}

const AppSelectionModal: React.FC<AppSelectionModalProps> = ({ isOpen, onClose, onSave, onAppCreated }) => {
  const { apps, createApp } = useApps();
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAppData, setNewAppData] = useState<CreateAppData>({
    name: "",
    description: "",
    status: "draft"
  });

  const handleSave = async () => {
    if (showCreateForm && newAppData.name.trim()) {
      // Create new app first
      const newApp = await createApp(newAppData);
      if (newApp) {
        onSave(newApp.id);
        // Call the app created callback if provided
        if (onAppCreated) {
          onAppCreated(newApp.id);
        }
        onClose();
        return;
      }
    } else {
      // Use selected existing app
      onSave(selectedAppId);
    }
    onClose();
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setSelectedAppId(null);
  };

  const handleSelectExisting = () => {
    setShowCreateForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Save Schema to App
        </h2>
        
        <div className="space-y-4">
          {/* Option buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleSelectExisting}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showCreateForm
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Select Existing App
            </button>
            <button
              onClick={handleCreateNew}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showCreateForm
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Create New App
            </button>
          </div>

          {showCreateForm ? (
            /* Create new app form */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  App Name *
                </label>
                <input
                  type="text"
                  value={newAppData.name}
                  onChange={(e) => setNewAppData({ ...newAppData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter app name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newAppData.description}
                  onChange={(e) => setNewAppData({ ...newAppData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter app description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={newAppData.status}
                  onChange={(e) => setNewAppData({ ...newAppData, status: e.target.value as 'active' | 'inactive' | 'draft' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          ) : (
            /* Select existing app */
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Select an app to save this schema to:
              </div>
              {apps.map((app) => (
                <div
                  key={app.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAppId === app.id
                      ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  onClick={() => setSelectedAppId(app.id)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {app.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      app.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      app.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {app.description}
                  </p>
                </div>
              ))}
              {apps.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No apps available. Create a new app instead.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={showCreateForm ? !newAppData.name.trim() : !selectedAppId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Schema
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSelectionModal; 