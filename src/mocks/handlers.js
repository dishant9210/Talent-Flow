import { http, HttpResponse } from 'msw';
import { db } from '../db';

// --- Configuration ---
const DELAY_MS = 200;
const MAX_DELAY_MS = 1200;
const FAILURE_RATE = 0.1; // 10% chance of failure

// 🛑 CACHE-BUSTING HEADERS for GET requests 🛑
const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
};

// --- Utilities ---
const withLatency = async () => {
  const delay = Math.random() * (MAX_DELAY_MS - DELAY_MS) + DELAY_MS;
  await new Promise(resolve => setTimeout(resolve, delay));
};

const shouldFail = () => Math.random() < FAILURE_RATE;

// --- HANDLERS ARRAY ---
export const handlers = [
  // --- JOB HANDLERS ---
  
  // GET /jobs (List/Pagination/Filtering)
  http.get('/api/jobs', async ({ request }) => { 
    try {
      await withLatency()
      const url = new URL(request.url)
      const titleSearch = url.searchParams.get('search') || ''
      const statusFilter = url.searchParams.get('status')
      const page = parseInt(url.searchParams.get('page')) || 1
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 10

      let jobs = await db.jobs.toArray()
      
      // Filtering logic...
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
      }, { headers: NO_CACHE_HEADERS }) 
    } catch (error) {
      console.error('Handler error:', error)
      return new HttpResponse(null, { status: 500 })
    }
  }),
    
// GET /jobs/:id (Single Job Detail)
http.get('/api/jobs/:id', async ({ params }) => {
    try {
        await withLatency();
        
        // Use params.id since the router path likely defines it as :id (not :jobId)
        const jobId = parseInt(params.id); 
        
        if (isNaN(jobId) || jobId <= 0) {
            return new HttpResponse(null, { status: 400 });
        }
        
        const job = await db.jobs.get(jobId);

        if (!job) {
            return new HttpResponse(null, { status: 404 });
        }
        
        return HttpResponse.json(job, { headers: NO_CACHE_HEADERS }); 
    } catch (error) {
        console.error('Error in GET /api/jobs/:id handler:', error);
        return new HttpResponse(null, { status: 500 });
    }
}),
  
  // POST /jobs (Create job)
  http.post('/api/jobs', async ({ request }) => { 
    await withLatency();
    
    if (shouldFail()) {
      return HttpResponse.json({ error: 'Simulated network error during job creation.' }, { status: 500 });
    }
    
    const newJob = await request.json(); 
    const allJobs = await db.jobs.toArray();
    const maxOrder = allJobs.length > 0 ? Math.max(...allJobs.map(j => j.order)) : 0;

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
  
  // PATCH /jobs/:id (Update job status)
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
  http.patch('/api/jobs/:id/reorder', async ({ params, request }) => { 
    await withLatency();

    if (Math.random() < 0.25) { 
      return HttpResponse.json({ error: 'Simulated reorder conflict error.' }, { status: 500 }); 
    }
    
    const { id } = params;
    const { fromOrder, toOrder } = await request.json();
    const numId = parseInt(id);

    await db.transaction('rw', db.jobs, async () => {
        await db.jobs.update(numId, { order: toOrder });

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
  
  // GET /candidates (List/Pagination/Filtering)
  http.get('/api/candidates', async ({ request }) => { 
    await withLatency();

    const url = new URL(request.url);
    const nameEmailSearch = url.searchParams.get('search') || '';
    const stageFilter = url.searchParams.get('stage');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = 50; 

    let candidates = await db.candidates.toArray();

    // Filtering logic...
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
    
    return HttpResponse.json(
      paginatedCandidates,
      { 
        status: 200,
        headers: { 'X-Total-Count': totalCount.toString(), ...NO_CACHE_HEADERS }
      }
    );
  }),
  
  // GET /candidates/:id (Single Candidate Profile)
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

      // Fetch notes (which are stored in the timeline with type 'note')
      const notes = await db.timeline 
          .where({ candidateId: numId, type: 'note' }) 
          .sortBy('timestamp');

      // Combine and return candidate with their notes
      return HttpResponse.json({ ...candidate, notes }, { headers: NO_CACHE_HEADERS });
    } catch (error) {
      console.error('Error in GET /api/candidates/:id handler:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // PATCH /candidates/:id (Stage transitions)
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
    
    // 2. Log timeline change
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

  // GET /candidates/:id/timeline (Fetch all events: stages, notes, etc.)
  http.get('/api/candidates/:id/timeline', async ({ params }) => {
    await withLatency();
    const { id } = params;
    const numId = parseInt(id);

    const timelineEvents = await db.timeline
        .where('candidateId').equals(numId)
        .sortBy('timestamp');

    return HttpResponse.json(timelineEvents, { headers: NO_CACHE_HEADERS });
  }),
    
  // POST /candidates/:id/notes (Add a new note to the timeline)
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

// POST /candidates (Apply to job)
  http.post('/api/candidates', async ({ request }) => {
    try {
      await withLatency();
      // ... (application logic)
      return HttpResponse.json(
        { id, ...newCandidateData, stage: 'applied' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /candidates:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),


  // --- ASSESSMENT HANDLERS ---

  // GET /assessments/:jobId
  http.get('/api/assessments/:jobId', async ({ params }) => {
    try {
      await withLatency();
      const { jobId } = params;
      const numId = parseInt(jobId);

      const assessment = await db.assessments.get(numId);
      
      if (!assessment) {
        return HttpResponse.json({ jobId: numId, sections: [] }, { headers: NO_CACHE_HEADERS });
      }

      return HttpResponse.json(assessment, { headers: NO_CACHE_HEADERS });
    } catch (error) {
      console.error('Error in GET /assessments/:jobId:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // PUT /assessments/:jobId
  http.put('/api/assessments/:jobId', async ({ params, request }) => {
    try {
      // ... (logic is correct)
      return HttpResponse.json({ success: true, jobId: numId });
    } catch (error) {
      console.error('Error in PUT /assessments/:jobId:', error);
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // POST /assessments/:jobId/submit
  http.post('/api/assessments/:jobId/submit', async ({ params, request }) => {
    try {
      // ... (logic is correct)
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