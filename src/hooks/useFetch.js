// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to handle fetching data from a given URL with managed state.
 * NOTE: In production (where MSW is disabled), this hook is intentionally stubbed
 * and relies on local IndexedDB data initiated by App.jsx.
 * @param {string} url - The API endpoint to call (e.g., '/jobs?page=1').
 * @returns {{ data: any, isLoading: boolean, error: string | null, refetch: () => void }}
 */
export function useFetch(url) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) return;
    
    // 🛑 FIX: In production, do not make network calls to /api/.
    // The application logic must be refactored to read from local DB instead of using fetch.
    if (!import.meta.env.DEV && url.startsWith('/api')) {
        // If MSW is disabled and we hit an API path, we can't fetch.
        // We assume data will be loaded via a different Dexie access method if needed.
        // For now, return a placeholder empty response quickly.
        console.warn(`[useFetch] Bypassing network call in production: ${url}`);
        // We simulate an empty array response that components expect
        const mockEmptyResponse = url.includes('candidates') || url.includes('jobs') ? { data: [], total: 0 } : {};
        setData(mockEmptyResponse);
        setIsLoading(false);
        return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(url);
      if (!response.ok) {
        // Improved error handling for MSW/API failures
        const errorText = await response.text();
        let errorMessage = `HTTP Error ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
        } catch {
            errorMessage += `: Check MSW handler or server routing.`;
        }
        throw new Error(errorMessage);
      }
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Only fetch if a URL is provided.
    if (url) {
        fetchData();
    } else {
        setIsLoading(false); // If URL is null (e.g., invalid ID), stop loading.
    }
  }, [fetchData, url]); // Added url dependency

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}