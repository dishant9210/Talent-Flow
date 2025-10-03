// src/db.js
import Dexie from 'dexie';

// Define the database name and version
export const db = new Dexie('TalentFlowDB');

// Define the database schema (Version 1)
db.version(1).stores({
  // Jobs schema based on API requirements [cite: 30]
  // '++id' for auto-incrementing key. '&slug' for unique index.
  // Indexed fields: title, status, tags, order
  jobs: '++id, &slug, title, status, *tags, order', 
  
  // Candidates schema based on API requirements [cite: 35]
  // Indexed fields: name, email, stage
  candidates: '++id, &email, name, stage',
  
  // Assessments schema based on job/candidate links [cite: 38]
  // Indexed fields: jobId (link to job), candidateId (link to candidate)
  assessments: '++id, jobId, candidateId',
  
  // Timeline schema (for /candidates/:id/timeline) [cite: 37]
  timeline: '++id, candidateId, type, timestamp',
});

// Optional: Error handling for opening the database
db.open().catch((err) => {
  console.error("Failed to open Dexie database:", err);
});