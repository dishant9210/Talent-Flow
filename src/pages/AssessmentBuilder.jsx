import React from 'react';
import { useParams } from 'react-router-dom';

function AssessmentBuilder() {
  const { jobId } = useParams();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-indigo-700">Assessment Builder (Job ID: {jobId})</h1>
      <p className="mt-2 text-gray-600">Deep link: `/assessments/{jobId}`. This page is for building the job-specific quiz.</p>
    </div>
  );
}

export default AssessmentBuilder;
