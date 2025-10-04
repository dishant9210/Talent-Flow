// src/pages/JobDetail.jsx

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch'; // Assuming your hook location

// --- Mock Data/Helpers (Stages are often global) ---
const stages = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
// ---------------------------------------------------

// Helper to safely determine the job ID
const useJobId = () => {
  
    const { jobId: urlId } = useParams();
    console.log("useJobId: Raw urlId from useParams:", urlId); 
    // Safely parse the ID, returning null if invalid (to prevent fetching NaN)
    return useMemo(() => {
        const numId = parseInt(urlId);
        return (numId > 0 && !isNaN(numId)) ? numId : null;
    }, [urlId]);
};

function JobDetail() {
    const jobId = useJobId();
    

    // 1. Fetch Job Details
    const jobUrl = jobId ? `/api/jobs/${jobId}` : null;
    const { 
        data: job, 
        isLoading: isJobLoading, 
        error: jobError, 
        refetch: refetchJob 
    } = useFetch(jobUrl);


    // 2. Fetch Assessment Structure for this Job
    const assessmentUrl = jobId ? `/api/assessments/${jobId}` : null;
    const { 
        data: assessment, 
        isLoading: isAssessmentLoading, 
        error: assessmentError 
    } = useFetch(assessmentUrl);

    // --- Loading and Error States ---
    if (!jobId) {
        return <div className="p-8 text-center text-red-600">Invalid Job ID in URL.</div>;
    }
    
    if (isJobLoading) {
        return <div className="p-8 text-center text-indigo-600">Loading job details...</div>;
    }

    if (jobError) {
        return <div className="p-8 text-center text-red-600">Error loading job: {jobError}</div>;
    }
    
    // Ensure job data is present
    if (!job || !job.id) {
        return <div className="p-8 text-center text-gray-500">Job not found.</div>;
    }

    // --- Render Logic ---

    // Simple helper to count candidates in a stage (Mocked, assuming /candidates endpoint)
    const renderCandidateSummary = () => (
        <div className="flex justify-between items-center p-4 bg-white rounded shadow-sm">
            <h4 className="font-semibold text-gray-700">Candidates</h4>
            <span className="text-xl font-bold text-indigo-600">
                {/* ⚠️ This would require an API call to /api/candidates?jobId=:id */}
                54
            </span>
        </div>
    );

    // Placeholder for Assessment Viewer
    const renderAssessment = () => {
        if (isAssessmentLoading) return <p className="text-indigo-600">Loading assessment structure...</p>;
        if (assessmentError) return <p className="text-red-600">Error loading assessment.</p>;
        if (!assessment || !assessment.sections || assessment.sections.length === 0) {
            return <p className="text-gray-500">No assessment configured for this job.</p>;
        }

        return (
            <div className="space-y-4">
                <p className="text-sm text-gray-600 font-medium">Sections: {assessment.sections.length}</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                    {assessment.sections.map((section, index) => (
                        <li key={index}>{section.title} ({section.questions.length} questions)</li>
                    ))}
                </ul>
            </div>
        );
    };


    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 border-b pb-4">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{job.title}</h1>
                <div className="flex space-x-4 text-sm text-gray-600">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                        {job.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500">Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Job Info & Assessment) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Job Overview */}
                    <section className="p-6 bg-white border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Job Overview</h2>
                        <div className="space-y-3">
                            <p className="flex items-center text-sm text-gray-700">
                                <span className="font-medium w-32">Slug:</span>
                                <code className="bg-gray-100 p-1 rounded text-xs">{job.slug}</code>
                            </p>
                            <p className="flex items-center text-sm text-gray-700">
                                <span className="font-medium w-32">Tags/Skills:</span>
                                <div className="space-x-1">
                                    {job.tags.map((tag, index) => (
                                        <span key={index} className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </p>
                        </div>
                    </section>
                    
                    {/* Assessment Details */}
                    <section className="p-6 bg-white border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Hiring Assessment</h2>
                        {renderAssessment()}
                    </section>
                </div>

                {/* Right Column (Metrics & Tools) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Candidate Metrics */}
                    {renderCandidateSummary()}

                    {/* Stage Breakdown (Mock Data) */}
                    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-2">
                        <h4 className="font-semibold text-gray-700 mb-3">Pipeline Breakdown</h4>
                        {stages.map(stage => (
                            <div key={stage} className="flex justify-between items-center text-sm">
                                <span className="capitalize text-gray-600">{stage}</span>
                                {/* Mock count for visualization */}
                                <span className="font-bold text-gray-800">
                                    {Math.floor(Math.random() * (stage === 'applied' ? 30 : 10))}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                        <button 
                            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                            onClick={() => alert(`Opening application form for ${job.title}...`)}
                        >
                            View Live Application
                        </button>
                        <button 
                            className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                            onClick={() => refetchJob()}
                        >
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JobDetail;