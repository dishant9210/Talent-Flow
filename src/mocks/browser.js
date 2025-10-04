// src/mocks/browser.js
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { seedDatabase } from './seed';

// Create the worker instance using the defined handlers
export const worker = setupWorker(...handlers);

// Function to start the worker and seed the database
export async function startWorker() {
  // Only run the mock server in development environment
  if (import.meta.env.DEV) { 
    console.log('Mock Service Worker starting...');
    
    // Seed the database *before* starting the worker to ensure data is available
    await seedDatabase();

    await worker.start({ 
       serviceWorker: {
        url: '/mockServiceWorker.js', 
    },
      onUnhandledRequest: 'bypass', // Ignore unhandled requests (e.g., Vite asset requests)
    });
    console.log('Mock Service Worker is ready to intercept requests at /api/*.');
  }
}