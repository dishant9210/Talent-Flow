// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db'; // 🛑 NEW: Import the Dexie database instance

// Helper to extract query parameters from the URL string
const getQueryParams = (url) => {
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
        const [endpoint] = url.split('?');
        const params = getQueryParams(url);
        const table = endpoint.split('/').pop(); // e.g., 'jobs', 'candidates', 'timeline'
        
        try {
            // Ensure the table is accessed via bracket notation
            await db.open(); 
            let data = await db[table].toArray();
            
            // --- Simple Filter and Pagination Logic (Simulates server API) ---
            const search = params.search ? params.search.toLowerCase() : null;
            const status = params.status;
            const page = parseInt(params.page) || 1;
            const pageSize = parseInt(params.pageSize) || 10;
            
            // 1. Filtering (applies to jobs and candidates list views)
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

            // 2. Pagination
            const total = data.length;
            const start = (page - 1) * pageSize;
            const paginatedData = data.slice(start, start + pageSize);
            
            // 3. Return data in the structure expected by components
            setData({ data: paginatedData, total: total });
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