import React, { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Entity {
  id: number | string;
  label: string;
  status?: string;
}

interface EntityPanelProps {
  entityType: string;
  entities: Entity[];
  entityDetails: Record<number | string, Record<string, string>>;
  onEntitiesChange?: (entities: Entity[]) => void;
  onEntityDetailsChange?: (entityId: number | string, details: Record<string, string>) => void;
  isAdminMode?: boolean;
}

interface SortableEntityItemProps {
  entity: Entity;
  isSelected: boolean;
  onSelect: (id: number | string) => void;
  onDelete: (id: number | string) => void;
  isAdminMode: boolean;
}

interface SortableMetadataFieldProps {
  fieldKey: string;
  fieldValue: string;
  isAdminMode: boolean;
  onFieldKeyChange: (oldKey: string, newKey: string) => void;
  onFieldDelete?: (key: string) => void;
}

function SortableMetadataField({ fieldKey, fieldValue, isAdminMode, onFieldKeyChange, onFieldDelete }: SortableMetadataFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldKey });
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editingKey, setEditingKey] = useState(fieldKey);
  
  const handleKeyEdit = () => {
    if (editingKey !== fieldKey && editingKey.trim()) {
      onFieldKeyChange(fieldKey, editingKey.trim());
    }
    setIsEditingKey(false);
  };

  const handleKeyEditCancel = () => {
    setEditingKey(fieldKey);
    setIsEditingKey(false);
  };
  
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col p-0 md:p-6 min-h-[64px] justify-center ${
        isDragging ? "bg-blue-50 dark:bg-blue-900/30 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        {isAdminMode && (
          <span className="cursor-grab text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm" {...attributes} {...listeners}>⋮⋮</span>
        )}
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex-1">
          {isAdminMode && isEditingKey ? (
            <input
              className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-transparent border-b border-blue-500 outline-none px-1 w-full"
              value={editingKey}
              onChange={(e) => setEditingKey(e.target.value)}
              onBlur={handleKeyEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleKeyEdit();
                } else if (e.key === 'Escape') {
                  handleKeyEditCancel();
                }
              }}
              autoFocus
            />
          ) : (
            <span 
              className={isAdminMode ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : ""}
              onClick={() => isAdminMode && setIsEditingKey(true)}
              title={isAdminMode ? "Click to edit field name" : ""}
            >
              {fieldKey}
            </span>
          )}
        </div>
        {isAdminMode && onFieldDelete && (
          <button
            className="text-red-500 hover:text-red-700 text-xs px-1 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onFieldDelete(fieldKey);
            }}
            title="Delete field"
          >
            ✕
          </button>
        )}
      </div>
      <div className="text-base text-gray-900 dark:text-gray-100 font-medium">{fieldValue}</div>
    </div>
  );
}

function SortableEntityItem({ entity, isSelected, onSelect, onDelete, isAdminMode }: SortableEntityItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entity.id });
  
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-colors text-base font-medium ${
        isSelected ? "bg-gray-200/60 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-800"
      } ${isDragging ? "bg-blue-50 dark:bg-blue-900/30 shadow-lg" : ""}`}
      onClick={() => onSelect(entity.id)}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(entity.id)}
    >
      <div className="flex items-center gap-2 flex-1">
        {isAdminMode && (
          <span className="cursor-grab text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg font-bold mr-2" {...attributes} {...listeners}>⋮⋮</span>
        )}
        <span className="truncate text-gray-900 dark:text-gray-100 flex-1">{entity.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {entity.status && (
          <span className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm ${
            entity.status === "Completed"
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
              : entity.status === "In Progress"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
          }`}>{entity.status}</span>
        )}
        {isAdminMode && (
          <button
            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entity.id);
            }}
            title="Delete entity"
          >
            ✕
          </button>
        )}
      </div>
    </li>
  );
}

export default function EntityPanel({ 
  entityType, 
  entities, 
  entityDetails, 
  onEntitiesChange, 
  onEntityDetailsChange,
  isAdminMode = false 
}: EntityPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<number | string | null>(entities[0]?.id || null);
  const sensors = useSensors(useSensor(PointerSensor));

  const selectedDetails = selectedId ? entityDetails[selectedId] : null;
  const detailEntries = selectedDetails ? Object.entries(selectedDetails) : [];

  // Group details into pairs for two-column layout
  const detailRows = [];
  for (let i = 0; i < detailEntries.length; i += 2) {
    detailRows.push(detailEntries.slice(i, i + 2));
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isAdminMode) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = entities.findIndex(entity => entity.id === active.id);
    const newIndex = entities.findIndex(entity => entity.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newEntities = arrayMove(entities, oldIndex, newIndex);
      onEntitiesChange?.(newEntities);
    }
  };

  const handleDeleteEntity = (entityId: number | string) => {
    if (!isAdminMode) return;
    
    const newEntities = entities.filter(entity => entity.id !== entityId);
    onEntitiesChange?.(newEntities);
    
    // If we deleted the selected entity, select the first remaining one
    if (selectedId === entityId && newEntities.length > 0) {
      setSelectedId(newEntities[0].id);
    } else if (newEntities.length === 0) {
      setSelectedId(null);
    }
  };



  const handleFieldDelete = (key: string) => {
    if (!isAdminMode || !selectedId) return;
    
    const currentDetails = entityDetails[selectedId] || {};
    const updatedDetails = { ...currentDetails };
    delete updatedDetails[key];
    onEntityDetailsChange?.(selectedId, updatedDetails);
  };

  const handleFieldKeyChange = (oldKey: string, newKey: string) => {
    if (!isAdminMode || !selectedId) return;
    
    const currentDetails = entityDetails[selectedId] || {};
    const updatedDetails = { ...currentDetails };
    updatedDetails[newKey] = updatedDetails[oldKey];
    delete updatedDetails[oldKey];
    onEntityDetailsChange?.(selectedId, updatedDetails);
  };

  const handleMetadataDragEnd = (event: DragEndEvent) => {
    if (!isAdminMode || !selectedId || !selectedDetails) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const fieldKeys = Object.keys(selectedDetails);
    const oldIndex = fieldKeys.indexOf(active.id as string);
    const newIndex = fieldKeys.indexOf(over.id as string);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedKeys = arrayMove(fieldKeys, oldIndex, newIndex);
      const reorderedDetails: Record<string, string> = {};
      reorderedKeys.forEach(key => {
        reorderedDetails[key] = selectedDetails[key];
      });
      onEntityDetailsChange?.(selectedId, reorderedDetails);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#23232b] rounded-none shadow-none border-0 overflow-hidden">
      {/* Top Section: Entity List */}
      <div className={`transition-all duration-300 ${expanded ? "h-56" : "h-14"} overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gradient-to-b dark:from-[#23232b] dark:to-[#18181b] relative w-full`}> 
        <button
          className="absolute right-4 top-4 text-xs px-3 py-1 rounded-full bg-white/80 dark:bg-gray-900/80 shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium text-gray-600 dark:text-gray-200"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <span>&#x25B2; Collapse</span> : <span>&#x25BC; Expand</span>}
        </button>
        <div className="p-6 pb-2 text-xl font-semibold text-gray-800 dark:text-gray-100 tracking-tight select-none">
          {entityType} {isAdminMode && <span className="text-sm text-blue-600 dark:text-blue-400">(Admin Mode)</span>}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={entities.map(entity => entity.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="px-6 space-y-2">
              {entities.map((entity) => (
                <SortableEntityItem
                  key={entity.id}
                  entity={entity}
                  isSelected={selectedId === entity.id}
                  onSelect={setSelectedId}
                  onDelete={handleDeleteEntity}
                  isAdminMode={isAdminMode}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
      {/* Bottom Section: Entity Details */}
      <div className="flex-1 w-full h-full p-8 overflow-auto bg-white dark:bg-[#23232b]">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 tracking-tight">
          {entityType} Details {isAdminMode && <span className="text-sm text-blue-600 dark:text-blue-400">(Editable)</span>}
        </h2>
        {selectedDetails ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#23232b] w-full p-0">
            {isAdminMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleMetadataDragEnd}
              >
                <SortableContext
                  items={Object.keys(selectedDetails)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                    {Object.entries(selectedDetails).map(([key, value]) => (
                      <SortableMetadataField
                        key={key}
                        fieldKey={key}
                        fieldValue={value}
                        isAdminMode={isAdminMode}
                        onFieldKeyChange={handleFieldKeyChange}
                        onFieldDelete={handleFieldDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                {Object.entries(selectedDetails).map(([key, value]) => (
                  <div key={key} className="flex flex-col p-0 md:p-6 min-h-[64px] justify-center">
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 md:mb-2">{key}</div>
                    <div className="text-base text-gray-900 dark:text-gray-100 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No entities available
          </div>
        )}
      </div>
    </div>
  );
} 