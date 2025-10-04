// src/components/CandidatesBoard.jsx (Using @tanstack/react-virtual)
import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useVirtual } from '@tanstack/react-virtual'; // NEW IMPORT

const ITEM_HEIGHT = 50;
const CONTAINER_HEIGHT = 500;

export default function CandidatesBoard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    // Removed 'page' state as we fetch a large list for client-side virtualization

    // Fetching the large, filtered list
    const apiUrl = `/api/candidates?search=${searchQuery}&stage=${stageFilter}&pageSize=1000&page=1`;
    const { data: listData, isLoading, error } = useFetch(apiUrl);
    const candidates = useMemo(() => listData || [], [listData]);
    const totalCount = candidates.length;

    const parentRef = React.useRef();

    // The core virtualization hook
    const rowVirtualizer = useVirtual({
        parentRef,
        size: totalCount,
        estimateSize: useCallback(() => ITEM_HEIGHT, []),
        overscan: 5, // Render 5 extra rows above/below for smooth scrolling
    });

    if (isLoading) return <div>Loading Candidates...</div>;
    if (error) return <div>Error loading data: {error}</div>;

    return (
        <div>
            <h1>Candidate Pipeline ({totalCount} Total)</h1>
            {/* Search and Filter Inputs */}
            <input 
                placeholder="Search name/email..." 
                onChange={(e) => setSearchQuery(e.target.value)} 
            />
            {/* ... Stage Select ... */}
            
            {/* Virtualized Container */}
            <div
                ref={parentRef}
                style={{
                    height: CONTAINER_HEIGHT,
                    overflow: 'auto', // Scrollable container
                    border: '1px solid #ccc',
                    marginTop: 15
                }}
            >
                {/* Scroll Content Wrapper */}
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`, // Total height of all items
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Render only the visible items */}
                    {rowVirtualizer.getVirtualItems().map(virtualRow => (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`, // Position via CSS transform
                                borderBottom: '1px solid #eee'
                            }}
                            onClick={() => console.log('Navigate to profile:', candidates[virtualRow.index].id)}
                        >
                            {/* Candidate Details */}
                            <div style={{ padding: '0 10px', lineHeight: `${ITEM_HEIGHT}px` }}>
                                <strong>{candidates[virtualRow.index].name}</strong> 
                                ({candidates[virtualRow.index].email}) - Stage: {candidates[virtualRow.index].stage}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}