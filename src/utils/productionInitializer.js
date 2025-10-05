// src/utils/productionInitializer.js

import { db } from './../db'; // Adjust path as necessary
import { seedDatabase } from '../mocks/seed.js'; // Import your existing logic

// A flag to prevent running the check multiple times per session
let isInitialized = false;

/**
 * Checks if the database is empty (by counting the jobs table) and runs the seed
 * only if the current environment is NOT development (i.e., production/preview).
 */
export async function initializeDataOnDemand() {
    if (import.meta.env.DEV || isInitialized) {
        return;
    }

    try {
        const jobCount = await db.jobs.count();
        
        if (jobCount === 0) {
            console.warn("Production Database is empty. Running initial seed...");
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
        // This likely means a Dexie schema error or permission issue.
    }
}