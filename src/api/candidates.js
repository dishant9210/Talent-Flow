// src/api/candidates.js
import { db } from '../db';

/**
 * Executes the candidate stage update logic directly on the Dexie database.
 */
export async function updateCandidateStageLocal(id, newStage) {
    const numId = parseInt(id);
    
    // 1. Update candidate stage
    await db.candidates.update(numId, { stage: newStage });
    
    // 2. Log timeline change (copied from src/mocks/handlers.js)
    await db.timeline.add({
        candidateId: numId,
        type: 'stage_change',
        details: `Moved to ${newStage}`,
        timestamp: new Date().toISOString(),
    });

    return { success: true };
}