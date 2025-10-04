import React, { useState } from 'react';
import { useEffect } from 'react';

// Utility function to render mentions as styled spans
const renderMentionText = (text, members) => {
    if (!text) return null;
    const parts = text.split(/(@[\w\s]+)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            const mentionedName = part.substring(1).trim();
            if (members.map(m => m.toLowerCase()).includes(mentionedName.toLowerCase())) {
                // Render valid mention
                return <span key={index} className="text-indigo-600 font-semibold bg-indigo-50 px-1 rounded">{part}</span>;
            }
        }
        return part;
    });
};

const NotesSection = ({ candidateId, initialNotes, teamMembers }) => {
    const [notes, setNotes] = useState(initialNotes);
    const [newNote, setNewNote] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredMembers, setFilteredMembers] = useState([]);
    
    // Simple state to track mention input
    const mentionTrigger = '@';
    const mentionStart = newNote.lastIndexOf(mentionTrigger);

    // Effect to handle the suggestion logic
    useEffect(() => {
        if (mentionStart > -1) {
            const query = newNote.substring(mentionStart + 1).toLowerCase().trim();
            
            // Show suggestions if the query is not empty (or if you want to show all on just '@')
            if (query.length > 0) {
                const filtered = teamMembers.filter(member =>
                    member.toLowerCase().includes(query)
                );
                setFilteredMembers(filtered);
                setShowSuggestions(filtered.length > 0);
            } else {
                setFilteredMembers(teamMembers); // Show all members on just '@'
                setShowSuggestions(true);
            }
        } else {
            setShowSuggestions(false);
        }
    }, [newNote, teamMembers, mentionStart]);

    const handleSuggestionClick = (member) => {
        const before = newNote.substring(0, mentionStart);
        const after = newNote.substring(mentionStart);
        
        // Find the end of the current word after '@'
        const wordEnd = after.search(/\s/);
        const remaining = wordEnd > 0 ? after.substring(wordEnd) : '';

        const newText = `${before}@${member} ${remaining}`;
        setNewNote(newText);
        setShowSuggestions(false);
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            const newNoteObject = {
                id: Date.now(),
                text: newNote.trim(),
                author: 'Current User', // Replace with dynamic user
                date: new Date().toLocaleDateString(),
            };
            setNotes(prev => [newNoteObject, ...prev]);
            setNewNote('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="relative border rounded-lg p-3">
                <textarea
                    className="w-full p-2 border-b focus:outline-none resize-none"
                    rows="3"
                    placeholder="Add a new note with @mentions..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                />

                {showSuggestions && (
                    <div className="absolute z-20 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-lg mt-1 rounded-md">
                        {filteredMembers.map(member => (
                            <div 
                                key={member}
                                onClick={() => handleSuggestionClick(member)}
                                className="p-2 hover:bg-indigo-50 cursor-pointer text-gray-700"
                            >
                                {member}
                            </div>
                        ))}
                        {filteredMembers.length === 0 && (
                            <div className="p-2 text-gray-400">No matches found.</div>
                        )}
                    </div>
                )}

                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleAddNote}
                        className="bg-indigo-600 text-white px-4 py-1 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        disabled={!newNote.trim()}
                    >
                        Add Note
                    </button>
                </div>
            </div>

            {/* Display Existing Notes */}
            <div className="space-y-4">
                {notes.map((note) => (
                    <div key={note.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <p className="text-sm mb-2 leading-relaxed">
                            {renderMentionText(note.text, teamMembers)}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                            {note.author} on {note.date}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotesSection; 
// (Ensure this is in its own file and imported correctly)