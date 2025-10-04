// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';
import { db } from '../db'; // Assuming db is defined here

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
  
  // GET /jobs (List/Pagination/Filtering)
  http.get('/api/jobs', async ({ request }) => { // Correct MSW v2 signature
    try {
      await withLatency()

      const url = new URL(request.url) // Access URL via 'request'
      const titleSearch = url.searchParams.get('search') || ''
      const statusFilter = url.searchParams.get('status')
      const page = parseInt(url.searchParams.get('page')) || 1
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 10

      let jobs = await db.jobs.toArray()
      
      // ... (rest of filtering/pagination logic is correct)
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
http.get('/api/jobs/:id', async ({ params }) => {
    try {
        await withLatency();
        
        const jobId = parseInt(params.id); // Or params.jobId, depending on your router
        
        if (isNaN(jobId)) {
            return new HttpResponse(null, { status: 400 });
        }
        
        const job = await db.jobs.get(jobId);

        if (!job) {
            return new HttpResponse(null, { status: 404 });
        }
        
        return HttpResponse.json(job); // 🛑 MUST return JSON here!
    } catch (error) {
        console.error('Error in GET /api/jobs/:id handler:', error);
        return new HttpResponse(null, { status: 500 }); // Returns a 500 without HTML
    }
}),
  
  // POST /jobs (Create job)
  http.post('/api/jobs', async ({ request }) => { // 🛑 FIX: Use MSW v2 signature
    await withLatency(); // Removed 'ctx' argument
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Simulated network error during job creation.' }, { status: 500 }); // 🛑 FIX: Use HttpResponse
    }
    
    const newJob = await request.json(); // Access JSON via 'request'
    const allJobs = await db.jobs.toArray();
    const maxOrder = allJobs.length > 0 ? Math.max(...allJobs.map(j => j.order)) : 0;

    // Write-through to Dexie
    const id = await db.jobs.add({ 
      ...newJob, 
      id: undefined,
      status: 'active', 
      order: maxOrder + 1,
      createdAt: new Date().toISOString() 
    });
    
    return HttpResponse.json(
      { id, ...newJob },
      { status: 201 }
    );
  }),
  
  // PATCH /jobs/:id (Update job) - Already using MSW v2 signature ({ params, request })
  http.patch('/api/jobs/:id', async ({ params, request }) => {
    try {
      await withLatency();

      if (shouldFail()) {
        return new HttpResponse(null, { status: 500 });
      }

      const { id } = params;
      const data = await request.json();
      
      await db.jobs.update(parseInt(id), { status: data.status });
      
      return HttpResponse.json({ success: true });
    } catch (error) {
      console.error('Error in PATCH /api/jobs/:id handler:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),
  
  // PATCH /jobs/:id/reorder (Reorder job)
  http.patch('/api/jobs/:id/reorder', async ({ params, request }) => { // 🛑 FIX: Use MSW v2 signature
    await withLatency(); // Removed 'ctx' argument

    // Occasionally return 500 to test rollback
    if (Math.random() < 0.25) { 
      return HttpResponse.json({ error: 'Simulated reorder conflict error.' }, { status: 500 }); // 🛑 FIX: Use HttpResponse
    }
    
    const { id } = params;
    const { fromOrder, toOrder } = await request.json(); // Access JSON via 'request'
    const numId = parseInt(id);

    // Transactional logic for reordering (Dexie logic is correct)
    await db.transaction('rw', db.jobs, async () => {
        // Move the target item
        await db.jobs.update(numId, { order: toOrder });

        // Adjust the orders of the items that were shifted
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

    return HttpResponse.json({ success: true });
  }),

  // --- CANDIDATE HANDLERS ---
  
  // GET /candidates (List/Pagination/Filtering) - ORIGINAL SOURCE OF TypeError
  http.get('/api/candidates', async ({ request }) => { // 🛑 FIX: Use MSW v2 signature, only destructuring 'request'
    await withLatency();

    // 🛑 FIX: Access URL via 'request'
    const url = new URL(request.url);
    const nameEmailSearch = url.searchParams.get('search') || '';
    const stageFilter = url.searchParams.get('stage');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = 50; 

    let candidates = await db.candidates.toArray();
    // ... (rest of filtering/pagination logic is correct)
    if (nameEmailSearch) {
        const query = nameEmailSearch.toLowerCase();
        candidates = candidates.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.email.toLowerCase().includes(query)
        );
    }
    
    if (stageFilter) {
      candidates = candidates.filter(c => c.stage === stageFilter);
    }

    const totalCount = candidates.length;
    const paginatedCandidates = candidates.slice((page - 1) * pageSize, page * pageSize);
    
    // 🛑 FIX: Use MSW v2 response syntax
    return HttpResponse.json(
      paginatedCandidates,
      { 
        status: 200,
        headers: { 'X-Total-Count': totalCount.toString() }
      }
    );
  }),
  
  // PATCH /candidates/:id (Stage transitions)
  http.patch('/api/candidates/:id', async ({ params, request }) => { // 🛑 FIX: Use MSW v2 signature
    await withLatency(); // Removed 'ctx' argument

    if (shouldFail()) {
      return HttpResponse.json({ error: 'Simulated network error during candidate update.' }, { status: 500 });
    }
    
    const { id } = params;
    const updates = await request.json(); // Access JSON via 'request'
    const numId = parseInt(id);

    // ... (update logic is correct)
    await db.candidates.update(numId, updates);
    
    if (updates.stage) {
        await db.timeline.add({
            candidateId: numId,
            type: 'stage_change',
            details: `Moved to ${updates.stage}`,
            timestamp: new Date().toISOString(),
        });
    }

    return HttpResponse.json({ id: numId, ...updates });
  }),

  // GET /candidates/:id/timeline
  http.get('/api/candidates/:id/timeline', async ({ params }) => { // 🛑 FIX: Use MSW v2 signature
    await withLatency(); // Removed 'ctx' argument
    const { id } = params;
    const numId = parseInt(id);

    const timelineEvents = await db.timeline
        .where('candidateId').equals(numId)
        .sortBy('timestamp');

    return HttpResponse.json(timelineEvents); // 🛑 FIX: Use HttpResponse
  }),

  // POST /candidates (Apply to job) - Already using MSW v2 signature ({ request })
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

  // GET /assessments/:jobId - Already using MSW v2 signature ({ params })
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

  // PUT /assessments/:jobId - Already using MSW v2 signature ({ params, request })
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

  // POST /assessments/:jobId/submit - Already using MSW v2 signature ({ params, request })
  http.post('/api/assessments/:jobId/submit', async ({ params, request }) => {
    try {
      await withLatency();
      
      const { jobId } = params;
      const submission = await request.json();
      const numJobId = parseInt(jobId);

      // Assuming db.submissions exists based on seeding logic
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

  // GET /candidates/:id (Single Candidate) - Already using MSW v2 signature ({ params })
  http.get('/api/candidates/:id', async ({ params }) => {
    try {
      await withLatency();
      
      const { id } = params;
      const numId = parseInt(id);

      if (shouldFail()) {
        return new HttpResponse(null, { status: 500 });
      }
      
      const candidate = await db.candidates.get(numId);
      
      if (!candidate) {
        return new HttpResponse(null, { status: 404 });
      }

      // Fetch notes associated with the candidate
      const notes = await db.timeline 
          .where({ candidateId: numId, type: 'note' }) 
          .sortBy('timestamp');

      // Combine and return candidate with their notes
      return HttpResponse.json({ ...candidate, notes });
    } catch (error) {
      console.error('Error in GET /api/candidates/:id handler:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),
  
  // PATCH /candidates/:id (Stage transitions) - Already using MSW v2 signature ({ params, request })
  http.patch('/api/candidates/:id', async ({ params, request }) => {
    await withLatency();

    if (shouldFail()) {
      return HttpResponse.json({ error: 'Simulated network error during candidate update.' }, { status: 500 });
    }
    
    const { id } = params;
    const updates = await request.json();
    const numId = parseInt(id);

    // 1. Update candidate stage
    await db.candidates.update(numId, updates);
    
    // 2. Log timeline change (status change)
    if (updates.stage) {
        await db.timeline.add({
            candidateId: numId,
            type: 'stage_change',
            details: `Moved to ${updates.stage}`,
            timestamp: new Date().toISOString(),
        });
    }

    return HttpResponse.json({ id: numId, ...updates });
  }),

  // GET /candidates/:id/timeline (Fetch all events) - Already using MSW v2 signature ({ params })
  http.get('/api/candidates/:id/timeline', async ({ params }) => {
    await withLatency();
    const { id } = params;
    const numId = parseInt(id);

    // Fetch ALL timeline events (stage changes and notes)
    const timelineEvents = await db.timeline
        .where('candidateId').equals(numId)
        .sortBy('timestamp');

    return HttpResponse.json(timelineEvents);
  }),
    
  // POST /candidates/:id/notes (NEW HANDLER for NotesSection) - Already using MSW v2 signature ({ params, request })
  http.post('/api/candidates/:id/notes', async ({ params, request }) => {
      await withLatency();
      if (shouldFail()) {
        return HttpResponse.json({ error: 'Simulated error posting note.' }, { status: 500 });
      }
      
      const { id } = params;
      const { text, author } = await request.json();
      const numId = parseInt(id);

      const noteId = await db.timeline.add({
          candidateId: numId,
          type: 'note',
          details: text,
          author,
          timestamp: new Date().toISOString(),
      });
      
      return HttpResponse.json({ id: noteId, text, author, type: 'note' }, { status: 201 });
  }),
];