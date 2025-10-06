import React from 'react';
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, FileText } from 'lucide-react'; // Corrected import
import { initializeDataOnDemand } from './utils/productionInitializer';
import { useEffect } from 'react';
// Import all placeholder Page Components (No duplicates here)
import JobsBoard from './pages/JobsBoard'; 
import JobDetail from './pages/JobDetail';
import CandidatesList from './pages/CandidatesList';
import CandidateProfile from './pages/CandidateProfile';
import AssessmentBuilder from './pages/AssessmentBuilder';

// --- Navigation Item Component ---
const NavItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  // Check if the current path starts with the base path (e.g., /jobs for /jobs/5)
  const baseSegment = to.split('/')[1];
  const isActive = baseSegment ? location.pathname.startsWith(`/${baseSegment}`) : location.pathname === '/';

  const activeClasses = 'bg-indigo-700 text-white shadow-lg';
  const inactiveClasses = 'text-indigo-200 hover:bg-indigo-700 hover:text-white';

  return (
    <Link to={to} className={`flex items-center p-3 rounded-xl transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}>
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

// --- Layout Component (Sidebar + Main Content) ---
const Layout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50 font-inter">
      {/* Sidebar Navigation (Hidden on small screens) */}
      <aside className="hidden md:block w-64 bg-indigo-900 p-6 shadow-2xl shrink-0">
        <div className="text-3xl font-black text-white mb-10">
          Talent<span className="text-indigo-400">Flow</span>
        </div>
        <nav className="space-y-3">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/jobs" icon={Briefcase} label="Jobs Board" />
          <NavItem to="/candidates" icon={Users} label="Candidates" />
          {/* Example deep link to an Assessment Builder for quick testing */}
          <NavItem to="/assessments/1" icon={FileText} label="Assessment Config" /> 
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <Outlet /> {/* Renders the matched route component */}
        </div>
      </main>
    </div>
  );
};

// --- App Component with Routes ---
function App() {

   useEffect(() => {
        // This function will check the environment and the DB count before running seedDatabase
        initializeDataOnDemand(); 
    }, []);


  return (

    // Note: BrowserRouter is imported and used in src/main.jsx (as per previous step)
    <Routes>
      {/* Layout wraps all main application content */}
      <Route path="/" element={<Layout />}>
        
        
        {/* Dashboard/Home Route (index) */}
        <Route index element={
          <div className="p-8 bg-white rounded-xl shadow-md border-t-4 border-indigo-500">
            <h1 className="text-4xl font-bold text-gray-800">Welcome to TalentFlow</h1>
            <p className="mt-3 text-lg text-gray-600">The mock API layer is running and has seeded 25 jobs and new</p>
          </div>
        } />
        
        {/* Jobs Routes */}
        <Route path="jobs" element={<JobsBoard />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />

        {/* Candidates Routes */}
        <Route path="candidates" element={<CandidatesList />} />
        <Route path="candidates/:candidateId" element={<CandidateProfile />} />

        {/* Assessment Routes (Deep link via job ID) */}
        <Route path="assessments/:jobId" element={<AssessmentBuilder />} />

        {/* Fallback route for 404 */}
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
