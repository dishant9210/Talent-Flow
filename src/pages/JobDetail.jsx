import React from 'react';
import { useParams } from 'react-router-dom';

function JobDetail() {
  const { jobId } = useParams();
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-indigo-700">Job Detail: {jobId}</h1>
      <p className="mt-2 text-gray-600">Deep link: `/jobs/{jobId}`. This page will show candidates and assessment info.</p>
    </div>
  );
}

export default JobDetail;
