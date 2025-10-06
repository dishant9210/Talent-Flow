// src/components/CandidateTimeline.jsx
import React from 'react';

const CandidateTimeline = ({ timeline }) => {
    return (
        <div className="relative pl-6">
            {/* Vertical Line */}
            <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-300"></div>

            {(timeline || []) // <--- FIX: Ensure 'timeline' is an array before calling .slice()
                .slice()
                .reverse()
                .map((item, index) => (
                <div key={index} className="mb-6 relative">
                    {/* Circle/Dot */}
                    <div className="absolute left-0 top-0 h-4 w-4 rounded-full bg-indigo-600 -ml-2.5 border-4 border-white"></div>
                    
                    <div className="ml-4">
                        <p className="text-sm font-semibold text-gray-800 uppercase">{item.stage}</p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CandidateTimeline;