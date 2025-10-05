// src/utils/productionInitializer.js

import { db } from '../db'; // Assuming db.js is in src/
import { seedDatabase } from '../mocks/seed.js'; // Import your existing seed function

let isInitialized = false;

/**
 * Checks if the local database is empty and runs the seed only in production.
 */
export async function initializeDataOnDemand() {
    // 🛑 Do not run this check in development, as main.jsx handles the DEV seed.
    if (import.meta.env.DEV || isInitialized) {
        return;
    }

    try {
        // Check if the 'jobs' table has any data
        const jobCount = await db.jobs.count();
        
        if (jobCount === 0) {
            console.warn("Production Database is empty. Running initial client-side seed...");
            // Use the comprehensive seed logic you already wrote
            await seedDatabase();
            isInitialized = true;
            console.log("✅ Production seed successful!");
        } else {
            console.log(`Production Database contains ${jobCount} jobs. Skipping seed.`);
            isInitialized = true;
        }
    } catch (error) {
        console.error("❌ Failed to initialize data in production!", error);
        // An error here means a Dexie schema/migration issue.
    }
}