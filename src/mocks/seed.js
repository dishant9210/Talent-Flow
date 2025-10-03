// src/mocks/seed.js
import { db } from '../db';

// --- Configuration and Utility Functions ---

const NUM_JOBS = 25;
const NUM_CANDIDATES = 1000;
const JOB_STATUSES = ['active', 'archived']; // As per API [cite: 30]
const CANDIDATE_STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"]; // As per API [cite: 35]
const SKILLS = ['React', 'Node.js', 'Tailwind CSS', 'SQL', 'TypeScript', 'Cloud'];

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[random(0, arr.length - 1)];

// Generate a slug from a title
const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

// --- Data Generation Functions ---

const createJob = (id, order) => {
  const title = `Software Engineer L${random(1, 5)} - ${['Front', 'Back', 'Full'][random(0, 2)]}-End`;
  return {
    id,
    title,
    slug: slugify(title) + `-${id}`,
    status: randomItem(JOB_STATUSES),
    tags: Array.from({ length: random(1, 4) }, () => randomItem(SKILLS)),
    order, // Used for reordering [cite: 30]
    createdAt: new Date(Date.now() - random(1, 90) * 24 * 60 * 60 * 1000).toISOString(),
  };
};

const createCandidate = (id) => ({
  id,
  name: `Candidate ${id}`,
  email: `candidate${id}@talentflow.com`,
  stage: randomItem(CANDIDATE_STAGES),
  jobId: random(1, NUM_JOBS), // Randomly assign to a job
  // Add other candidate data fields here (e.g., skillSet, experience)
});

// A simple mock assessment structure
const createAssessment = (jobId) => ({
    jobId,
    sections: Array.from({ length: random(1, 3) }, (_, sIndex) => ({
        title: `Section ${sIndex + 1}: ${['Tech', 'Aptitude', 'Culture'][sIndex] || 'Misc'}`,
        questions: Array.from({ length: random(10, 15) }, (_, qIndex) => ({
            id: qIndex + 1,
            type: randomItem(['single-choice', 'short-text', 'numeric']), // Only a subset for simplicity
            text: `Question ${qIndex + 1}: What is your approach to ${randomItem(SKILLS)}?`,
            required: true,
            // Include complex fields like 'options' for multiple choice, 'range' for numeric
        })),
    })),
});


// --- Main Seeding Logic ---

export async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');
  
  // Clear all data
  await db.jobs.clear();
  await db.candidates.clear();
  await db.assessments.clear();
  await db.timeline.clear(); // Clear timeline entries
  
  // 1. Seed Jobs (25)
  const mockJobs = Array.from({ length: NUM_JOBS }, (_, i) => createJob(i + 1, i + 1));
  await db.jobs.bulkPut(mockJobs);
  console.log(`✅ Seeded ${mockJobs.length} jobs.`);
  
  // 2. Seed Candidates (1000)
  const mockCandidates = Array.from({ length: NUM_CANDIDATES }, (_, i) => createCandidate(i + 1));
  await db.candidates.bulkPut(mockCandidates);
  console.log(`✅ Seeded ${mockCandidates.length} candidates.`);
  
  // 3. Seed Assessments (min 3)
  // Create an assessment for the first 5 jobs
  const mockAssessments = Array.from({ length: 5 }, (_, i) => createAssessment(i + 1));
  await db.assessments.bulkPut(mockAssessments);
  console.log(`✅ Seeded ${mockAssessments.length} assessments.`);
  
  console.log('--- Database Seeding Complete ---');
}