// src/hooks/useStageUpdate.js

import { useState } from 'react';
import { db } from '../db'; // 🛑 ADD DB IMPORT FOR PRODUCTION LOGIC

/**
 * Custom hook to handle updating a candidate's stage (PATCH /api/candidates/:id).
 * Now supports production local DB updates and removes the visible "isUpdating" status for smoother DND.
 * @returns {{ updateStage: (id: number, newStage: string) => Promise<boolean>, isUpdating: boolean, updateError: string | null }}
 */
export function useStageUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const updateStage = async (id, newStage) => {
    // 🛑 REMOVED: setIsUpdating(true) 
    setUpdateError(null);
    
    try {
      let response;

      // --- Production/Local Dexie Mutation (Fixes 405 error on Vercel) ---
      if (!import.meta.env.DEV) {
          const numId = parseInt(id);
          
          await db.candidates.update(numId, { stage: newStage });
          
          // Log timeline change (copied from mock handler)
          await db.timeline.add({
              candidateId: numId,
              type: 'stage_change',
              details: `Moved to ${newStage}`,
              timestamp: new Date().toISOString(),
          });
          
          // Mock a successful response for error handling consistency
          response = { ok: true, json: async () => ({ success: true }) };
          
      } else {
          // --- Development/Network MSW Mutation ---
          response = await fetch(`/api/candidates/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stage: newStage }),
          });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }
      
      // 🛑 REMOVED: setIsUpdating(false) in success case 🛑
      return true; // Success
      
    } catch (err) {
      setUpdateError(err.message);
      setIsUpdating(false); 
      return false; // Failure
    }
  };

  return { updateStage, isUpdating, updateError };
}