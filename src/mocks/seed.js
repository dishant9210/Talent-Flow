// src/mocks/seed.js
import { db } from '../db';

// --- Configuration ---
const NUM_JOBS = 25;
const NUM_CANDIDATES = 1000;
const JOB_STATUSES = ['active', 'archived'];
const CANDIDATE_STAGES = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
const SKILLS = ['React', 'Node.js', 'Tailwind CSS', 'SQL', 'TypeScript', 'Cloud'];
const ALL_QUESTION_TYPES = [
    'single-choice', 
    'multi-choice', 
    'short-text', 
    'long-text', 
    'numeric', 
    'file-upload-stub'
];

// --- Utility Functions ---
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[random(0, arr.length - 1)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

// --- Stage Transition Logic ---
const STAGE_TRANSITIONS = {
    'applied': ['screen'],
    'screen': ['tech', 'rejected'],
    'tech': ['offer', 'rejected'],
    'offer': ['hired', 'rejected'],
    'hired': [],
    'rejected': []
};

// --- Data Generation Functions ---
const createJob = (id, order) => {
    const title = `Software Engineer L${random(1, 5)} - ${['Front', 'Back', 'Full'][random(0, 2)]}-End`;
    return {
        id,
        title,
        slug: slugify(title) + `-${id}`,
        status: randomItem(JOB_STATUSES),
        tags: Array.from({ length: random(1, 4) }, () => randomItem(SKILLS)),
        order,
        createdAt: new Date(Date.now() - random(1, 90) * 24 * 60 * 60 * 1000).toISOString(),
    };
};

const createCandidate = (id) => ({
    id,
    name: `Candidate ${id}`,
    email: `candidate${id}@talentflow.com`,
    stage: randomItem(CANDIDATE_STAGES),
    jobId: random(1, NUM_JOBS),
});

const createAssessment = (jobId) => ({
    jobId,
    sections: Array.from({ length: random(2, 4) }, (_, sIndex) => ({
        id: `sec-${sIndex + 1}`,
        title: `Section ${sIndex + 1}: ${['Technical', 'Aptitude', 'Behavioral', 'Final'][sIndex] || 'Misc'}`,
        questions: Array.from({ length: random(8, 12) }, (_, qIndex) => {
            const type = randomItem(ALL_QUESTION_TYPES);
            const question = {
                id: `q-${sIndex + 1}-${qIndex + 1}`,
                type,
                text: `Q${qIndex + 1}: How would you approach ${randomItem(SKILLS)} problem in a ${type} format?`,
                required: true,
                conditional: qIndex % 3 === 0 ? {
                    targetQuestionId: `q-${sIndex + 1}-1`,
                    targetValue: 'Yes'
                } : undefined,
            };

            if (type === 'single-choice' || type === 'multi-choice') {
                question.options = ['Yes', 'No', 'Maybe'];
            } else if (type === 'numeric') {
                question.range = { min: 1, max: 10 };
            }
            return question;
        }),
    })),
});

// --- Main Seeding Logic ---
export async function seedDatabase() {
    console.log('🌱 Starting Database Seeding...');
    
    try {
        // Clear existing data
        await Promise.all([
            db.jobs.clear(),
            db.candidates.clear(),
            db.assessments.clear(),
            db.timeline.clear(),
        ]);
        
        // Seed jobs
        const mockJobs = Array.from({ length: NUM_JOBS }, (_, i) => createJob(i + 1, i + 1));
        await db.jobs.bulkPut(mockJobs);
        console.log(`✅ Seeded ${mockJobs.length} jobs`);
        
        // Seed candidates
        const mockCandidates = Array.from({ length: NUM_CANDIDATES }, (_, i) => createCandidate(i + 1));
        await db.candidates.bulkPut(mockCandidates);
        console.log(`✅ Seeded ${mockCandidates.length} candidates`);
        
        // Seed assessments
        const mockAssessments = Array.from({ length: 5 }, (_, i) => createAssessment(i + 1));
        await db.assessments.bulkPut(mockAssessments);
        console.log(`✅ Seeded ${mockAssessments.length} assessments`);
        
        // Seed timelines
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        const timelineEntries = mockCandidates.flatMap(candidate => {
            let currentStage = 'applied';
            let currentTime = randomDate(ninetyDaysAgo, now);
            const entries = [{
                candidateId: candidate.id,
                type: 'stage_change',
                details: `Application submitted. Stage: ${currentStage}`,
                timestamp: currentTime.toISOString(),
            }];
            
            while (currentStage !== candidate.stage && STAGE_TRANSITIONS[currentStage]) {
                const possibleNextStages = STAGE_TRANSITIONS[currentStage].filter(s => 
                    CANDIDATE_STAGES.indexOf(s) <= CANDIDATE_STAGES.indexOf(candidate.stage)
                );
                
                if (possibleNextStages.length === 0) break;
                
                const nextStage = randomItem(possibleNextStages);
                currentTime = new Date(currentTime.getTime() + random(1, 10) * 24 * 60 * 60 * 1000);
                
                entries.push({
                    candidateId: candidate.id,
                    type: 'stage_change',
                    details: `Moved to ${nextStage}`,
                    timestamp: currentTime.toISOString(),
                });
                currentStage = nextStage;
            }
            return entries;
        });
        
        await db.timeline.bulkPut(timelineEntries);
        console.log(`✅ Seeded ${timelineEntries.length} timeline entries`);
        
        console.log('✨ Database Seeding Complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}