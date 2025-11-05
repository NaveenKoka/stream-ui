import React, { useState, useEffect } from 'react';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import ChatPanel from './ChatPanel';

interface UserViewProps {
  userId: number;
  isAdmin?: boolean;
}

interface App {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Workflow {
  id: number;
  name: string;
  steps: Array<{
    name: string;
    fields?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  }>;
  layout?: Array<{
    id: string;
    title: string;
    fields: Array<{
      id: string;
      label: string;
      type: string;
      required: boolean;
      helpText?: string;
      defaultValue?: unknown;
    }>;
    columns: number;
  }>;
  app_id: number;
  created_at: string;
  updated_at: string;
}

interface DataRecord {
  id: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SchemaObject {
  id: number;
  name: string;
  fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}



const UserView: React.FC<UserViewProps> = ({ userId, isAdmin = false }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(isAdmin);
  const [activeTab, setActiveTab] = useState<"apps" | "workflows" | "runtime">("apps");
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [objects, setObjects] = useState<SchemaObject[]>([]);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [selectedObject, setSelectedObject] = useState<SchemaObject | null>(null);

  const { sendMessage } = useChatWebSocket();

  // Fetch apps available to the user
  const fetchUserApps = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/apps`);
      if (response.ok) {
        const appsData = await response.json();
        setApps(appsData);
      }
    } catch (error) {
      console.error('Error fetching user apps:', error);
      setError('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  // Fetch workflows for selected app
  const fetchAppWorkflows = async (appId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/apps/${appId}/workflows`);
      if (response.ok) {
        const workflowsData = await response.json();
        setWorkflows(workflowsData);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };

  // Fetch objects for selected app
  const fetchAppObjects = async (appId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/apps/${appId}/objects`);
      if (response.ok) {
        const objectsData = await response.json();
        setObjects(objectsData);
      } else {
        // Fallback to dummy data for testing
        console.log('Using dummy objects data for testing');
        const dummyObjects = [
          {
            id: 1,
            name: "Employee",
            fields: {
              name: { type: "text", required: true },
              email: { type: "email", required: true },
              department: { type: "select", required: true },
              position: { type: "text", required: true },
              salary: { type: "number", required: true },
              hire_date: { type: "date", required: true },
              status: { type: "select", required: true }
            },
            created_at: "2024-01-01T00:00:00",
            updated_at: "2024-01-01T00:00:00"
          },
          {
            id: 2,
            name: "WorkOrder",
            fields: {
              title: { type: "text", required: true },
              description: { type: "textarea", required: true },
              priority: { type: "select", required: true },
              status: { type: "select", required: true },
              assigned_to: { type: "text", required: false },
              customer: { type: "text", required: true },
              due_date: { type: "date", required: true }
            },
            created_at: "2024-01-01T00:00:00",
            updated_at: "2024-01-01T00:00:00"
          }
        ];
        setObjects(dummyObjects);
      }
    } catch (error) {
      console.error('Error fetching objects:', error);
      // Fallback to dummy data
      const dummyObjects = [
        {
          id: 1,
          name: "Employee",
          fields: {
            name: { type: "text", required: true },
            email: { type: "email", required: true },
            department: { type: "select", required: true },
            position: { type: "text", required: true },
            salary: { type: "number", required: true },
            hire_date: { type: "date", required: true },
            status: { type: "select", required: true }
          },
          created_at: "2024-01-01T00:00:00",
          updated_at: "2024-01-01T00:00:00"
        },
        {
          id: 2,
          name: "WorkOrder",
          fields: {
            title: { type: "text", required: true },
            description: { type: "textarea", required: true },
            priority: { type: "select", required: true },
            status: { type: "select", required: true },
            assigned_to: { type: "text", required: false },
            customer: { type: "text", required: true },
            due_date: { type: "date", required: true }
          },
          created_at: "2024-01-01T00:00:00",
          updated_at: "2024-01-01T00:00:00"
        }
      ];
      setObjects(dummyObjects);
    }
  };

  // Fetch records for selected object
  const fetchObjectRecords = async (objectId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/objects/${objectId}/records`);
      if (response.ok) {
        const recordsData = await response.json();
        setRecords(recordsData);
      } else {
        // Fallback to dummy data for testing
        console.log('Using dummy records data for testing');
        const dummyRecords = [
          {
            id: 1,
            data: {
              name: "John Smith",
              email: "john.smith@company.com",
              department: "Engineering",
              position: "Senior Developer",
              salary: 85000,
              hire_date: "2023-01-15",
              status: "Active"
            },
            created_at: "2024-01-01T00:00:00",
            updated_at: "2024-01-01T00:00:00"
          },
          {
            id: 2,
            data: {
              name: "Sarah Johnson",
              email: "sarah.johnson@company.com",
              department: "Marketing",
              position: "Marketing Manager",
              salary: 75000,
              hire_date: "2022-08-20",
              status: "Active"
            },
            created_at: "2024-01-01T00:00:00",
            updated_at: "2024-01-01T00:00:00"
          },
          {
            id: 3,
            data: {
              name: "Michael Chen",
              email: "michael.chen@company.com",
              department: "Sales",
              position: "Sales Representative",
              salary: 65000,
              hire_date: "2023-03-10",
              status: "Active"
            },
            created_at: "2024-01-01T00:00:00",
            updated_at: "2024-01-01T00:00:00"
          }
        ];
        setRecords(dummyRecords);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      // Fallback to dummy data
      const dummyRecords = [
        {
          id: 1,
          data: {
            name: "John Smith",
            email: "john.smith@company.com",
            department: "Engineering",
            position: "Senior Developer",
            salary: 85000,
            hire_date: "2023-01-15",
            status: "Active"
          },
          created_at: "2024-01-01T00:00:00",
          updated_at: "2024-01-01T00:00:00"
        },
        {
          id: 2,
          data: {
            name: "Sarah Johnson",
            email: "sarah.johnson@company.com",
            department: "Marketing",
            position: "Marketing Manager",
            salary: 75000,
            hire_date: "2022-08-20",
            status: "Active"
          },
          created_at: "2024-01-01T00:00:00",
          updated_at: "2024-01-01T00:00:00"
        },
        {
          id: 3,
          data: {
            name: "Michael Chen",
            email: "michael.chen@company.com",
            department: "Sales",
            position: "Sales Representative",
            salary: 65000,
            hire_date: "2023-03-10",
            status: "Active"
          },
          created_at: "2024-01-01T00:00:00",
          updated_at: "2024-01-01T00:00:00"
        }
      ];
      setRecords(dummyRecords);
    }
  };

  // Handle app selection
  const handleAppSelect = (app: App) => {
    setSelectedApp(app);
    setSelectedWorkflow(null);
    setCurrentStep(0);
    setFormData({});
    setSelectedRecord(null);
    setSelectedObject(null);
    fetchAppWorkflows(app.id);
    fetchAppObjects(app.id);
    setActiveTab("workflows");
  };

  // Handle object selection
  const handleObjectSelect = (object: SchemaObject) => {
    setSelectedObject(object);
    setSelectedRecord(null);
    fetchObjectRecords(object.id);
  };

  // Handle workflow selection
  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setCurrentStep(0);
    setFormData({});
    setActiveTab("runtime");
  };

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle workflow step navigation
  const handleNextStep = () => {
    if (selectedWorkflow && currentStep < selectedWorkflow.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle workflow execution
  const handleRunWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsWorkflowRunning(true);
    try {
      // Send workflow data to chat for processing with record context
      const workflowMessage = {
        type: "workflow_execution",
        workflow: selectedWorkflow,
        formData: formData,
        userId: userId,
        recordId: selectedRecord?.id,
        recordData: selectedRecord?.data,
        currentStep: currentStep
      };

      await sendMessage(JSON.stringify(workflowMessage));
      
      // Send to workflow execution endpoint with record context
      const response = await fetch(`http://localhost:8000/workflows/${selectedWorkflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: formData,
          userId: userId,
          recordId: selectedRecord?.id,
          currentStep: currentStep
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workflow execution result:', result);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  useEffect(() => {
    fetchUserApps();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      <PanelGroup direction="horizontal">
        {/* Left Sidebar - Apps */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <div className="w-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {isAdminMode ? "Admin Mode" : "User Dashboard"}
            </h1>
            {isAdmin && (
              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  isAdminMode
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {isAdminMode ? "User Mode" : "Admin Mode"}
              </button>
            )}
          </div>
        </div>

        {/* Apps List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Available Apps
          </h2>
          {apps.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-sm font-semibold mb-1">No Apps Available</div>
              <div className="text-xs">You don't have access to any apps yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleAppSelect(app)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedApp?.id === app.id
                      ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                      : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {app.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {app.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      app.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </Panel>
        
        <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
        
        {/* Main Content */}
        <Panel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 p-4">
            <button
              onClick={() => setActiveTab("apps")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "apps"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Apps
            </button>
            {selectedApp && (
              <button
                onClick={() => setActiveTab("workflows")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "workflows"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                Workflows ({workflows.length})
              </button>
            )}
            {selectedWorkflow && (
              <button
                onClick={() => setActiveTab("runtime")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "runtime"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                Runtime
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "apps" && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-lg font-semibold mb-2">Select an App</div>
              <div className="text-sm">Choose an app from the sidebar to view its workflows</div>
            </div>
          )}

          {activeTab === "workflows" && selectedApp && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Workflows for {selectedApp.name}
                </h2>
              </div>

              {workflows.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-lg font-semibold mb-2">No Workflows</div>
                  <div className="text-sm">This app doesn't have any workflows yet.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0 text-blue-500 dark:text-blue-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3m-8 6v6a4 4 0 004 4h4" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {workflow.name}
                        </h3>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Steps:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          {workflow.steps.map((step, index) => (
                            <li key={index}>{step.name}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          Ready to Run
                        </span>
                        <button className="text-xs text-blue-600 dark:text-blue-300 font-semibold hover:underline">
                          Run Workflow
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "runtime" && selectedWorkflow && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedWorkflow.name}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Step {currentStep + 1} of {selectedWorkflow.steps.length}
                  </div>
                </div>

                {/* Objects Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Available Objects</h3>
                  {objects.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <div className="text-sm">No objects available</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {objects.map((object) => (
                        <div
                          key={object.id}
                          onClick={() => handleObjectSelect(object)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedObject?.id === object.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {object.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {Object.keys(object.fields).length} fields
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Records Section */}
                {selectedObject && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Records for {selectedObject.name}
                    </h3>
                    {records.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <div className="text-sm">No records available for {selectedObject.name}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {records.map((record) => (
                          <div
                            key={record.id}
                            onClick={() => setSelectedRecord(record)}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedRecord?.id === record.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Record #{record.id}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {Object.keys(record.data).length} fields
                            </div>
                            {/* Show some record data */}
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                              {Object.entries(record.data).slice(0, 2).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Record Context */}
                {selectedRecord && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Selected Record Context
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {Object.entries(selectedRecord.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                          <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(((currentStep + 1) / selectedWorkflow.steps.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentStep + 1) / selectedWorkflow.steps.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Step */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedWorkflow.steps[currentStep].name}
                  </h3>

                  {/* Form Fields - Use Page Layout if available */}
                  <div className="space-y-4">
                    {selectedWorkflow.layout && selectedWorkflow.layout[currentStep] ? (
                      // Use page layout
                      <div className="space-y-6">
                        {selectedWorkflow.layout[currentStep].fields.map((field) => (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={String(formData[field.label] || field.defaultValue || '')}
                                onChange={(e) => handleFieldChange(field.label, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                              />
                            )}
                            {field.type === 'textarea' && (
                              <textarea
                                value={String(formData[field.label] || field.defaultValue || '')}
                                onChange={(e) => handleFieldChange(field.label, e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                              />
                            )}
                            {field.type === 'select' && (
                              <select
                                value={String(formData[field.label] || field.defaultValue || '')}
                                onChange={(e) => handleFieldChange(field.label, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required={field.required}
                              >
                                <option value="">Select an option</option>
                                <option value="option1">Option 1</option>
                                <option value="option2">Option 2</option>
                                <option value="option3">Option 3</option>
                              </select>
                            )}
                            {field.helpText && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Fallback to workflow step fields
                      selectedWorkflow.steps[currentStep].fields?.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {field.name}
                          </label>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={String(formData[field.name] || '')}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Enter ${field.name.toLowerCase()}`}
                            />
                          )}
                          {field.type === 'textarea' && (
                            <textarea
                              value={String(formData[field.name] || '')}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Enter ${field.name.toLowerCase()}`}
                            />
                          )}
                          {field.type === 'select' && (
                            <select
                              value={String(formData[field.name] || '')}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select an option</option>
                              <option value="option1">Option 1</option>
                              <option value="option2">Option 2</option>
                              <option value="option3">Option 3</option>
                            </select>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      currentStep === 0
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                    }`}
                  >
                    Previous
                  </button>

                  {currentStep === selectedWorkflow.steps.length - 1 ? (
                    <button
                      onClick={handleRunWorkflow}
                      disabled={isWorkflowRunning}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWorkflowRunning ? "Running..." : "Run Workflow"}
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
        </Panel>
        
        <PanelResizeHandle className="w-px cursor-col-resize bg-gray-200 dark:bg-gray-800" />
        
        {/* Chat Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <ChatPanel 
            onSchemaSaved={() => {}} 
            onPreviewSchema={() => {}} 
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default UserView; 