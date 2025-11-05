import React, { useState, useEffect } from "react";
import { useApps } from "../hooks/useApps";
import { useFieldTypes } from "../hooks/useFieldTypes";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import type { DragEndEvent } from '@dnd-kit/core';
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import ReactModal from 'react-modal';
import WorkflowDesignerPanel from './WorkflowDesignerPanel';
import ChatPanel from './ChatPanel';

interface AppViewProps {
  appId: number;
  adminMode: boolean;
  onBack?: () => void;
}

interface Field { id: string; name: string; type: string; }
interface LayoutField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  helpText?: string;
  defaultValue?: any;
}
interface LayoutSection {
  id: string;
  title: string;
  fields: LayoutField[];
  columns: number; // Added columns property
}
interface Step {
  name: string;
  fields?: Field[];
  layout?: LayoutSection[];
}
interface Workflow {
  id: number;
  name: string;
  steps: Step[];
  app_id: number;
  created_at: string;
  updated_at: string;
  description?: string;
  status?: string;
}

interface SchemaObject {
  id: number;
  name: string;
  fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function WorkflowPageLayout({ workflow, objects, onBack, onSave, onDelete }: {
  workflow: Workflow;
  objects: SchemaObject[];
  onBack: () => void;
  onSave: (updated: Workflow) => void;
  onDelete: (id: number) => void;
}) {
  const [tab, setTab] = useState<'details' | 'steps' | 'objects'>('details');
  const [editWorkflow, setEditWorkflow] = useState({ ...workflow });
  const [steps, setSteps] = useState<Step[]>([...workflow.steps]);
  const [isDirty, setIsDirty] = useState(false);

  // DnD-kit setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  function handleStepChange(idx: number, value: string) {
    const newSteps = [...steps];
    newSteps[idx] = { ...newSteps[idx], name: value };
    setSteps(newSteps);
    setIsDirty(true);
  }
  function handleAddStep() {
    setSteps([...steps, { name: '' }]);
    setIsDirty(true);
  }
  function handleDeleteStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
    setIsDirty(true);
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = steps.findIndex((_, i) => i === Number(active.id));
      const newIndex = steps.findIndex((_, i) => i === Number(over.id));
      setSteps(arrayMove(steps, oldIndex, newIndex));
      setIsDirty(true);
    }
  }
  function handleStepFieldChange(stepIdx: number, fieldIdx: number, field: Field) {
    const newSteps = [...steps];
    newSteps[stepIdx] = {
      ...newSteps[stepIdx],
      fields: newSteps[stepIdx].fields?.map((f, i) => (i === fieldIdx ? field : f)) || [field]
    };
    setSteps(newSteps);
    setIsDirty(true);
  }
  function handleAddField(stepIdx: number) {
    const newSteps = [...steps];
    newSteps[stepIdx] = {
      ...newSteps[stepIdx],
      fields: [...(newSteps[stepIdx].fields || []), { name: '', type: 'string' }]
    };
    setSteps(newSteps);
    setIsDirty(true);
  }
  function handleDeleteField(stepIdx: number, fieldIdx: number) {
    const newSteps = [...steps];
    newSteps[stepIdx] = {
      ...newSteps[stepIdx],
      fields: newSteps[stepIdx].fields?.filter((_, i) => i !== fieldIdx) || []
    };
    setSteps(newSteps);
    setIsDirty(true);
  }
  function handleFieldChange(field: keyof Workflow, value: string) {
    setEditWorkflow({ ...editWorkflow, [field]: value });
    setIsDirty(true);
  }
  function handleSave() {
    onSave({ ...editWorkflow, steps });
    setIsDirty(false);
  }
  function handleCancel() {
    setEditWorkflow({ ...workflow });
    setSteps([...workflow.steps]);
    setIsDirty(false);
  }

  // Related objects: naive match by name in step text
  const relatedObjects = objects.filter(obj =>
    steps.some(step =>
      typeof step?.name === 'string' &&
      typeof obj?.name === 'string' &&
      step.name.toLowerCase().includes(obj.name.toLowerCase())
    )
  );

  // 1. Add state to track which step is being edited for layout
  const [layoutEditorStepIdx, setLayoutEditorStepIdx] = useState<number | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<LayoutSection[] | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // 1. In WorkflowPageLayout, extract all fields from objects:
  const objectFields: Field[] = objects.flatMap(obj => Object.entries(obj.fields).map(([name, type]) => ({ id: nanoid(), name, type: String(type) })));

  // 1. In WorkflowPageLayout, group fields by object/entity:
  const groupedFields = objects.map(obj => ({
    objectName: obj.name,
    fields: Object.entries(obj.fields).map(([name, type]) => ({ id: nanoid(), name, type: String(type) }))
  }));

  // In WorkflowPageLayout, after rendering workflow details and steps, render the PageLayoutEditor directly below.
  // Remove any modal, overlay, or separate page logic for the layout editor.
  // Pass the current workflow, objects, and layout data as props to PageLayoutEditor.
  // The layout editor should always be visible as part of the workflow details view.

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-md flex flex-col gap-4">
      <button
        className="self-start mb-2 text-xs text-blue-600 dark:text-blue-300 font-semibold hover:underline focus:outline-none"
        onClick={onBack}
      >
        ← Back to Workflows
      </button>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-shrink-0 text-blue-500 dark:text-blue-300">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3m-8 6v6a4 4 0 004 4h4" />
          </svg>
        </div>
        <div>
          <input
            className="text-xl font-bold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-gray-900 dark:text-gray-100"
            value={editWorkflow.name}
            onChange={e => handleFieldChange('name', e.target.value)}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">Created {new Date(workflow.created_at).toLocaleDateString()} | Updated {new Date(workflow.updated_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <button className={`px-3 py-1 rounded-full text-xs font-semibold ${tab === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setTab('details')}>Details</button>
        <button className={`px-3 py-1 rounded-full text-xs font-semibold ${tab === 'steps' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setTab('steps')}>Steps</button>
        <button className={`px-3 py-1 rounded-full text-xs font-semibold ${tab === 'objects' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setTab('objects')}>Related Objects</button>
      </div>
      {tab === 'details' && (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300"
            value={editWorkflow.description || ''}
            onChange={e => handleFieldChange('description', e.target.value)}
            rows={3}
          />
          {/* 1. In WorkflowPageLayout, replace the status dropdown with an iOS-style toggle switch for active/inactive. */}
          {/* 2. Ensure the Page Layout Editor is always visible directly below the workflow details. */}
          {/* 3. No tabs or extra clicks required to access the layout editor. */}
          {/* Example for the switch: */}
          {/* <label className="inline-flex items-center cursor-pointer"> */}
          {/*   <input type="checkbox" checked={editWorkflow.status === 'active'} onChange={e => handleFieldChange('status', e.target.checked ? 'active' : 'inactive')} className="sr-only peer" /> */}
          {/*   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-700 peer-checked:bg-blue-600 transition-all"></div> */}
          {/*   <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{editWorkflow.status === 'active' ? 'Active' : 'Inactive'}</span> */}
          {/* </label> */}
        </div>
      )}
      {tab === 'steps' && (
        <div className="flex flex-col gap-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
              {steps.map((step, idx) => (
                <SortableStep
                  key={idx}
                  idx={idx}
                  step={step}
                  onChange={handleStepChange}
                  onDelete={handleDeleteStep}
                  onAddField={handleAddField}
                  onDeleteField={handleDeleteField}
                  onFieldChange={handleStepFieldChange}
                  onOpenLayoutEditor={() => {
                    setLayoutEditorStepIdx(idx);
                    setLayoutDraft(step.layout || []);
                    setPreviewMode(false);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button className="mt-2 px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700" onClick={handleAddStep}>+ Add Step</button>
        </div>
      )}
      {tab === 'objects' && (
        <div className="flex flex-col gap-2">
          {relatedObjects.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm">No related objects found.</div>
          ) : (
            relatedObjects.map(obj => (
              <div key={obj.id} className="border border-gray-200 dark:border-gray-700 rounded p-2 flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{obj.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Fields: {Object.keys(obj.fields).join(', ')}</span>
              </div>
            ))
          )}
        </div>
      )}
      <div className="flex gap-2 mt-4 justify-end">
        <button className="px-4 py-2 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-800" onClick={() => onDelete(workflow.id)}>Delete</button>
        <button className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleCancel} disabled={!isDirty}>Cancel</button>
        <button className="px-4 py-2 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700" onClick={handleSave} disabled={!isDirty}>Save</button>
      </div>
    </div>
  );
}

function SortableStep({ idx, step, onChange, onDelete, onAddField, onDeleteField, onFieldChange, onOpenLayoutEditor }: { idx: number; step: Step; onChange: (idx: number, value: string) => void; onDelete: (idx: number) => void; onAddField: (stepIdx: number) => void; onDeleteField: (stepIdx: number, fieldIdx: number) => void; onFieldChange: (stepIdx: number, fieldIdx: number, field: Field) => void; onOpenLayoutEditor: () => void; }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idx.toString() });

  function handleSaveField() {
    onFieldChange(idx, step.fields?.length || 0, { name: newFieldName, type: newFieldType });
    setNewFieldName('');
    setNewFieldType('string');
    setIsEditing(false);
  }

  function handleCancelField() {
    setIsEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 mb-1"
      {...attributes}
    >
      <span {...listeners} className="cursor-move text-gray-400 dark:text-gray-500">☰</span>
      <input
        className="flex-1 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-sm text-gray-900 dark:text-gray-100"
        value={step.name}
        onChange={e => onChange(idx, e.target.value)}
      />
      <button className="text-xs text-purple-600 dark:text-purple-300 font-semibold hover:underline" onClick={onOpenLayoutEditor}>Page Layout</button>
      <button className="text-xs text-blue-500 dark:text-blue-300 font-semibold hover:underline" onClick={() => setIsEditing(true)}>Edit Fields</button>
      <button className="text-xs text-red-500 dark:text-red-300 font-semibold hover:underline" onClick={() => onDelete(idx)}>Delete</button>

      {isEditing && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-sm text-gray-900 dark:text-gray-100"
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              placeholder="Field Name"
            />
            <select
              className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-sm text-gray-900 dark:text-gray-100"
              value={newFieldType}
              onChange={e => setNewFieldType(e.target.value)}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="object">Object</option>
              <option value="array">Array</option>
            </select>
            <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700" onClick={handleSaveField}>Save</button>
            <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleCancelField}>Cancel</button>
          </div>
          <div className="flex flex-col gap-1">
            {step.fields?.map((field, fieldIdx) => (
              <div key={fieldIdx} className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-sm text-gray-900 dark:text-gray-100"
                  value={field.name}
                  onChange={e => onFieldChange(idx, fieldIdx, { ...field, name: e.target.value })}
                />
                <select
                  className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-sm text-gray-900 dark:text-gray-100"
                  value={field.type}
                  onChange={e => onFieldChange(idx, fieldIdx, { ...field, type: e.target.value })}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
                <button className="text-xs text-red-500 dark:text-red-300 font-semibold hover:underline" onClick={() => onDeleteField(idx, fieldIdx)}>Delete</button>
              </div>
            ))}
            <button className="mt-1 px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700" onClick={() => onAddField(idx)}>+ Add Field</button>
          </div>
        </div>
      )}
      {!isEditing && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Fields: {step.fields?.map(f => `${f.name}: ${f.type}`).join(', ')}</span>
        </div>
      )}
    </div>
  );
}

// Replace the placeholder PageLayoutEditor with a full implementation
function PageLayoutEditor({ layout, previewMode, onChange, onPreview, onSave, onCancel, objectFields, groupedFields }: { layout: LayoutSection[]; previewMode: boolean; onChange: (l: LayoutSection[]) => void; onPreview: (b: boolean) => void; onSave: () => void; onCancel: () => void; objectFields: Field[]; groupedFields: { objectName: string, fields: Field[] }[]; }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // State to track available fields (fields not yet used in layout)
  const [availableFields, setAvailableFields] = useState<Field[]>(objectFields);

  // Section drag-and-drop
  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = layout.findIndex(s => s.id === active.id);
      const newIndex = layout.findIndex(s => s.id === over.id);
      onChange(arrayMove(layout, oldIndex, newIndex));
    }
  }

  // Field drag-and-drop within a section
  function handleFieldDragEnd(sectionIdx: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const section = layout[sectionIdx];
      const oldIndex = section.fields.findIndex(f => f.id === active.id);
      const newIndex = section.fields.findIndex(f => f.id === over.id);
      const newFields = arrayMove(section.fields, oldIndex, newIndex);
      const newLayout = layout.map((s, i) => i === sectionIdx ? { ...s, fields: newFields } : s);
      onChange(newLayout);
    }
  }

  function addSection() {
    onChange([
      ...layout,
      { id: nanoid(), title: 'New Section', fields: [], columns: 2 } // Added columns property
    ]);
  }
  function removeSection(idx: number) {
    onChange(layout.filter((_, i) => i !== idx));
  }
  function updateSectionTitle(idx: number, title: string) {
    onChange(layout.map((s, i) => i === idx ? { ...s, title } : s));
  }
  function updateSectionColumns(idx: number, columns: number) {
    onChange(layout.map((s, i) => i === idx ? { ...s, columns } : s));
  }
  function addField(sectionIdx: number) {
    const newField: LayoutField = { id: nanoid(), label: 'New Field', type: 'string', required: false };
    const newLayout = layout.map((s, i) => i === sectionIdx ? { ...s, fields: [...s.fields, newField] } : s);
    onChange(newLayout);
  }
  function removeField(sectionIdx: number, fieldIdx: number) {
    const newLayout = layout.map((s, i) => i === sectionIdx ? { ...s, fields: s.fields.filter((_, j) => j !== fieldIdx) } : s);
    onChange(newLayout);
  }
  function updateField(sectionIdx: number, fieldIdx: number, field: Partial<LayoutField>) {
    const newLayout = layout.map((s, i) =>
      i === sectionIdx
        ? { ...s, fields: s.fields.map((f, j) => j === fieldIdx ? { ...f, ...field } : f) }
        : s
    );
    onChange(newLayout);
  }

  // Function to handle dropping a field into a section
  function handleFieldDrop(sectionIdx: number, field: Field, colIdx: number) {
    const newLayout = [...layout];
    const newField: LayoutField = {
      id: nanoid(),
      label: field.name,
      type: field.type,
      required: false
    };
    
    // Calculate the field index based on column position
    const existingFieldsInColumn = newLayout[sectionIdx].fields.filter((_, fieldIdx) => fieldIdx % newLayout[sectionIdx].columns === colIdx);
    const insertIndex = colIdx + (existingFieldsInColumn.length * newLayout[sectionIdx].columns);
    
    newLayout[sectionIdx].fields.splice(insertIndex, 0, newField);
    onChange(newLayout);
    
    // Remove field from available fields
    setAvailableFields(prev => prev.filter(f => f.id !== field.id));
  }

  // Function to remove a field from a section and add it back to available fields
  function removeFieldFromSection(sectionIdx: number, fieldIdx: number) {
    const newLayout = [...layout];
    const removedField = newLayout[sectionIdx].fields[fieldIdx];
    newLayout[sectionIdx].fields.splice(fieldIdx, 1);
    onChange(newLayout);
    
    // Add field back to available fields
    const originalField = objectFields.find(f => f.name === removedField.label);
    if (originalField) {
      setAvailableFields(prev => [...prev, originalField]);
    }
  }

  // Handle drag end for fields
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    
    console.log('Drag end:', { active: active.id, over: over.id }); // Debug log
    
    // Handle dropping field into section column
    if (active.id.toString().startsWith('field-') && over.id.toString().startsWith('section-')) {
      const fieldId = active.id.toString().replace('field-', '');
      const sectionMatch = over.id.toString().match(/section-(\d+)-col-(\d+)/);
      if (sectionMatch) {
        const sectionIdx = parseInt(sectionMatch[1]);
        const colIdx = parseInt(sectionMatch[2]);
        const field = availableFields.find(f => f.id === fieldId);
        if (field) {
          console.log('Dropping field:', field.name, 'into section:', sectionIdx, 'column:', colIdx); // Debug log
          handleFieldDrop(sectionIdx, field, colIdx);
        }
      }
    }
  }

  // Preview rendering (modal/overlay)
  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8 overflow-auto">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative">
          <h2 className="text-2xl font-bold mb-4">Page Layout Preview</h2>
          {layout.length === 0 && <div className="text-gray-400">No sections defined.</div>}
          {layout.map(section => (
            <div key={section.id} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">{section.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(field => (
                  <div key={field.id} className="flex flex-col gap-1 border-b pb-2">
                    <label className="font-medium text-gray-800 dark:text-gray-100">
                      {field.label}{field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 text-sm text-gray-900 dark:text-gray-100"
                      placeholder={field.helpText || ''}
                      disabled
                    />
                    {field.helpText && <span className="text-xs text-gray-500">{field.helpText}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 justify-end mt-8">
            <button className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => onPreview(false)}>Back to Edit</button>
          </div>
        </div>
      </div>
    );
  }

  // Editor rendering (Sidebar + Canvas)
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button className="text-xs text-blue-600 dark:text-blue-300 font-semibold hover:underline focus:outline-none" onClick={onCancel}>← Back</button>
          <h2 className="text-xl font-bold ml-2">Page Layout Designer</h2>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800" onClick={() => onPreview(true)}>Preview</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700" onClick={onSave}>Save</button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6">
          {/* Sidebar Palette */}
          <div className="w-64 flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold mb-2">Available Fields</h3>
              <SortableContext items={availableFields.map(f => `field-${f.id}`)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {availableFields.length === 0 && <div className="text-xs text-gray-400">No fields available</div>}
                  {availableFields.map(field => (
                    <SortableField
                      key={`field-${field.id}`}
                      id={`field-${field.id}`}
                      field={field}
                      onRemove={() => {}}
                      onChange={() => {}}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
            <button className="w-full mt-2 px-4 py-2 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700" onClick={addSection}>+ Add Section</button>
          </div>
          {/* Main Canvas */}
          <div className="flex-1 flex flex-col gap-4">
            {layout.length === 0 && (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="text-sm font-semibold mb-1">No Sections Defined</div>
                <div className="text-xs">Click "+ Add Section" to start designing your page layout.</div>
              </div>
            )}
            {layout.map((section, sectionIdx) => (
              <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 text-lg font-semibold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-gray-900 dark:text-gray-100"
                    value={section.title}
                    onChange={e => updateSectionTitle(sectionIdx, e.target.value)}
                  />
                  <select
                    className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-xs text-gray-900 dark:text-gray-100"
                    value={section.columns}
                    onChange={e => updateSectionColumns(sectionIdx, Number(e.target.value))}
                  >
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                    <option value="4">4 Columns</option>
                  </select>
                  <button className="text-xs text-red-500 dark:text-red-300 font-semibold hover:underline" onClick={() => removeSection(sectionIdx)}>Delete</button>
                </div>
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}>
                  {[...Array(section.columns)].map((_, colIdx) => (
                    <DroppableSection key={colIdx} sectionIdx={sectionIdx} colIdx={colIdx}>
                      <div className="text-xs text-gray-400 text-center min-h-[20px]">
                        Drop field here
                      </div>
                      {/* Show fields in this column */}
                      {section.fields.filter((_, fieldIdx) => fieldIdx % section.columns === colIdx).map((field, fieldIdx) => (
                        <div key={field.id} className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-xs">
                          <span className="font-semibold">{field.label}</span>
                          <span className="ml-auto text-gray-400">{field.type}</span>
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeFieldFromSection(sectionIdx, fieldIdx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </DroppableSection>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function SectionEditor({ section, onRemove, onTitleChange, onColumnsChange, onRemoveField, onFieldChange, onFieldDragEnd }: {
  section: LayoutSection;
  onRemove: () => void;
  onTitleChange: (title: string) => void;
  onColumnsChange: (columns: number) => void;
  onRemoveField: (fieldIdx: number) => void;
  onFieldChange: (fieldIdx: number, field: Partial<LayoutField>) => void;
  onFieldDragEnd: (event: DragEndEvent) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  // State to hold fields for each column
  const [columns, setColumns] = useState<Field[][]>(() => {
    const initialColumns: Field[][] = [];
    for (let i = 0; i < section.columns; i++) {
      initialColumns.push([]);
    }
    return initialColumns;
  });

  // Function to add a field to a specific column
  const addFieldToColumn = (field: Field, columnIndex: number) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      newColumns[columnIndex] = [...newColumns[columnIndex], field];
      return newColumns;
    });
  };

  // Function to remove a field from a specific column
  const removeFieldFromColumn = (field: Field, columnIndex: number) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      newColumns[columnIndex] = newColumns[columnIndex].filter(f => f.name !== field.name);
      return newColumns;
    });
  };

  // Function to update a field in a specific column
  const updateFieldInColumn = (field: Field, columnIndex: number, updatedField: Partial<Field>) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      newColumns[columnIndex] = newColumns[columnIndex].map(f => f.name === field.name ? { ...f, ...updatedField } : f);
      return newColumns;
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="mb-6 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
      {...attributes}
    >
      <div className="flex items-center gap-2 mb-2">
        <span {...listeners} className="cursor-move text-gray-400 dark:text-gray-500">☰</span>
        <input
          className="flex-1 text-lg font-semibold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-gray-900 dark:text-gray-100"
          value={section.title}
          onChange={e => onTitleChange(e.target.value)}
        />
        <select
          className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-sm text-gray-900 dark:text-gray-100"
          value={section.columns}
          onChange={e => onColumnsChange(Number(e.target.value))}
        >
          <option value="1">1 Column</option>
          <option value="2">2 Columns</option>
          <option value="3">3 Columns</option>
          <option value="4">4 Columns</option>
        </select>
        <button className="text-xs text-red-500 dark:text-red-300 font-semibold hover:underline" onClick={onRemove}>Delete Section</button>
      </div>
      <DndContext sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))} collisionDetection={closestCenter} onDragEnd={onFieldDragEnd}>
        <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          {isExpanded && (
            <div className={`grid grid-cols-${section.columns} gap-4 mt-4`}>
              {[...Array(section.columns)].map((_, colIdx) => (
                <div key={colIdx} className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400 text-sm bg-white dark:bg-gray-800">
                  Drop field here
                </div>
              ))}
            </div>
          )}
          {!isExpanded && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <div className="text-sm">Section collapsed.</div>
            </div>
          )}
        </SortableContext>
      </DndContext>
      <button className="mt-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse Section' : 'Expand Section'}
      </button>
    </div>
  );
}

function FieldEditor({ field, onRemove, onChange, fieldTypes }: {
  field: LayoutField;
  onRemove: () => void;
  onChange: (f: Partial<LayoutField>) => void;
  fieldTypes: any[];
}) {
  return (
    <div className="flex items-center gap-2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2">
      <input
        className="flex-1 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-sm text-gray-900 dark:text-gray-100"
        value={field.label}
        onChange={e => onChange({ label: e.target.value })}
        placeholder="Field Label"
      />
      <select
        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1 text-sm text-gray-900 dark:text-gray-100"
        value={field.type}
        onChange={e => onChange({ type: e.target.value })}
      >
        {fieldTypes.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={field.required} onChange={e => onChange({ required: e.target.checked })} />
        Required
      </label>
      <input
        className="w-32 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-xs text-gray-900 dark:text-gray-100"
        value={field.helpText || ''}
        onChange={e => onChange({ helpText: e.target.value })}
        placeholder="Help text"
      />
      <input
        className="w-24 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-300 text-xs text-gray-900 dark:text-gray-100"
        value={field.defaultValue || ''}
        onChange={e => onChange({ defaultValue: e.target.value })}
        placeholder="Default"
      />
      <button className="text-xs text-red-500 dark:text-red-300 font-semibold hover:underline" onClick={onRemove}>Delete</button>
    </div>
  );
}

function SortableField({ id, field, onRemove, onChange }: { id: string; field: Field; onRemove: () => void; onChange: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-100 cursor-grab"
      {...attributes}
      {...listeners}
    >
      <span className="font-semibold">{field.name}</span>
      <span className="ml-auto text-gray-400">{field.type}</span>
    </div>
  );
}

// Create a droppable section component
function DroppableSection({ sectionIdx, colIdx, children }: { sectionIdx: number; colIdx: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionIdx}-col-${colIdx}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] border-2 border-dashed rounded-lg flex flex-col gap-2 p-2 ${
        isOver 
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {children}
    </div>
  );
}

// Sortable Object Item Component
function SortableObjectItem({ obj, isSelected, onToggle }: {
  obj: SchemaObject;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: obj.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center space-x-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded cursor-move border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
    >
      <div className="text-gray-400 cursor-move mr-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onToggle(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        onClick={(e) => e.stopPropagation()}
      />
      <span className="text-sm text-gray-900 dark:text-gray-100">{obj.name}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">({Object.keys(obj.fields).length} fields)</span>
    </div>
  );
}

// Sortable Field Item Component
function SortableFieldItem({ index, field, onUpdate, onRemove, canRemove, fieldTypes }: {
  index: number;
  field: { name: string; type: string };
  onUpdate: (field: { name: string; type: string }) => void;
  onRemove: () => void;
  canRemove: boolean;
  fieldTypes: any[];
}) {
  // Field types are passed from the parent component
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md"
    >
      <div
        {...attributes}
        {...listeners}
        className="text-gray-400 cursor-move mr-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <input
        type="text"
        value={field.name}
        onChange={(e) => onUpdate({ ...field, name: e.target.value })}
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        placeholder="Field name"
      />
      <select
        value={field.type}
        onChange={(e) => onUpdate({ ...field, type: e.target.value })}
        className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {fieldTypes && fieldTypes.length > 0 ? (
          fieldTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))
        ) : (
          <>
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="reference">Reference</option>
          </>
        )}
      </select>
      <button
        onClick={onRemove}
        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
        disabled={!canRemove}
      >
        ×
      </button>
    </div>
  );
}

function DesignerPreviewModal({ schema, onClose, onSave, fieldTypes }: {
  schema: Record<string, unknown>;
  onClose: () => void;
  onSave: (finalSchema: Record<string, unknown>) => void;
  fieldTypes: any[];
}) {
  return (
    <ReactModal isOpen onRequestClose={onClose} ariaHideApp={false} className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-4xl">
        <h2 className="text-lg font-bold mb-4">Preview Designer</h2>
        <div className="mb-4">
          <WorkflowDesignerPanel schema={schema} fieldTypes={fieldTypes} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancel</button>
          <button onClick={() => onSave(schema)} className="px-4 py-2 rounded bg-blue-600 text-white">Save to App</button>
        </div>
      </div>
    </ReactModal>
  );
}

const AppView: React.FC<AppViewProps> = ({ appId, onBack }) => {
  const { apps } = useApps();
  const { fieldTypes, categories, loading: fieldTypesLoading } = useFieldTypes(appId);
  
  // Field types are loaded from the API via useFieldTypes hook
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [objects, setObjects] = useState<SchemaObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Drag and drop handlers
  const handleObjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = objects.findIndex(item => item.id === active.id);
      const newIndex = objects.findIndex(item => item.id === over?.id);
      setObjects(arrayMove(objects, oldIndex, newIndex));
    }
  };

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = newObjectFields.findIndex((_, index) => index === active.id);
      const newIndex = newObjectFields.findIndex((_, index) => index === over?.id);
      setNewObjectFields(arrayMove(newObjectFields, oldIndex, newIndex));
    }
  };
  const [activeTab, setActiveTab] = useState<"overview" | "workflows" | "objects" | "users">("overview");
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [pendingSchema, setPendingSchema] = useState<Record<string, unknown> | null>(null);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [users, setUsers] = useState<Array<{id: number, name: string, email: string, role: string}>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: number, name: string, email: string}>>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCreateWorkflowSlider, setShowCreateWorkflowSlider] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [selectedObjectIds, setSelectedObjectIds] = useState<number[]>([]);
  const [showCreateObjectForm, setShowCreateObjectForm] = useState(false);
  const [newObjectName, setNewObjectName] = useState("");
  const [newObjectFields, setNewObjectFields] = useState<Array<{name: string, type: string}>>([{name: "", type: "string"}]);
  
  // Initial field state for new object creation
  const [workflowErrors, setWorkflowErrors] = useState<{[key: string]: string}>({});
  const [objectErrors, setObjectErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    console.log('pendingSchema changed:', pendingSchema);
  }, [pendingSchema]);

  // Reset workflow state when app changes
  useEffect(() => {
    setSelectedWorkflow(null);
    setActiveTab("overview");
    setIsEditingWorkflow(false);
    setIsPreviewMode(false);
    setLayoutEditorStepIdx(null);
    setLayoutDraft(null);
  }, [appId]);

  // WebSocket for real-time updates
  const { isConnected } = useChatWebSocket({
    onWorkflowsUpdated: (newWorkflows) => {
      console.log('New workflows received from LLM:', newWorkflows);
      setWorkflows(prev => [...prev, ...newWorkflows]);
      
      // Auto-select the first new workflow if none is selected
      if (!selectedWorkflow && newWorkflows.length > 0) {
        setSelectedWorkflow(newWorkflows[0]);
        setActiveTab("workflows");
      }
    },
    onObjectsUpdated: (newObjects) => {
      console.log('New objects received from LLM:', newObjects);
      setObjects(prev => [...prev, ...newObjects]);
    },
    onLayoutGenerated: (newLayout) => {
      console.log('New layout received from LLM:', newLayout);
      // Update the selected workflow's layout if one is selected
      if (selectedWorkflow) {
        setSelectedWorkflow(prev => prev ? { ...prev, layout: newLayout } : null);
      }
    }
  });

  // 1. Add state to track which step is being edited for layout
  const [layoutEditorStepIdx, setLayoutEditorStepIdx] = useState<number | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<LayoutSection[] | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const selectedApp = apps.find(app => app.id === appId);

  // Handler functions for workflow-level buttons
  const handleEditWorkflow = () => {
    setIsEditingWorkflow(true);
  };

  const handleCloneWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const response = await fetch(`http://localhost:8000/workflows/${selectedWorkflow.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedWorkflow.name} (Copy)`,
          app_id: selectedWorkflow.app_id
        })
      });
      
      if (response.ok) {
        const clonedWorkflow = await response.json();
        setWorkflows(prev => [...prev, clonedWorkflow]);
        // Optionally select the cloned workflow
        setSelectedWorkflow(clonedWorkflow);
      }
    } catch (error) {
      console.error('Error cloning workflow:', error);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    if (window.confirm(`Are you sure you want to delete "${selectedWorkflow.name}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`http://localhost:8000/workflows/${selectedWorkflow.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setWorkflows(prev => prev.filter(w => w.id !== selectedWorkflow.id));
          setSelectedWorkflow(null);
        }
      } catch (error) {
        console.error('Error deleting workflow:', error);
      }
    }
  };

  // Handler functions for layout editor buttons
  const handleSaveLayout = async () => {
    if (!selectedWorkflow) return;
    
    try {
      // Get the current layout from the workflow
      const currentLayout = selectedWorkflow.layout || [];
      
      console.log('Saving layout for workflow:', selectedWorkflow.id);
      console.log('Layout data:', currentLayout);
      
      const response = await fetch(`http://localhost:8000/workflows/${selectedWorkflow.id}/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: currentLayout
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Save layout response:', result);
        
        // Show success message
        alert('Layout saved successfully!');
        
        // Exit preview mode if active
        setIsPreviewMode(false);
        
        // Refresh the workflow data to get the updated layout
        fetchAppData();
      } else {
        const errorText = await response.text();
        console.error('Failed to save layout:', response.status, errorText);
        alert(`Failed to save layout: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Error saving layout. Please check your connection and try again.');
    }
  };

  const handleDeleteLayout = () => {
    if (!selectedWorkflow) return;
    
    if (window.confirm('Are you sure you want to delete this layout? This will remove all layout configurations.')) {
      setSelectedWorkflow(prev => prev ? { ...prev, layout: [] } : null);
    }
  };

  const handlePreviewLayout = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // User management functions
  const fetchUsers = async () => {
    try {
      const response = await fetch(`http://localhost:8000/apps/${appId}/users`);
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/users');
      if (response.ok) {
        const availableUsersData = await response.json();
        setAvailableUsers(availableUsersData);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddUser = async (userId: number, role: string) => {
    try {
      const response = await fetch(`http://localhost:8000/apps/${appId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role })
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh users list
        setShowAddUserModal(false);
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to remove this user from the app?')) {
      try {
        const response = await fetch(`http://localhost:8000/apps/${appId}/users/${userId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await fetchUsers(); // Refresh users list
        }
      } catch (error) {
        console.error('Error removing user:', error);
      }
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`http://localhost:8000/apps/${appId}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh users list
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleCreateObject = async () => {
    if (!newObjectName.trim()) {
      alert("Please enter an object name");
      return;
    }

    // Validate fields
    const validFields = newObjectFields.filter(f => f.name.trim() !== "");
    if (validFields.length === 0) {
      alert("Please add at least one field");
      return;
    }

    try {
      const fieldsObj: Record<string, string> = {};
      validFields.forEach(field => {
        fieldsObj[field.name] = field.type;
      });

      const response = await fetch('http://localhost:8000/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newObjectName,
          fields: fieldsObj,
          app_id: appId
        })
      });

      if (response.ok) {
        const newObject = await response.json();
        setObjects(prev => [...prev, newObject]);
        // Auto-select the newly created object
        setSelectedObjectIds(prev => [...prev, newObject.id]);
        // Reset form
        setNewObjectName("");
        setNewObjectFields([{name: "", type: "string"}]);
        setShowCreateObjectForm(false);
      } else {
        alert("Failed to create object");
      }
    } catch (error) {
      console.error('Error creating object:', error);
      alert("Error creating object. Please try again.");
    }
  };

  const handleCreateWorkflow = async () => {
    // Clear previous errors
    setWorkflowErrors({});
    
    // Validate workflow name
    if (!newWorkflowName.trim()) {
      setWorkflowErrors({ name: 'Workflow name is required' });
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName,
          app_id: appId,
          steps: [],
          object_ids: selectedObjectIds
        })
      });
      
      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows(prev => [...prev, newWorkflow]);
        setShowCreateWorkflowSlider(false);
        setNewWorkflowName("");
        setSelectedObjectIds([]);
        setShowCreateObjectForm(false);
        setNewObjectName("");
        setNewObjectFields([{name: "", type: "string"}]);
        setWorkflowErrors({});
        setObjectErrors({});
        // Optionally select the new workflow
        setSelectedWorkflow(newWorkflow);
      } else {
        alert("Failed to create workflow");
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert("Error creating workflow. Please try again.");
    }
  };

  // Fetch app data function
  const fetchAppData = async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch workflows for this app
      const workflowsResponse = await fetch(`http://localhost:8000/apps/${appId}/workflows`);
      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        setWorkflows(workflowsData);
      }
      // Fetch objects for this app
      const objectsResponse = await fetch(`http://localhost:8000/apps/${appId}/objects`);
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        console.log('Fetched objects for app:', appId, objectsData);
        setObjects(objectsData);
      } else {
        console.error('Failed to fetch objects:', objectsResponse.status);
      }
      // Fetch users for this app
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app data');
      console.error('Error loading app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAppData = async () => {
      if (!appId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch workflows for this app
        const workflowsResponse = await fetch(`http://localhost:8000/apps/${appId}/workflows`);
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json();
          setWorkflows(workflowsData);
        }
        
        // Fetch objects for this app
        const objectsResponse = await fetch(`http://localhost:8000/apps/${appId}/objects`);
        if (objectsResponse.ok) {
          const objectsData = await objectsResponse.json();
          setObjects(objectsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load app data');
        console.error('Error loading app data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppData();
  }, [appId]);

  if (!selectedApp) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white dark:bg-[#23232b]">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-lg font-semibold mb-2">App Not Found</div>
          <div className="text-sm">The selected app could not be found</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white dark:bg-[#23232b]">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-lg font-semibold mb-2">Loading App Data...</div>
          <div className="text-sm">Please wait while we load the app details</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white dark:bg-[#23232b]">
        <div className="text-center text-red-500 dark:text-red-400">
          <div className="text-lg font-semibold mb-2">Error Loading App</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white dark:bg-[#23232b] flex flex-col">
      {/* App Header - Compact */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Go back"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedApp.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedApp.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              selectedApp.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              selectedApp.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {selectedApp.status}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(selectedApp.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {/* Tab Navigation - Compact */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "overview"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "workflows"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab("objects")}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "objects"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Objects ({objects.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "users"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Users
          </button>
        </div>
      </div>

      {/* Tab Content - Compact */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-3 flex items-center space-x-2">
                <div className="text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{workflows.length}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Workflows</p>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-3 flex items-center space-x-2">
                <div className="text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{objects.length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Objects</p>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md p-3 flex items-center space-x-2">
                <div className="text-purple-600 dark:text-purple-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400 capitalize">{selectedApp.status}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Status</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">App Metadata</h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                {JSON.stringify(selectedApp.app_metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "workflows" && (
          selectedWorkflow ? (
            <div className="flex flex-col h-full w-full bg-white dark:bg-[#23232b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 overflow-auto">
              {/* Back to Workflows Button */}
              <button
                className="self-start mb-4 text-xs text-blue-600 dark:text-blue-300 font-semibold hover:underline focus:outline-none"
                onClick={() => setSelectedWorkflow(null)}
              >
                ← Back to Workflows
              </button>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                    {selectedWorkflow.name}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
                    <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 font-semibold uppercase text-xs">
                      {selectedWorkflow.status || 'Draft'}
                    </span>
                    <span>Created {new Date(selectedWorkflow.created_at).toLocaleDateString()}</span>
                    <span>Updated {new Date(selectedWorkflow.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Runtime buttons - Normal styling */}
                  <button 
                    onClick={handleEditWorkflow}
                    className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={handleCloneWorkflow}
                    className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 shadow-sm"
                  >
                    Clone
                  </button>
                  <button 
                    onClick={handleDeleteWorkflow}
                    className="px-4 py-2 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>


              {/* Page Layout Editor */}
              <div className="mb-8">
                {/* Gather all unique fields from workflow steps for the palette */}
                {(() => {
                  // Sample data removed - using actual workflow fields only
                  const sampleFields: any[] = [];
                  
                  const fieldMap = new Map();
                  // Use sample fields if no workflow fields exist
                  const workflowFields = (selectedWorkflow.steps || []).flatMap(step => step.fields || []);
                  const fieldsToUse = workflowFields.length > 0 ? workflowFields : sampleFields;
                  
                  fieldsToUse.forEach(field => {
                    if (field && field.name && !fieldMap.has(field.name)) {
                      fieldMap.set(field.name, { id: field.id || field.name, name: field.name, type: field.type });
                    }
                  });
                  const uniqueFields = Array.from(fieldMap.values());
                  
                  // Add sample layout for testing if no layout exists
                  const sampleLayout = selectedWorkflow.layout || [
                    { id: 'section1', title: 'Basic Information', fields: [], columns: 2 },
                    { id: 'section2', title: 'Assignment Details', fields: [], columns: 1 }
                  ];
                  
                  return (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Page Layout</h3>
                      
                      <PageLayoutEditor
                        layout={sampleLayout}
                        previewMode={isPreviewMode}
                        onChange={layout => setSelectedWorkflow({ ...selectedWorkflow, layout })}
                        onPreview={handlePreviewLayout}
                        onSave={handleSaveLayout}
                        onCancel={() => setIsPreviewMode(false)}
                        objectFields={uniqueFields}
                        groupedFields={[]}
                      />
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 mt-8 justify-end">
                {/* Layout editor buttons - Enhanced styling with visual indicators */}
                <button 
                  onClick={handleDeleteLayout}
                  className="px-4 py-2 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-800 border-2 border-red-200 dark:border-red-700 shadow-lg"
                  title="Delete Layout"
                >
                  🗑️ Delete Layout
                </button>
                <button 
                  onClick={handlePreviewLayout}
                  className={`px-4 py-2 rounded text-xs font-semibold border-2 shadow-lg transition ${
                    isPreviewMode 
                      ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                  title={isPreviewMode ? "Exit Preview Mode" : "Preview Layout"}
                >
                  {isPreviewMode ? '👁️ Exit Preview' : '👁️ Preview'}
                </button>
                <button 
                  onClick={handleSaveLayout}
                  className="px-4 py-2 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 border-2 border-green-500 shadow-lg"
                  title="Save Layout Changes"
                >
                  💾 Save Layout
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workflows</h3>
                <button
                  onClick={() => setShowCreateWorkflowSlider(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Create Workflow
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.length === 0 ? (
                  <div className="col-span-full text-center py-6 text-gray-500 dark:text-gray-400">
                    <div className="text-sm font-semibold mb-1">No Workflows</div>
                    <div className="text-xs">This app doesn't have any workflows yet.</div>
                  </div>
                ) : (
                workflows.map((workflow) => (
                  <div key={workflow.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-2 transition hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 text-blue-500 dark:text-blue-300">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3m-8 6v6a4 4 0 004 4h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{workflow.name}</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Created {new Date(workflow.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Steps</h4>
                      <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                        {workflow.steps.map((step, index) => (
                          <li key={index}>{step.name} ({step.fields?.length || 0} fields)</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">Workflow</span>
                      <button className="text-xs text-blue-600 dark:text-blue-300 font-semibold hover:underline focus:outline-none" onClick={() => setSelectedWorkflow(workflow)}>View Details</button>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )
        )}

        {activeTab === "objects" && (
          <div className="space-y-3">
            {objects.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <div className="text-sm font-semibold mb-1">No Objects</div>
                <div className="text-xs">This app doesn't have any data objects yet.</div>
              </div>
            ) : (
              objects.map((object) => (
                <div key={object.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{object.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(object.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Fields:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                      {Object.entries(object.fields).map(([fieldName, fieldType]) => {
                        // Handle both simple string types and object types
                        let displayType = 'unknown';
                        if (typeof fieldType === 'string') {
                          displayType = fieldType;
                        } else if (typeof fieldType === 'object' && fieldType !== null) {
                          // If it's an object, try to extract the type property
                          displayType = (fieldType as any).type || JSON.stringify(fieldType);
                        }
                        
                        return (
                          <div key={fieldName} className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{fieldName}:</span> {displayType}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">App Users</h3>
              <button
                onClick={() => {
                  fetchAvailableUsers();
                  setShowAddUserModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add User
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-sm font-semibold mb-1">No Users Assigned</div>
                <div className="text-xs">This app doesn't have any users assigned yet.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      {pendingSchema && (
        <DesignerPreviewModal
          schema={pendingSchema}
          fieldTypes={fieldTypes}
          onClose={() => setPendingSchema(null)}
          onSave={async (finalSchema) => {
            // Save to backend
            await fetch('http://localhost:8000/save-schema', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(finalSchema)
            });
            setPendingSchema(null);
            fetchAppData();
          }}
        />
      )}

      {/* Create Workflow Slider */}
      {showCreateWorkflowSlider && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowCreateWorkflowSlider(false)}
          />
          
          {/* Slider Panel */}
          <div className="absolute right-0 top-0 h-full w-3/4 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create New Workflow</h3>
              <button
                onClick={() => setShowCreateWorkflowSlider(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Panel - Workflow Form */}
              <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  {/* General Error Display */}
                  {workflowErrors.general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{workflowErrors.general}</p>
                    </div>
                  )}
                  {/* Workflow Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Workflow Name *
                    </label>
                    <textarea
                      value={newWorkflowName}
                      onChange={(e) => {
                        setNewWorkflowName(e.target.value);
                        if (workflowErrors.name) {
                          setWorkflowErrors(prev => ({ ...prev, name: '' }));
                        }
                      }}
                      className={`w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        workflowErrors.name 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter workflow name"
                      rows={2}
                    />
                    {workflowErrors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{workflowErrors.name}</p>
                    )}
                  </div>

                  {/* Select Existing Objects */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Objects (Optional)
                      <span className="ml-2 text-xs text-gray-500">({objects.length} available)</span>
                    </label>
                    {objects.length > 0 ? (
                      <div 
                        className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-32 overflow-y-auto"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#9CA3AF #F3F4F6',
                          height: '128px',
                          maxHeight: '128px'
                        }}
                      >
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleObjectDragEnd}>
                          <SortableContext items={objects.map(obj => obj.id)} strategy={verticalListSortingStrategy}>
                            {objects.map((obj) => (
                              <SortableObjectItem 
                                key={obj.id} 
                                obj={obj}
                                isSelected={selectedObjectIds.includes(obj.id)}
                                onToggle={(checked) => {
                                  if (checked) {
                                    setSelectedObjectIds(prev => [...prev, obj.id]);
                                  } else {
                                    setSelectedObjectIds(prev => prev.filter(id => id !== obj.id));
                                  }
                                }}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No objects available</p>
                    )}
                  </div>

                  {/* Create New Object */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Or Create New Object
                      </label>
                      <button
                        onClick={() => setShowCreateObjectForm(!showCreateObjectForm)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {showCreateObjectForm ? "Hide Form" : "+ New Object"}
                      </button>
                    </div>

                    {showCreateObjectForm && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Object Name *
                          </label>
                          <input
                            type="text"
                            value={newObjectName}
                            onChange={(e) => setNewObjectName(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="e.g., Customer, Order, Product"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fields
                          </label>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                            <SortableContext items={newObjectFields.map((_, index) => index)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-2">
                                {newObjectFields.map((field, index) => (
                                  <SortableFieldItem
                                    key={index}
                                    index={index}
                                    field={field}
                                    fieldTypes={fieldTypes}
                                    onUpdate={(updatedField) => {
                                      const updated = [...newObjectFields];
                                      updated[index] = updatedField;
                                      setNewObjectFields(updated);
                                    }}
                                    onRemove={() => {
                                      if (newObjectFields.length > 1) {
                                        setNewObjectFields(newObjectFields.filter((_, i) => i !== index));
                                      }
                                    }}
                                    canRemove={newObjectFields.length > 1}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                          <button
                            onClick={() => setNewObjectFields([...newObjectFields, {name: "", type: "string"}])}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                          >
                            + Add Field
                          </button>
                        </div>

                        <button
                          onClick={handleCreateObject}
                          className="w-full px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          Create & Add Object
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Chat Assistant */}
              <div className="w-1/2 flex flex-col">
                <ChatPanel
                  onPreviewSchema={(schema) => {
                    setPendingSchema(schema);
                    setShowCreateWorkflowSlider(false);
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowCreateWorkflowSlider(false);
                  setNewWorkflowName("");
                  setSelectedObjectIds([]);
                  setShowCreateObjectForm(false);
                  setNewObjectName("");
                  setNewObjectFields([{name: "", type: "string"}]);
                  setWorkflowErrors({});
                  setObjectErrors({});
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add User to App</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select User
                </label>
                <select
                  id="user-select"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Choose a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  id="role-select"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const userId = (document.getElementById('user-select') as HTMLSelectElement)?.value;
                  const role = (document.getElementById('role-select') as HTMLSelectElement)?.value;
                  
                  if (userId && role) {
                    handleAddUser(parseInt(userId), role);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppView; 