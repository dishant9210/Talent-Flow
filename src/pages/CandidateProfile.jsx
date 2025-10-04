// src/pages/CandidateProfile.jsx (Conceptual Implementation)
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';

const MOCK_USERS = ['@alice', '@bob', '@charlie']; // Local list for mentions 

// --- Hook to get single candidate data (requires a GET /candidates/:id handler) ---
function useCandidateData(id) {
    const candidateData = useFetch(`/api/candidates/${id}`);
    const timelineData = useFetch(`/api/candidates/${id}/timeline`);
    return {
        candidate: candidateData.data,
        timeline: timelineData.data,
        isLoading: candidateData.isLoading || timelineData.isLoading,
        error: candidateData.error || timelineData.error,
        refetch: () => { candidateData.refetch(); timelineData.refetch(); }
    };
}

// --- Component to render notes and mentions ---
const NoteRenderer = ({ content }) => {
    // Regex to find @mentions
    const parts = content.split(/(@[a-zA-Z0-9]+)/g);

    return (
        <p>
            {parts.map((part, index) => {
                if (part.startsWith('@')) {
                    // Just render the mention (no suggestions needed here) 
                    return <span key={index} style={{ color: 'blue', fontWeight: 'bold' }}>{part}</span>;
                }
                return part;
            })}
        </p>
    );
};

function CandidateProfile() {
    const { id } = useParams();
    const { candidate, timeline, isLoading, error, refetch } = useCandidateData(id);
    const [newNote, setNewNote] = useState('');

    // NOTE: In a full implementation, this should trigger a PATCH /candidates/:id 
    // to add the note, and it should be stored in Dexie/timeline.
    const handleAddNote = () => {
        if (!newNote.trim()) return;

        // Simulate logging the note (in a real app, this updates the DB)
        // This log should be added to the db.timeline store with type: 'note'
        console.log(`Adding note for Candidate ${id}: ${newNote}`); 
        setNewNote('');
        refetch(); 
    };

    if (isLoading) return <div>Loading Candidate Profile...</div>;
    if (error || !candidate) return <div>Candidate not found or error loading data.</div>;

    return (
        <div>
            <h1>{candidate.name} Profile</h1>
            <p>Email: {candidate.email} | Current Stage: <strong>{candidate.stage}</strong></p>

            <div style={{ display: 'flex', marginTop: 20 }}>
                {/* Timeline Panel */}
                <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: 20 }}>
                    <h2>Status Timeline</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {timeline.map((event, index) => (
                            <li key={index} style={{ marginBottom: 10 }}>
                                <strong>{new Date(event.timestamp).toLocaleDateString()}</strong>: {event.details}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Notes Panel */}
                <div style={{ flex: 1, paddingLeft: 20 }}>
                    <h2>Notes</h2>
                    {/* Existing Notes (assuming they are part of the timeline or a separate API) */}
                    <NoteRenderer content="Reviewed their skills. Needs follow-up with @bob on the tech screen. " />
                    
                    {/* Add New Note Input */}
                    <textarea 
                        value={newNote} 
                        onChange={(e) => setNewNote(e.target.value)} 
                        placeholder={`Add a note (e.g., "Good interview, contact @alice")`} 
                        rows="3" 
                        style={{ width: '100%', marginTop: 10 }}
                    />
                    <button onClick={handleAddNote}>Add Note</button>
                </div>
            </div>
        </div>
    );
}

export default CandidateProfile;