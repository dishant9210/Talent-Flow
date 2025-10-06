// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db'; // Imports the Dexie database instance

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

    // 🛑 CRITICAL FIX: Production Read Logic (No Network/MSW Mock) 🛑
    if (!import.meta.env.DEV && isApiCall) {
        
        try {
            await db.open(); 
            
            // 1. Parse URL segments
            const urlPath = url.split('?')[0];
            // pathSegments examples: ['api', 'jobs', '1'], ['api', 'candidates', '5', 'timeline']
            const pathSegments = urlPath.split('/').filter(s => s.length > 0);
            
            let result = null;
            let dbError = null;

            // --- Handle Single Resource Lookups (/api/:table/:id, /api/:table/:id/:sub) ---
            if (pathSegments.length === 3 || (pathSegments.length === 4 && pathSegments[3] === 'timeline')) {
                const [api, table, idString, subResource] = pathSegments;
                const id = parseInt(idString);

                if (table === 'jobs') {
                    // GET /api/jobs/:id
                    result = await db.jobs.get(id);

                } else if (table === 'assessments') {
                    // GET /api/assessments/:jobId
                    const assessment = await db.assessments.get(id);
                    // Match MSW: return structure with empty sections if not found
                    result = assessment || { jobId: id, sections: [] };

                } else if (table === 'candidates' && !subResource) {
                    // GET /api/candidates/:id (Profile page)
                    const candidate = await db.candidates.get(id);
                    if (candidate) {
                        // Match MSW: also fetch notes (type 'note' from timeline table)
                        const notes = await db.timeline
                            .where({ candidateId: id, type: 'note' })
                            .sortBy('timestamp');
                        result = { ...candidate, notes };
                    }

                } else if (table === 'candidates' && subResource === 'timeline') {
                    // GET /api/candidates/:id/timeline
                    // MSW returns an array of timeline events
                    result = await db.timeline
                        .where('candidateId').equals(id)
                        .sortBy('timestamp');
                }
                
                // Handle not found for single resources (which will set data to null)
                if (result === undefined || result === null) {
                    dbError = 'Resource not found in local DB.';
                }
                
            // --- Handle List/Paginated/Filtered Lookups (/api/:table) ---
            } else if (pathSegments.length === 2) {
                // /api/jobs, /api/candidates
                const table = pathSegments[1]; 
                const params = getQueryParams(url);
                
                let data = await db[table].toArray();
                
                // Filtering 
                const search = params.search ? params.search.toLowerCase() : null;
                const status = params.status;
                const page = parseInt(params.page) || 1;
                const pageSize = parseInt(params.pageSize) || 10;
                
                if (search) {
                    data = data.filter(item => 
                        (item.name && item.name.toLowerCase().includes(search)) ||
                        (item.title && item.title.toLowerCase().includes(search)) ||
                        (item.email && item.email.toLowerCase().includes(search))
                    );
                }
                if (status && status !== 'all') {
                    // Filters by job status OR candidate stage
                    data = data.filter(item => item.status === status || item.stage === status);
                }

                // Pagination
                const total = data.length;
                const start = (page - 1) * pageSize;
                const paginatedData = data.slice(start, start + pageSize);
                
                // Set data in the list format expected by components (JobsBoard/CandidatesList)
                result = { data: paginatedData, total: total };
            }

            if (dbError) {
                setError(dbError);
                setData(null);
            } else {
                setData(result);
                setError(null);
            }
            
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