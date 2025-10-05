// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; 
// Import BrowserRouter for routing
import { BrowserRouter } from 'react-router-dom'; 

// 🛑 GLOBAL FLAG: Tracks if seeding has run in this browser session
let hasSeeded = false; 

// --------------------------------------------------
// MSW & DB INITIALIZATION LOGIC (Runs ONLY in development)
// --------------------------------------------------

async function prepareApp() {
    // Check if we are in development mode
    if (import.meta.env.DEV) {
        
        // 🛑 FIX 1: Add a guard to prevent re-seeding on HMR/StrictMode re-runs.
        if (hasSeeded) {
            console.log("MSW/DB: Skipping seed (already ran).");
            const { worker } = await import("./mocks/browser.js"); 
            return worker.start({ 
                serviceWorker: { url: '/mockServiceWorker.js' }, 
                onUnhandledRequest: "bypass" 
            });
        }
        
        // Dynamic imports ensure code splitting and conditional loading
        const { worker } = await import("./mocks/browser.js"); 
        const { seedDatabase } = await import('./mocks/seed.js');
        
        try {
            console.log("MSW/DB: Starting database seed...");
            // 1. Seed the database
            await seedDatabase(); 
            hasSeeded = true; // Mark as successfully seeded
            
            // 2. Start the MSW worker
            console.log("MSW/DB: Seeding complete. Starting worker...");
            return worker.start({ 
                serviceWorker: {
                    url: '/mockServiceWorker.js', // Ensures Vercel compatibility
                },
                onUnhandledRequest: "bypass" 
            });
        } catch (error) {
            console.error("MSW/DB: FATAL SEEDING ERROR!", error);
            // Even if seeding fails, attempt to start the worker to debug API calls
            const { worker } = await import("./mocks/browser.js"); 
            return worker.start({ onUnhandledRequest: "bypass" });
        }
    }
    return Promise.resolve();
}

// --------------------------------------------------
// RENDER EXECUTION
// --------------------------------------------------

// 🛑 FIX 2: Call prepareApp() ONCE, then render the app inside the .then() block.
prepareApp().then(() => {
    console.log("MSW/DB: Preparation complete. Rendering application.");
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}> 
                <App />
            </BrowserRouter>
        </React.StrictMode>,
    );
});