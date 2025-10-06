// src/pages/CandidateProfile.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch'; 
import { useStageUpdate } from '../hooks/useStageUpdate'; 
import CandidateTimeline from '../components/CandidateTimeline';
import NotesSection from '../components/NotesSection';
import Board from '../components/Board'; 

const mockTeamMembers = ['John Doe', 'Jane Smith', 'Team Lead'];
const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
// ------------------------------------

function CandidateProfile() {
    const { candidateId: urlId } = useParams(); 

    const candidateId = useMemo(() => {
        const numId = parseInt(urlId);
        return (numId > 0 && !isNaN(numId)) ? numId : null;
    }, [urlId]);

    const candidateUrl = candidateId ? `/api/candidates/${candidateId}` : null;
    const timelineUrl = candidateId ? `/api/candidates/${candidateId}/timeline` : null;

    // 1. Fetch Candidate Data
    const { 
        data: candidate, 
        isLoading: isCandidateLoading, 
        error: candidateError, 
        refetch: refetchCandidate 
    } = useFetch(candidateUrl);
    
    // 2. Fetch Timeline Data
    const { 
        data: timeline, 
        isLoading: isTimelineLoading, 
        error: timelineError, 
        refetch: refetchTimeline 
    } = useFetch(timelineUrl);

    // 3. Mutation Hook for Stage Change
    // isUpdating will be false and should not be used for DND status display
    const { updateStage, isUpdating, updateError } = useStageUpdate();

    // Memoize the initial notes
    const initialNotes = useMemo(() => candidate?.notes || [], [candidate]);

    // Handle Stage Change (Kanban Drag-and-Drop)
    const handleStageChange = async (newStage) => {
        if (!candidateId) return; 

        // We rely on optimistic update here (Board component already moved the card)
        const success = await updateStage(candidateId, newStage);
        
        if (success) {
            // Refetch data to ensure the new state and timeline entry are reflected
            refetchCandidate();
            refetchTimeline();
        } else {
            // The proper optimistic rollback would be to manually revert the stage state here.
            // For now, we rely on refetch to sync the UI back if the mutation fails.
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
            
            {/* 🛑 REMOVED isUpdating display for smooth transition */}
            {/* {isUpdating && <div className="text-yellow-600 mb-4">Updating stage...</div>} */}
            {updateError && <div className="text-red-600 mb-4">Update Error: {updateError}</div>}


            <h2 className="text-2xl font-semibold mt-8 mb-4">Stage Management (Kanban)</h2>
            <Board 
                candidate={candidate} 
                stages={stages}
                onMove={handleStageChange} 
                // Removed isUpdating prop (if Board component used it)
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