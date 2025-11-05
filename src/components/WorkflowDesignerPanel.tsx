import React from "react";

interface FieldType {
  value: string;
  label: string;
  description: string;
  category: string;
  validation: {
    [key: string]: any;
  };
  ui: {
    input_type: string;
    placeholder?: string;
    [key: string]: any;
  };
}

interface WorkflowDesignerPanelProps {
  schema?: any;
  fieldTypes?: FieldType[];
}

const salesforceObject = {
  name: "Field Service Object Name",
  status: "Draft",
  created: "7/20/2025",
  updated: "7/20/2025",
  fields: [
    { label: "Title", value: "Install New Router" },
    { label: "Status", value: "Open" },
    { label: "Customer", value: "Acme Corp" },
    { label: "Assigned Technician", value: "Jane Doe" },
    { label: "Scheduled Date", value: "7/22/2025" },
    { label: "Notes", value: "Customer requested morning appointment." },
  ],
};

const WorkflowDesignerPanel: React.FC<WorkflowDesignerPanelProps> = ({ schema, fieldTypes = [] }) => {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#23232b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 overflow-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
            {salesforceObject.name}
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
            <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 font-semibold uppercase text-xs">
              {salesforceObject.status}
            </span>
            <span>Created {salesforceObject.created}</span>
            <span>Updated {salesforceObject.updated}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Edit</button>
          <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Clone</button>
          <button className="px-4 py-2 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition">Delete</button>
        </div>
      </div>
      {/* Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {salesforceObject.fields.map((field, idx) => (
          <div key={idx} className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">{field.label}</div>
            <div className="text-base text-gray-900 dark:text-gray-100 font-medium">{field.value}</div>
          </div>
        ))}
      </div>
      {/* Related Lists Tabs Placeholder */}
      <div>
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button className="px-3 py-2 font-semibold text-blue-600 border-b-2 border-blue-600 bg-transparent">Related</button>
          <button className="px-3 py-2 font-semibold text-gray-500 hover:text-blue-600 transition bg-transparent">Activity</button>
          <button className="px-3 py-2 font-semibold text-gray-500 hover:text-blue-600 transition bg-transparent">Notes</button>
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          Related lists content goes here (e.g., related records, attachments, etc.)
        </div>
      </div>
    </div>
  );
};

export default WorkflowDesignerPanel; 