import { useState, useEffect } from 'react';

export interface FieldType {
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

export interface FieldTypeCategory {
  id: string;
  name: string;
  description: string;
}

export interface FieldTypesResponse {
  field_types: {
    types: FieldType[];
    categories: FieldTypeCategory[];
  };
}

export const useFieldTypes = (appId?: number) => {
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([]);
  const [categories, setCategories] = useState<FieldTypeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFieldTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('key', 'field_types');
        if (appId) {
          params.append('app_id', appId.toString());
        }
        
        const response = await fetch(`http://localhost:8000/metadata?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch field types: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Multiple metadata entries (app-specific + global)
          let combinedTypes: FieldType[] = [];
          let combinedCategories: FieldTypeCategory[] = [];
          
          for (const metadata of data) {
            if (metadata.value?.field_types) {
              combinedTypes = [...combinedTypes, ...metadata.value.field_types.types];
              combinedCategories = [...combinedCategories, ...metadata.value.field_types.categories];
            }
          }
          
          // If no app-specific types found, fetch global types
          if (combinedTypes.length === 0 && appId) {
            console.log('No app-specific field types found, fetching global types...');
            const globalResponse = await fetch(`http://localhost:8000/metadata?key=field_types`);
            if (globalResponse.ok) {
              const globalData = await globalResponse.json();
              if (globalData.value?.field_types) {
                combinedTypes = globalData.value.field_types.types;
                combinedCategories = globalData.value.field_types.categories;
              }
            }
          }
          
          // Remove duplicates
          const uniqueTypes = combinedTypes.filter((type, index, self) => 
            index === self.findIndex(t => t.value === type.value)
          );
          const uniqueCategories = combinedCategories.filter((cat, index, self) => 
            index === self.findIndex(c => c.id === cat.id)
          );
          
          setFieldTypes(uniqueTypes);
          setCategories(uniqueCategories);
        } else if (data.value?.field_types) {
          // Single metadata entry
          setFieldTypes(data.value.field_types.types);
          setCategories(data.value.field_types.categories);
        } else {
          throw new Error('Invalid field types data format');
        }
        
      } catch (err) {
        console.error('Error fetching field types:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch field types');
        
        // Fallback to hardcoded field types if API fails
        setFieldTypes([
          { value: 'string', label: 'Text', description: 'Single line text input', category: 'basic', validation: {}, ui: { input_type: 'text' } },
          { value: 'number', label: 'Number', description: 'Numeric input', category: 'numeric', validation: {}, ui: { input_type: 'number' } },
          { value: 'boolean', label: 'Boolean', description: 'True/False checkbox', category: 'basic', validation: {}, ui: { input_type: 'checkbox' } },
          { value: 'date', label: 'Date', description: 'Date picker', category: 'datetime', validation: {}, ui: { input_type: 'date' } },
          { value: 'email', label: 'Email', description: 'Email address input', category: 'contact', validation: {}, ui: { input_type: 'email' } },
          { value: 'phone', label: 'Phone', description: 'Phone number input', category: 'contact', validation: {}, ui: { input_type: 'tel' } },
          { value: 'reference', label: 'Reference', description: 'Foreign key relationship to another object', category: 'relationship', validation: {}, ui: { input_type: 'select' } }
        ]);
        setCategories([
          { id: 'basic', name: 'Basic', description: 'Basic input types' },
          { id: 'numeric', name: 'Numeric', description: 'Number-related inputs' },
          { id: 'datetime', name: 'Date & Time', description: 'Date and time inputs' },
          { id: 'contact', name: 'Contact', description: 'Contact information inputs' },
          { id: 'relationship', name: 'Relationship', description: 'Object relationships and references' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFieldTypes();
  }, [appId]);

  const getFieldTypeByValue = (value: string): FieldType | undefined => {
    return fieldTypes.find(type => type.value === value);
  };

  const getFieldTypesByCategory = (categoryId: string): FieldType[] => {
    return fieldTypes.filter(type => type.category === categoryId);
  };

  const getCategoryById = (categoryId: string): FieldTypeCategory | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  return {
    fieldTypes,
    categories,
    loading,
    error,
    getFieldTypeByValue,
    getFieldTypesByCategory,
    getCategoryById
  };
};
