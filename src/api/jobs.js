// src/api/jobs.js
import { db } from '../db';

/**
 * Executes the reorder logic directly on the Dexie database.
 */
export async function reorderJobLocal(jobId, fromOrder, toOrder) {
    const numId = parseInt(jobId);
    
    // This logic is copied directly from src/mocks/handlers.js
    await db.transaction('rw', db.jobs, async () => {
        await db.jobs.update(numId, { order: toOrder });

        if (fromOrder < toOrder) {
            await db.jobs
                .where('order').between(fromOrder + 1, toOrder)
                .and(job => job.id !== numId)
                .modify(job => job.order--);
        } else if (fromOrder > toOrder) {
            await db.jobs
                .where('order').between(toOrder, fromOrder - 1)
                .and(job => job.id !== numId)
                .modify(job => job.order++);
        }
    });
    return { success: true };
}

/**
 * Executes the status update logic directly on the Dexie database.
 */
export async function updateJobStatusLocal(jobId, newStatus) {
    const numId = parseInt(jobId);
    await db.jobs.update(numId, { status: newStatus });
    return { success: true };
}