import React, { useEffect, useState, useRef, useMemo } from 'react';
// Correct import name
import { useVirtualizer } from '@tanstack/react-virtual'; 

// --- DEBOUNCE HOOK ---
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
// ---------------------

function CandidatesList() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  
  const debouncedSearch = useDebounce(search, 300); 

  // 1. Ref for the scrollable container element
  const parentRef = useRef(null);

  // Mock data
  useEffect(() => {
    const mock = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Candidate ${i + 1}`,
      email: `candidate${i + 1}@talentflow.com`,
      stage: ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'][i % 6],
    }));
    setCandidates(mock);
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();
    return candidates.filter(
      c =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.email.toLowerCase().includes(lowerSearch)
    );
  }, [candidates, debouncedSearch]);


  // 2. Initialize the virtualizer hook
  const rowVirtualizer = useVirtualizer({
    // FIX 1: Use 'count' instead of 'size'
    count: filtered.length, 
    estimateSize: () => 48, 
    overscan: 5, 
    // FIX 2: Pass the ref's current value directly to getScrollElement, 
    // which is the most robust way to handle the scroll parent in modern versions.
    getScrollElement: () => parentRef.current, 
    // You can also use measureElement, but this should fix the immediate error.
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