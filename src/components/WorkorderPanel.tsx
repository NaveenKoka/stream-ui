import React, { useState } from "react";

// Mock data
const workorders = [
  { id: 1, title: "Install AC Unit", status: "Open" },
  { id: 2, title: "Repair Heater", status: "In Progress" },
  { id: 3, title: "Replace Filter", status: "Completed" },
];

const workorderDetails: Record<number, { [key: string]: string }> = {
  1: {
    "Title": "Install AC Unit",
    "Status": "Open",
    "Customer": "Acme Corp",
    "Address": "123 Main St",
    "Assigned Technician": "John Doe",
    "Scheduled Date": "2024-06-10",
    "Notes": "Install new 2-ton AC unit."
  },
  2: {
    "Title": "Repair Heater",
    "Status": "In Progress",
    "Customer": "Beta LLC",
    "Address": "456 Oak Ave",
    "Assigned Technician": "Jane Smith",
    "Scheduled Date": "2024-06-12",
    "Notes": "Heater not working, check wiring."
  },
  3: {
    "Title": "Replace Filter",
    "Status": "Completed",
    "Customer": "Gamma Inc",
    "Address": "789 Pine Rd",
    "Assigned Technician": "Mike Brown",
    "Scheduled Date": "2024-06-08",
    "Notes": "Replaced air filter."
  }
};

export default function WorkorderPanel() {
  const [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<number>(1);

  const selectedDetails = workorderDetails[selectedId];

  return (
    <div className="flex flex-col h-full border rounded-lg shadow bg-white">
      {/* Top Section: Workorder List */}
      <div className={`transition-all duration-300 ${expanded ? "h-48" : "h-12"} overflow-hidden border-b bg-gray-50 relative`}> 
        <button
          className="absolute right-2 top-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
        <div className="p-4 pb-2 font-semibold text-gray-700">Workorders</div>
        <ul className="px-4 space-y-2">
          {workorders.map((wo) => (
            <li
              key={wo.id}
              className={`p-2 rounded cursor-pointer flex justify-between items-center transition-colors ${
                selectedId === wo.id ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedId(wo.id)}
            >
              <span>{wo.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                wo.status === "Completed"
                  ? "bg-green-100 text-green-700"
                  : wo.status === "In Progress"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-200 text-gray-600"
              }`}>{wo.status}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Bottom Section: Workorder Details */}
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-lg font-bold mb-4 text-blue-700">Workorder Details</h2>
        <table className="w-full text-sm border">
          <tbody>
            {Object.entries(selectedDetails).map(([key, value]) => (
              <tr key={key} className="border-b last:border-b-0">
                <td className="font-semibold py-2 px-3 w-1/3 bg-gray-50 text-gray-700">{key}</td>
                <td className="py-2 px-3">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 