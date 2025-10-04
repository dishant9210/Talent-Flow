// src/pages/CandidatesList.jsx (UPDATED to use useFetch)

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'; 
// 🛑 IMPORT useFetch hook
import { useFetch } from '../hooks/useFetch'; 

// --- DEBOUNCE HOOK (Kept as is) ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); 

  return debouncedValue;
};
// ------------------------------------

function CandidatesList() {
  // 🛑 REPLACE local state with useFetch
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); 

  const parentRef = useRef(null);
  
  // 🛑 1. CONSTRUCT the API URL based on the debounced search term
  // The MSW handler for /api/candidates supports a 'search' query parameter.
  const apiUrl = `/api/candidates?search=${encodeURIComponent(debouncedSearch)}`;

  // 🛑 2. USE the useFetch hook
  const { 
    data: fetchedCandidates, 
    isLoading, 
    error, 
    refetch 
  } = useFetch(apiUrl);
  
  // The data used for the virtualizer is simply the fetched data (or an empty array if null/loading)
  const candidates = fetchedCandidates || [];
  
  // 🛑 3. SIMPLIFY filtering. Since the API is already filtering by search,
  // we just use the candidates array directly. No separate useMemo filter needed.
  // We'll keep the list array named 'filtered' for continuity with the virtualizer logic.
  const filtered = candidates;

  // Initialize the virtualizer hook
  const rowVirtualizer = useVirtualizer({
    count: filtered.length, 
    estimateSize: () => 48, 
    overscan: 5, 
    getScrollElement: () => parentRef.current, 
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-indigo-700 mb-4">Candidates List</h1>
      <input
        className="mb-4 p-2 border rounded w-full max-w-md"
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      
      <div className="border rounded shadow bg-white">
        {/* Header Row */}
        <div className="flex px-4 py-2 bg-indigo-100 font-semibold sticky top-0 z-10">
          <div className="flex-1">Name</div>
          <div className="flex-1">Email</div>
          <div className="w-32">Stage</div>
        </div>

        {/* 🛑 Loading and Error States */}
        {error && <div className="p-4 text-red-600">Error loading candidates: {error}</div>}
        {isLoading && filtered.length === 0 && <div className="p-4 text-indigo-600">Loading candidates...</div>}
        {!isLoading && filtered.length === 0 && !error && <div className="p-4 text-gray-500">No candidates found for "{debouncedSearch}".</div>}

        {/* 3. The scrollable container */}
        <div 
          ref={parentRef} 
          className="overflow-y-auto" 
          style={{ height: 500 }} 
        >
          {/* 4. The inner container */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`, 
              width: '100%',
              position: 'relative',
            }}
          >
            {/* 5. Map over only the visible items */}
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const candidate = filtered[virtualRow.index];
              
              if (!candidate) return null; 

              return (
                <div
                  key={candidate.id}
                  className="flex items-center border-b px-4 py-2 hover:bg-indigo-50 absolute w-full"
                  // 🛑 Add onClick to link to candidate profile
                  onClick={() => window.location.href = `/candidates/${candidate.id}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex-1 font-medium">{candidate.name}</div>
                  <div className="flex-1 text-gray-500">{candidate.email}</div>
                  <div className="w-32 text-sm text-indigo-700">{candidate.stage}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidatesList;