// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';
import { db } from '../db';

// Add these utility functions at the top
const DELAY_MS = 200;
const MAX_DELAY_MS = 1200;
const FAILURE_RATE = 0.1; // 10% chance of failure

// Utility to simulate network delay
const withLatency = async () => {
  const delay = Math.random() * (MAX_DELAY_MS - DELAY_MS) + DELAY_MS;
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Utility to randomly fail requests
const shouldFail = () => Math.random() < FAILURE_RATE;

export const handlers = [
  // --- JOB HANDLERS ---
  
  // GET /jobs (List/Pagination/Filtering) [cite: 29]
  http.get('/api/jobs', async ({ request }) => {
    try {
      await withLatency()

      const url = new URL(request.url)
      const titleSearch = url.searchParams.get('search') || ''
      const statusFilter = url.searchParams.get('status')
      const page = parseInt(url.searchParams.get('page')) || 1
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 10

      let jobs = await db.jobs.toArray()

      if (titleSearch) {
        jobs = jobs.filter(j => j.title.toLowerCase().includes(titleSearch.toLowerCase()))
      }
      if (statusFilter && statusFilter !== 'all') {
        jobs = jobs.filter(j => j.status === statusFilter)
      }

      const totalCount = jobs.length
      const paginatedJobs = jobs.slice((page - 1) * pageSize, page * pageSize)

      return HttpResponse.json({
        data: paginatedJobs,
        total: totalCount
      })
    } catch (error) {
      console.error('Handler error:', error)
      return new HttpResponse(null, { status: 500 })
    }
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
  http.patch('/api/jobs/:id', async ({ params, request }) => {
    try {
      await withLatency();

      if (shouldFail()) {
        return new Response('Internal Server Error', { status: 500 });
      }

      const { id } = params;
      const data = await request.json();
      
      await db.jobs.update(parseInt(id), { status: data.status });
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error in PATCH /api/jobs/:id handler:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
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

  // POST /candidates (Apply to job)
  http.post('/api/candidates', async ({ request }) => {
    try {
      await withLatency();

      if (shouldFail()) {
        return new HttpResponse(
          JSON.stringify({ error: 'Simulated network error during candidate application.' }), 
          { status: 500 }
        );
      }
      
      const newCandidateData = await request.json();
      
      const id = await db.candidates.add({ 
        ...newCandidateData, 
        id: undefined,
        stage: 'applied', 
        createdAt: new Date().toISOString() 
      });

      await db.timeline.add({
        candidateId: id,
        type: 'stage_change',
        details: 'Application submitted. Stage: applied',
        timestamp: new Date().toISOString(),
      });
      
      return HttpResponse.json(
        { id, ...newCandidateData, stage: 'applied' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /candidates:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // GET /assessments/:jobId
  http.get('/api/assessments/:jobId', async ({ params }) => {
    try {
      await withLatency();
      const { jobId } = params;
      const numId = parseInt(jobId);

      const assessment = await db.assessments.get(numId);
      
      if (!assessment) {
        return HttpResponse.json({ jobId: numId, sections: [] });
      }

      return HttpResponse.json(assessment);
    } catch (error) {
      console.error('Error in GET /assessments/:jobId:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // PUT /assessments/:jobId
  http.put('/api/assessments/:jobId', async ({ params, request }) => {
    try {
      await withLatency();
      
      if (shouldFail()) {
        return new HttpResponse(null, { status: 500 });
      }
      
      const { jobId } = params;
      const assessmentData = await request.json();
      const numId = parseInt(jobId);

      await db.assessments.put({
        jobId: numId,
        ...assessmentData
      });
      
      return HttpResponse.json({ success: true, jobId: numId });
    } catch (error) {
      console.error('Error in PUT /assessments/:jobId:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // POST /assessments/:jobId/submit
  http.post('/api/assessments/:jobId/submit', async ({ params, request }) => {
    try {
      await withLatency();
      
      const { jobId } = params;
      const submission = await request.json();
      const numJobId = parseInt(jobId);

      const submissionId = await db.submissions.add({
        ...submission,
        jobId: numJobId,
        timestamp: new Date().toISOString()
      });
      
      return HttpResponse.json(
        { success: true, submissionId },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /assessments/:jobId/submit:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),
];