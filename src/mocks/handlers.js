// src/mocks/handlers.js
import { http } from 'msw';
import { db } from '../db';
import { liveQuery } from 'dexie'; // Useful for real-time Dexie queries (not used in MSW, but handy)

const DELAY_MS = 200;
const MAX_DELAY_MS = 1200;
const WRITE_ERROR_RATE = 0.08; // 8% error rate [cite: 43]

// Utility to simulate network delay
const withLatency = async (ctx) => {
  // Simulate latency between 200ms and 1200ms [cite: 43]
  const delay = Math.floor(Math.random() * (MAX_DELAY_MS - DELAY_MS + 1)) + DELAY_MS;
  return ctx.delay(delay);
};

// Utility to simulate write errors
const shouldFail = () => Math.random() < WRITE_ERROR_RATE;

export const handlers = [
  // --- JOB HANDLERS ---
  
  // GET /jobs (List/Pagination/Filtering) [cite: 29]
  http.get('/api/jobs', async (req, res, ctx) => {
    await withLatency(ctx);

    const titleSearch = req.url.searchParams.get('title') || '';
    const statusFilter = req.url.searchParams.get('status');
    const page = parseInt(req.url.searchParams.get('page')) || 1;
    const pageSize = parseInt(req.url.searchParams.get('pageSize')) || 10;
    
    let collection = db.jobs.orderBy('order');
    
    // Simple in-memory filtering logic
    let jobs = await collection.toArray();

    if (titleSearch) {
      jobs = jobs.filter(j => j.title.toLowerCase().includes(titleSearch.toLowerCase()));
    }
    if (statusFilter) {
      jobs = jobs.filter(j => j.status === statusFilter);
    }

    // Server-like Pagination
    const totalCount = jobs.length;
    const paginatedJobs = jobs.slice((page - 1) * pageSize, page * pageSize);
    
    return res(
      ctx.status(200),
      ctx.set('X-Total-Count', totalCount.toString()), // Header for total count
      ctx.json(paginatedJobs)
    );
  }),
  
  // POST /jobs (Create job) [cite: 30]
  http.post('/api/jobs', async (req, res, ctx) => {
    await withLatency(ctx);

    if (shouldFail()) {
      return res(ctx.status(500), ctx.json({ error: 'Simulated network error during job creation.' }));
    }
    
    const newJob = await req.json();
    const allJobs = await db.jobs.toArray();
    const maxOrder = allJobs.length > 0 ? Math.max(...allJobs.map(j => j.order)) : 0;

    // Write-through to Dexie [cite: 45]
    const id = await db.jobs.add({ 
      ...newJob, 
      id: undefined, // Ensure Dexie auto-increments
      status: 'active', 
      order: maxOrder + 1,
      createdAt: new Date().toISOString() 
    });
    
    return res(
      ctx.status(201),
      ctx.json({ id, ...newJob })
    );
  }),
  
  // PATCH /jobs/:id (Update job) [cite: 31]
  http.patch('/api/jobs/:id', async (req, res, ctx) => {
    await withLatency(ctx);

    if (shouldFail()) {
      return res(ctx.status(500), ctx.json({ error: 'Simulated network error during job update.' }));
    }
    
    const { id } = req.params;
    const updates = await req.json();
    const numId = parseInt(id);

    // Write-through to Dexie [cite: 45]
    await db.jobs.update(numId, updates);
    
    return res(ctx.status(200), ctx.json({ id: numId, ...updates }));
  }),
  
  // PATCH /jobs/:id/reorder (Reorder job) [cite: 32]
  http.patch('/api/jobs/:id/reorder', async (req, res, ctx) => {
    await withLatency(ctx);

    // Occasionally return 500 to test rollback [cite: 32]
    if (Math.random() < 0.25) { // Higher failure rate for reorder testing
      return res(ctx.status(500), ctx.json({ error: 'Simulated reorder conflict error.' }));
    }
    
    const { id } = req.params;
    const { fromOrder, toOrder } = await req.json();
    const numId = parseInt(id);

    // Transactional logic for reordering
    await db.transaction('rw', db.jobs, async () => {
        // Move the target item
        await db.jobs.update(numId, { order: toOrder });

        // Adjust the orders of the items that were shifted
        if (fromOrder < toOrder) {
            // Shift items between fromOrder and toOrder up by 1
            await db.jobs
                .where('order').between(fromOrder + 1, toOrder)
                .and(job => job.id !== numId)
                .modify(job => job.order--);
        } else if (fromOrder > toOrder) {
            // Shift items between toOrder and fromOrder down by 1
             await db.jobs
                .where('order').between(toOrder, fromOrder - 1)
                .and(job => job.id !== numId)
                .modify(job => job.order++);
        }
    });

    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // --- CANDIDATE HANDLERS (Simplified) ---
  
  // GET /candidates (List/Pagination/Filtering) [cite: 33]
  http.get('/api/candidates', async (req, res, ctx) => {
    await withLatency(ctx);

    const nameEmailSearch = req.url.searchParams.get('search') || '';
    const stageFilter = req.url.searchParams.get('stage');
    const page = parseInt(req.url.searchParams.get('page')) || 1;
    const pageSize = 50; // Use a larger pageSize for virtualization

    let candidates = await db.candidates.toArray();

    // Client-side search (name/email) [cite: 15]
    if (nameEmailSearch) {
        const query = nameEmailSearch.toLowerCase();
        candidates = candidates.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.email.toLowerCase().includes(query)
        );
    }
    
    // Server-like filter (current stage) [cite: 16]
    if (stageFilter) {
      candidates = candidates.filter(c => c.stage === stageFilter);
    }

    const totalCount = candidates.length;
    const paginatedCandidates = candidates.slice((page - 1) * pageSize, page * pageSize);
    
    return res(
      ctx.status(200),
      ctx.set('X-Total-Count', totalCount.toString()),
      ctx.json(paginatedCandidates)
    );
  }),
  
  // PATCH /candidates/:id (Stage transitions) [cite: 36]
  http.patch('/api/candidates/:id', async (req, res, ctx) => {
    await withLatency(ctx);

    if (shouldFail()) {
      return res(ctx.status(500), ctx.json({ error: 'Simulated network error during candidate update.' }));
    }
    
    const { id } = req.params;
    const updates = await req.json();
    const numId = parseInt(id);

    // 1. Update candidate stage
    await db.candidates.update(numId, updates);
    
    // 2. Log timeline change (status change) [cite: 17, 37]
    if (updates.stage) {
        await db.timeline.add({
            candidateId: numId,
            type: 'stage_change',
            details: `Moved to ${updates.stage}`,
            timestamp: new Date().toISOString(),
        });
    }

    return res(ctx.status(200), ctx.json({ id: numId, ...updates }));
  }),

  // GET /candidates/:id/timeline [cite: 37]
  http.get('/api/candidates/:id/timeline', async (req, res, ctx) => {
    await withLatency(ctx);
    const { id } = req.params;
    const numId = parseInt(id);

    const timelineEvents = await db.timeline
        .where('candidateId').equals(numId)
        .sortBy('timestamp');

    return res(ctx.status(200), ctx.json(timelineEvents));
  }),
];