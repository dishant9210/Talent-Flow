import React from 'react';
import { useParams } from 'react-router-dom';

function CandidateProfile() {
  const { candidateId } = useParams();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-indigo-700">Candidate Profile: {candidateId}</h1>
      <p className="mt-2 text-gray-600">Deep link: `/candidates/{candidateId}`. This page will show the timeline and Kanban board.</p>
    </div>
  );
}

export default CandidateProfile;
