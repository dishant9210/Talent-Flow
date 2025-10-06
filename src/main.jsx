// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; 
import { BrowserRouter } from 'react-router-dom'; 

let hasSeeded = false; 

// --------------------------------------------------
// MSW & DB INITIALIZATION LOGIC (Runs ONLY in development)
// --------------------------------------------------

async function prepareApp() {
    if (import.meta.env.DEV) {
        
        // If already seeded in this session, skip expensive seed logic
        if (hasSeeded) {
            console.log("MSW/DB: Skipping seed (already ran).");
            const { worker } = await import("./mocks/browser.js"); 
            return worker.start({ 
                serviceWorker: { url: '/mockServiceWorker.js' }, 
                onUnhandledRequest: "bypass" 
            });
        }
        
        const { worker } = await import("./mocks/browser.js"); 
        const { seedDatabase } = await import('./mocks/seed.js');
        
        try {
            console.log("MSW/DB: Starting database seed...");
            await seedDatabase(); 
            hasSeeded = true; 
            
            console.log("MSW/DB: Seeding complete. Starting worker...");
            return worker.start({ 
                serviceWorker: {
                    url: '/mockServiceWorker.js', 
                },
                onUnhandledRequest: "bypass" 
            });
        } catch (error) {
            console.error("MSW/DB: FATAL SEEDING ERROR!", error);
            const { worker } = await import("./mocks/browser.js"); 
            return worker.start({ onUnhandledRequest: "bypass" });
        }
    }
    return Promise.resolve();
}

// --------------------------------------------------
// RENDER EXECUTION
// --------------------------------------------------

prepareApp().then(() => {
    console.log("MSW/DB: Preparation complete. Rendering application.");
    ReactDOM.createRoot(document.getElementById('root')).render(
        <>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}> 
                <App />
            </BrowserRouter>
        </>,
    );
});