// src/hooks/useStageUpdate.js

import { useState } from 'react';
// 🛑 NEW IMPORT: Assume the local mutation function is available
import { updateCandidateStageLocal } from '../api/candidates'; 

/**
 * Custom hook to handle updating a candidate's stage (PATCH /api/candidates/:id).
 * @returns {{ updateStage: (id: number, newStage: string) => Promise<boolean>, isUpdating: boolean, updateError: string | null }}
 */
export function useStageUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const updateStage = async (id, newStage) => {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      let response;
      
      // 🛑 PRODUCTION FIX: Use local function on Vercel
      if (!import.meta.env.DEV) {
          await updateCandidateStageLocal(id, newStage);
          // Mock a successful response
          response = { ok: true, json: () => ({ success: true }) };
      } else {
          // Development: Use network call (MSW)
          response = await fetch(`/api/candidates/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stage: newStage }),
          });
      }


      if (!response.ok) {
        // Attempt to read the specific error message from the MSW handler
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }
      
      setIsUpdating(false);
      return true; // Success
    } catch (err) {
      setUpdateError(err.message);
      setIsUpdating(false);
      return false; // Failure
    }
  };

  return { updateStage, isUpdating, updateError };
}