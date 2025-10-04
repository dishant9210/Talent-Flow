// src/pages/AssessmentBuilder.jsx (Conceptual Implementation)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';

const ALL_QUESTION_TYPES = [
    { type: 'single-choice', label: 'Single Choice' },
    { type: 'multi-choice', label: 'Multi Choice' },
    { type: 'short-text', label: 'Short Text' },
    { type: 'long-text', label: 'Long Text' },
    { type: 'numeric', label: 'Numeric (Range)' },
    { type: 'file-upload-stub', label: 'File Upload (Stub)' }, // stub 
];

// --- Sub-Component: Renders a single question in the Preview pane ---
const QuestionPreview = ({ question, responses, onChange }) => {
    // Logic to apply conditional visibility [cite: 25]
    if (question.conditional) {
        // Simple check: if the target question response doesn't match the target value, hide
        const targetResponse = responses[question.conditional.targetQuestionId];
        if (targetResponse !== question.conditional.targetValue) {
            return null; 
        }
    }
    
    // Logic for validation rules (required, numeric range, max length) is handled 
    // by the final Form Runtime, but preview shows the structure. [cite: 25]
    
    // Render input based on type
    const renderInput = () => {
        switch (question.type) {
            case 'single-choice':
                return (
                    <select disabled> 
                        <option>Select one...</option>
                        {question.options?.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                );
            case 'numeric':
                return (
                    <input 
                        type="number" 
                        placeholder={`Range: ${question.range?.min}-${question.range?.max}`} 
                        disabled 
                    />
                );
            // ... other types ...
            default:
                return <input type="text" disabled placeholder={`(${question.type}) input`} />;
        }
    };

    return (
        <div style={{ marginBottom: 15, borderLeft: '3px solid #007bff', paddingLeft: 10 }}>
            <label>
                {question.text} {question.required && '*'}
            </label>
            {renderInput()}
        </div>
    );
};

function AssessmentBuilder() {
    const { jobId } = useParams();
    // Fetch state from MSW/Dexie: GET /assessments/:jobId [cite: 38]
    const { data: initialAssessment, isLoading } = useFetch(`/api/assessments/${jobId}`);
    
    const [assessmentStructure, setAssessmentStructure] = useState([]);
    
    // Mock response state for conditional preview only
    const [mockResponses, setMockResponses] = useState({});

    // Load initial data
    useEffect(() => {
        if (initialAssessment?.sections) {
            setAssessmentStructure(initialAssessment.sections);
            // Initialize mock responses for preview
            const initialResponses = {};
            initialAssessment.sections.flatMap(s => s.questions).forEach(q => {
                // Set a default value for Q1 to enable conditional questions visibility
                if (q.id === 'q-1-1') initialResponses[q.id] = 'Yes'; 
                else initialResponses[q.id] = '';
            });
            setMockResponses(initialResponses);
        }
    }, [initialAssessment]);

    // --- Persist Logic: PUT /assessments/:jobId ---
    const saveAssessment = useCallback(async (structure) => {
        try {
            await fetch(`/api/assessments/${jobId}`, {
                method: 'PUT', // Persist builder state locally 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: structure })
            });
            console.log('Builder state saved to Dexie via MSW.');
        } catch (error) {
            console.error('Failed to save assessment state:', error);
        }
    }, [jobId]);

    // Function to handle updates to structure (e.g., adding a question)
    const handleUpdateStructure = (newStructure) => {
        setAssessmentStructure(newStructure);
        saveAssessment(newStructure);
    };

    // --- Builder UI Logic (Simplified) ---
    const handleAddQuestion = (sectionId, type) => {
        const newQ = { 
            id: `q-${Date.now()}`, 
            type, 
            text: `New ${type} Question`, 
            required: true, 
            // Add options/range based on type 
        };
        const newStructure = assessmentStructure.map(s => 
            s.id === sectionId ? {...s, questions: [...s.questions, newQ] } : s
        );
        handleUpdateStructure(newStructure);
    };

    if (isLoading) return <div>Loading Assessment Builder...</div>;

    return (
        <div>
            <h1>Assessment Builder for Job {jobId}</h1>
            <div style={{ display: 'flex', gap: 20, minHeight: 600 }}>
                {/* 1. Assessment Builder Controls */}
                <div style={{ flex: 1, border: '1px solid #ddd', padding: 15 }}>
                    <h2>Builder Controls</h2>
                    {assessmentStructure.map(section => (
                        <div key={section.id} style={{ marginBottom: 20 }}>
                            <h3>{section.title}</h3>
                            <button onClick={() => handleAddQuestion(section.id, 'short-text')}>Add Short Text</button>
                            {/* ... other question type buttons ... */}
                            {section.questions.map(q => (
                                <p key={q.id}>{q.text} ({q.type})</p>
                            ))}
                        </div>
                    ))}
                </div>

                {/* 2. Live Preview Pane */}
                <div style={{ flex: 1, border: '1px solid #007bff', padding: 15, background: '#f9f9ff' }}>
                    <h2>Live Preview (Fillable Form) </h2>
                    <p style={{ color: 'red' }}>*Only Question 1-1 is editable to demonstrate conditional logic in preview.*</p>
                    {assessmentStructure.map(section => (
                        <div key={section.id}>
                            <h3>{section.title}</h3>
                            {section.questions.map(question => (
                                <QuestionPreview 
                                    key={question.id} 
                                    question={question} 
                                    responses={mockResponses}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AssessmentBuilder;