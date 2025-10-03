// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
// Import BrowserRouter for routing [cite: 12, 17]
import { BrowserRouter } from 'react-router-dom'; 

// Function to conditionally start the worker
async function enableMocking() {
  if (import.meta.env.DEV) { 
    // Dynamically import the worker starter to avoid bundling in production
    const { startWorker } = await import('./mocks/browser');
    await startWorker();
  }
}

// Start the worker, then render the app
enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true , v7_relativeSplatPath: true}} > 
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
});