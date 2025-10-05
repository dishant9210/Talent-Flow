// src/hooks/useFetch.js (Final and Complete Code)
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db'; // 🛑 Imports the Dexie database instance

// Helper to extract query parameters from the URL string
const getQueryParams = (url) => {
    // ... (existing logic) ...
    const params = {};
    if (!url) return params;

    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return params;

    const queryString = url.substring(queryIndex + 1);
    queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) params[key] = decodeURIComponent(value);
    });
    return params;
};

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) {
        setIsLoading(false);
        return;
    }
    
    const isApiCall = url.startsWith('/api');

    // 🛑 CRITICAL FIX: Production Read Logic (No Network) 🛑
    if (!import.meta.env.DEV && isApiCall) {
        // --- URL Parsing Logic ---
        const [path, query] = url.split('?');
        const segments = path.split('/').filter(s => s.length > 0);
        
        // Example: /api/candidates/2 -> segments = ['api', 'candidates', '2']
        const lastSegment = segments[segments.length - 1];
        const isDetailRequest = !isNaN(parseInt(lastSegment));
        
        // Table is always the second-to-last segment if it's a detail request.
        const table = isDetailRequest ? segments[segments.length - 2] : segments[segments.length - 1];
        const id = isDetailRequest ? parseInt(lastSegment) : null;

        if (!db[table]) {
            setError(`Local DB Read Error: Table '${table}' not found in database schema.`);
            setIsLoading(false);
            return;
        }

        try {
            await db.open(); 
            
            let resultData;

            if (isDetailRequest) {
                // 1. DETAIL REQUEST (e.g., /candidates/2)
                resultData = await db[table].get(id); 
                
                // If fetching a single candidate, we manually mock the 'notes' array
                // which the component relies on (since timeline is fetched separately).
                if (table === 'candidates' && resultData) {
                    resultData = { ...resultData, notes: [] };
                }
                setData(resultData);
            } else {
                // 2. LIST REQUEST (e.g., /jobs?status=active)
                let data = await db[table].toArray(); 
                const params = getQueryParams(url);
                
                // --- Filtering and Pagination Logic ---
                const search = params.search ? params.search.toLowerCase() : null;
                const status = params.status;
                const page = parseInt(params.page) || 1;
                const pageSize = parseInt(params.pageSize) || 10;
                
                // Filtering logic...
                if (search) {
                    data = data.filter(item => 
                        (item.name && item.name.toLowerCase().includes(search)) ||
                        (item.title && item.title.toLowerCase().includes(search)) ||
                        (item.email && item.email.toLowerCase().includes(search))
                    );
                }
                if (status && status !== 'all') {
                    data = data.filter(item => item.status === status || item.stage === status);
                }

                // Pagination
                const total = data.length;
                const start = (page - 1) * pageSize;
                const paginatedData = data.slice(start, start + pageSize);
                
                setData({ data: paginatedData, total: total });
            }
            
            setError(null);
        } catch (err) {
            setError(`Local DB Read Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
        return; // Exit the function, bypassing network call
    }
    
    // --------------------------------------------------
    // Original Network Fetch Logic (DEV Mode Only)
    // --------------------------------------------------
    try {
      setIsLoading(true);
      const response = await fetch(url);
      if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP Error ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch { /* ignore parsing errors */ }
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
    if (url) {
        fetchData();
    } else {
        setIsLoading(false);
    }
  }, [fetchData, url]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}