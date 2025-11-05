import { useState, useEffect } from 'react';

export interface App {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  app_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateAppData {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  app_metadata?: Record<string, unknown>;
}

export function useApps() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/apps');
      if (!response.ok) {
        throw new Error(`Failed to fetch apps: ${response.statusText}`);
      }
      const data = await response.json();
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch apps');
      console.error('Error fetching apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const createApp = async (appData: CreateAppData): Promise<App | null> => {
    try {
      setError(null);
      const response = await fetch('http://localhost:8000/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create app: ${response.statusText}`);
      }
      
      const newApp = await response.json();
      setApps(prev => [newApp, ...prev]);
      return newApp;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app');
      console.error('Error creating app:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  return {
    apps,
    loading,
    error,
    fetchApps,
    createApp,
  };
} 