// src/pages/CandidateProfile.jsx (CRITICAL UPDATE)

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch'; 
import { useStageUpdate } from '../hooks/useStageUpdate'; 

// --- Component Imports (Assumed) ---
import CandidateTimeline from '../components/CandidateTimeline';
import NotesSection from '../components/NotesSection';
import KanbanBoard from '../components/Board';

const mockTeamMembers = ['John Doe', 'Jane Smith', 'Team Lead'];
const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
// ------------------------------------

function CandidateProfile() {
    const { jobId: urlId } = useParams(); // Get the string ID from the route
    console.log('CandidateProfile: urlId =', urlId);

    // 🛑 FIX 1: Safely parse the ID and ensure it's a valid number > 0.
    // If invalid, candidateId will be null, preventing the fetch calls below.
    const candidateId = useMemo(() => {
        const numId = parseInt(urlId);
        return (numId > 0 && !isNaN(numId)) ? numId : null;
    }, [urlId]);

    // 🛑 FIX 2: Only construct the URL if candidateId is valid. 
    // This prevents the fetch calls with '/api/candidates/NaN'.
    const candidateUrl = candidateId ? `/api/candidates/${candidateId}` : null;
    const timelineUrl = candidateId ? `/api/candidates/${candidateId}/timeline` : null;

    // 1. Fetch Candidate Data
    const { 
        data: candidate, 
        isLoading: isCandidateLoading, 
        error: candidateError, 
        refetch: refetchCandidate 
    } = useFetch(candidateUrl); // URL is null if ID is invalid
    
    // 2. Fetch Timeline Data
    const { 
        data: timeline, 
        isLoading: isTimelineLoading, 
        error: timelineError, 
        refetch: refetchTimeline 
    } = useFetch(timelineUrl); // URL is null if ID is invalid

    // 3. Mutation Hook for Stage Change
    const { updateStage, isUpdating, updateError } = useStageUpdate();

    // Memoize the initial notes
    const initialNotes = useMemo(() => candidate?.notes || [], [candidate]);

    // Handle Stage Change (Kanban Drag-and-Drop)
    const handleStageChange = async (newStage) => {
        if (!candidateId) return; // Guard against null ID

        const success = await updateStage(candidateId, newStage);
        
        if (success) {
            refetchCandidate();
            refetchTimeline();
        } else {
            alert(`Failed to update stage: ${updateError}`);
            refetchCandidate(); 
        }
    };
    
    // --- Loading and Error States ---
    if (!candidateId) {
        return <div className="p-8 text-center text-red-600">Invalid Candidate ID in URL.</div>;
    }
    
    if (isCandidateLoading || isTimelineLoading) {
        return <div className="p-8 text-center text-indigo-600">Loading candidate profile...</div>;
    }

    if (candidateError) {
        return <div className="p-8 text-center text-red-600">Error loading candidate: {candidateError}</div>;
    }
    
    if (!candidate || !candidate.id) {
        return <div className="p-8 text-center text-gray-500">Candidate not found.</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">{candidate.name}</h1>
            <p className="text-lg text-indigo-600 mb-6">Current Stage: {candidate.stage.toUpperCase()}</p>
            
            {isUpdating && <div className="text-yellow-600 mb-4">Updating stage...</div>}
            {updateError && <div className="text-red-600 mb-4">Update Error: {updateError}</div>}


            <h2 className="text-2xl font-semibold mt-8 mb-4">Stage Management (Kanban)</h2>
            <KanbanBoard 
                candidate={candidate} 
                stages={stages}
                onMove={handleStageChange} 
                isUpdating={isUpdating}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold mb-4">Notes & Activity</h2>
                    <NotesSection 
                        candidateId={candidate.id}
                        initialNotes={initialNotes}
                        teamMembers={mockTeamMembers}
                    />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Status Timeline</h2>
                    {timelineError && <p className="text-red-500">Error loading timeline.</p>}
                    <CandidateTimeline timeline={timeline || []} />
                </div>
            </div>
        </div>
    );
}

export default CandidateProfile;