// src/App.jsx (Content provided in prompt - No changes needed)
import React from 'react';
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, FileText } from 'lucide-react'; 
import { initializeDataOnDemand } from './utils/productionInitializer'; // The key component
import { useEffect } from 'react';
// Import all placeholder Page Components (No duplicates here)
import JobsBoard from './pages/JobsBoard'; 
import JobDetail from './pages/JobDetail';
import CandidatesList from './pages/CandidatesList';
import CandidateProfile from './pages/CandidateProfile';
import AssessmentBuilder from './pages/AssessmentBuilder';

// --- Navigation Item Component ---
const NavItem = ({ to, icon: Icon, label }) => {
// ... NavItem logic
};

// --- Layout Component (Sidebar + Main Content) ---
const Layout = () => {
// ... Layout logic
};

// --- App Component with Routes ---
function App() {

    // Calls the production initializer which runs the seed on first load in production
   useEffect(() => {
        initializeDataOnDemand(); 
    }, []);


  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        
        <Route index element={
          <div className="p-8 bg-white rounded-xl shadow-md border-t-4 border-indigo-500">
            <h1 className="text-4xl font-bold text-gray-800">Welcome to TalentFlow</h1>
            <p className="mt-3 text-lg text-gray-600">The application is running in the browser using client-side persistent storage.</p>
          </div>
        } />
        
        <Route path="jobs" element={<JobsBoard />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />

        <Route path="candidates" element={<CandidatesList />} />
        <Route path="candidates/:candidateId" element={<CandidateProfile />} />

        <Route path="assessments/:jobId" element={<AssessmentBuilder />} />

        <Route path="*" element={
          <div className="p-8 text-center">
            <h1 className="text-5xl font-extrabold text-red-500">404</h1>
            <p className="text-xl text-gray-600 mt-4">Page Not Found</p>
            <Link to="/" className="text-indigo-600 hover:underline mt-2 inline-block">Go Home</Link>
          </div>
        } />
      </Route>
    </Routes>
  );
}

export default App;