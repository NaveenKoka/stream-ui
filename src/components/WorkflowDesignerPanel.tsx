import React from "react";

// Sample metadata in the same format as the LLM JSON response
const sampleMetadata = {
  entities: [
    {
      type: "Workorder",
      fields: [
        { name: "Title", type: "string", required: true },
        { name: "Status", type: "enum", options: ["Open", "In Progress", "Completed"] },
        { name: "Customer", type: "string" },
        { name: "Assigned Technician", type: "string" },
        { name: "Scheduled Date", type: "date" },
        { name: "Notes", type: "text" }
      ]
    },
    {
      type: "Invoice",
      fields: [
        { name: "Invoice Number", type: "string", required: true },
        { name: "Amount", type: "number" },
        { name: "Due Date", type: "date" },
        { name: "Status", type: "enum", options: ["Draft", "Sent", "Paid"] }
      ]
    }
  ],
  workflow: [
    { step: "Create Workorder", entity: "Workorder" },
    { step: "Assign Technician", entity: "Workorder" },
    { step: "Generate Invoice", entity: "Invoice" },
    { step: "Complete Workorder", entity: "Workorder" }
  ]
};

const WorkflowDesignerPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#23232b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 tracking-tight">Workflow Designer (Admin Mode)</h2>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Entities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sampleMetadata.entities.map(entity => (
            <div key={entity.type} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 shadow-sm">
              <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{entity.type}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-300">
                    <th className="text-left pb-1">Field</th>
                    <th className="text-left pb-1">Type</th>
                    <th className="text-left pb-1">Required</th>
                    <th className="text-left pb-1">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {entity.fields.map(field => (
                    <tr key={field.name} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-1 text-gray-900 dark:text-gray-100 font-medium">{field.name}</td>
                      <td className="py-1 text-gray-700 dark:text-gray-300">{field.type}</td>
                      <td className="py-1 text-center">
                        {field.required ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 text-xs font-semibold">Yes</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300 text-xs">No</span>
                        )}
                      </td>
                      <td className="py-1 text-xs text-gray-600 dark:text-gray-400">
                        {field.options ? field.options.join(", ") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Workflow Steps</h3>
        <ol className="space-y-3">
          {sampleMetadata.workflow.map((step, idx) => (
            <li key={idx} className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 font-bold text-lg">{idx + 1}</span>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-gray-100">{step.step}</span>
                <span className="text-xs text-gray-500 dark:text-gray-300">Entity: {step.entity}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default WorkflowDesignerPanel; 