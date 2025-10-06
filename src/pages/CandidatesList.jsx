// src/pages/CandidatesList.jsx (Final Corrected Code)
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'; 
import { useVirtualizer } from '@tanstack/react-virtual';

// import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
// import { useVirtualizer } from '@tanstack/react-virtual'; 
import { useFetch } from '../hooks/useFetch'; 

// --- DEBOUNCE HOOK (Kept as is) ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]); 

  return debouncedValue;
};
// ------------------------------------

function CandidatesList() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); 

  const parentRef = useRef(null);
  
  const apiUrl = `/api/candidates?search=${encodeURIComponent(debouncedSearch)}`;

  const { 
    data: fetchedCandidates, 
    isLoading, 
    error, 
    refetch 
  } = useFetch(apiUrl);
  
  // 🛑 FIX: Safely extract data. If it's an array (from /candidates), use it directly.
  const candidates = (fetchedCandidates && fetchedCandidates.data) 
    ? fetchedCandidates.data // Use structure from /jobs endpoint
    : (Array.isArray(fetchedCandidates) ? fetchedCandidates : []); // Use array directly from /candidates endpoint
  
  const filtered = candidates; 
  // NOTE: Total count is in X-Total-Count header, but we'll use the array length for the view
  const totalDisplayCount = filtered.length; 


  // Initialize the virtualizer hook
  const rowVirtualizer = useVirtualizer({
    count: filtered.length, 
    estimateSize: useCallback(() => 48, []),
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

        {/* Loading and Error States */}
        {error && <div className="p-4 text-red-600">Error loading candidates: {error}</div>}
        {isLoading && filtered.length === 0 && <div className="text-center p-4 text-indigo-600">Loading candidates...</div>}
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