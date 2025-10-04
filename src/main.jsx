// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
// Import BrowserRouter for routing [cite: 12, 17]
import { BrowserRouter } from 'react-router-dom'; 
import { seedDatabase } from './mocks/seed.js';
let hasSeeded = false;


async function prepare() {
    // 1. Start MSW worker (if not already running)
    // if (process.env.NODE_ENV === 'development') {
    //     await worker.start();
    // }
      
    // 2. 🛑 CONDITIONAL SEEDING: Only run if the flag is false
    if (!hasSeeded) {
        console.log("Database preparing to seed...");
        await seedDatabase();
        hasSeeded = true;
        console.log("Database Seeding complete for this session.");
    }
}


import { worker } from './mocks/browser';

prepare().then(() => {
  // ... ReactDOM.createRoot(...).render(...)
  // Start the worker, then render the app
  worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <>
      <BrowserRouter future={{ v7_startTransition: true , v7_relativeSplatPath: true}} > 
        <App />
      </BrowserRouter>
    </>,
  )
});
});