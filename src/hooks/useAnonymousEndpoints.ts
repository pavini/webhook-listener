import { useCallback } from 'react';

const STORAGE_KEY = 'anonymous_endpoints';

export function useAnonymousEndpoints() {
  const addAnonymousEndpoint = useCallback((endpointId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const endpointIds = stored ? JSON.parse(stored) : [];
      
      if (!endpointIds.includes(endpointId)) {
        endpointIds.push(endpointId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(endpointIds));
      }
    } catch (error) {
      console.error('Error storing anonymous endpoint:', error);
    }
  }, []);

  const removeAnonymousEndpoint = useCallback((endpointId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const endpointIds = JSON.parse(stored);
        const updatedIds = endpointIds.filter((id: string) => id !== endpointId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));
      }
    } catch (error) {
      console.error('Error removing anonymous endpoint:', error);
    }
  }, []);

  const getAnonymousEndpoints = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting anonymous endpoints:', error);
      return [];
    }
  }, []);

  const clearAnonymousEndpoints = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    addAnonymousEndpoint,
    removeAnonymousEndpoint,
    getAnonymousEndpoints,
    clearAnonymousEndpoints
  };
}