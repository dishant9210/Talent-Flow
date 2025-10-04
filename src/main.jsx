// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
// Import BrowserRouter for routing [cite: 12, 17]
import { BrowserRouter } from 'react-router-dom'; 
import { seedDatabase } from './mocks/seed.js';
let hasSeeded = false;


// async function prepare() {
//     // 1. Start MSW worker (if not already running)
//     // if (process.env.NODE_ENV === 'development') {
//     //     await worker.start();
//     // }
      
async function prepareApp() {
  if (import.meta.env.DEV) {
    // Note: Adjust the paths below if your files are named differently
    const { worker } = await import("./mocks/browser.js"); 
    const { seedDatabase } = await import('./mocks/seed.js');
    
    // 1. Seed the database
    await seedDatabase(); 
    
    // 2. Start the MSW worker (using relative path for best deployment compatibility)
    return worker.start({ 
        serviceWorker: {
             url: '/mockServiceWorker.js', // Ensures correct path on Vercel
        },
        onUnhandledRequest: "bypass" 
    });
  }
  return Promise.resolve();
}


import { worker } from './mocks/browser';

prepareApp().then(() => {
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