// src/db.js
import Dexie from 'dexie';

// Define the database name and version
export const db = new Dexie('TalentFlowDB');

// Define the database schema (Version 1)
db.version(1).stores({
  // Jobs schema
  jobs: '++id, &slug, title, status, *tags, order', 
  
  // Candidates schema
  candidates: '++id, &email, name, stage',
  
  // Assessments schema
  assessments: '++id, jobId, candidateId',
  
  // Timeline schema (Updated to include author index for notes)
  timeline: '++id, candidateId, type, timestamp, author', 
});

// Optional: Error handling for opening the database
db.open().catch((err) => {
  console.error("Failed to open Dexie database:", err);
});