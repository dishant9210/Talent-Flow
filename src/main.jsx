// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
// Import BrowserRouter for routing [cite: 12, 17]
import { BrowserRouter } from 'react-router-dom'; 

async function enableMocking() {
  if (import.meta.env.DEV) { 
    const { startWorker } = await import('./mocks/browser');
    // We wait for startWorker, which internally calls seedDatabase
    await startWorker(); 
  }
}

import { worker } from './mocks/browser';

enableMocking().then(() => {
  // ... ReactDOM.createRoot(...).render(...)
  // Start the worker, then render the app
  worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true , v7_relativeSplatPath: true}} > 
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
});
});