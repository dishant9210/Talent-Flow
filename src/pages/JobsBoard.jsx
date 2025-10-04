// src/pages/JobsBoard.jsx

import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, ListFilter, Archive, CheckCircle, GripVertical } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd' 

const JOB_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', color: 'bg-red-100 text-red-700' }
}

export default function JobsBoard() {
  // State for filtering and pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')

  // State for DND and Mutations
  const [jobs, setJobs] = useState([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState(null)
  
  // API URL with all parameters
  const apiUrl = `/api/jobs?page=${page}&pageSize=${pageSize}&status=${status}&search=${search}`
  
  // Fetch data using our custom hook
  const { data: jobsResponse, isLoading, error, refetch } = useFetch(apiUrl)

  // SYNC FETCHED DATA TO LOCAL STATE FOR DRAG-AND-DROP
  useEffect(() => {
    if (jobsResponse?.data) {
      // Ensure jobs are sorted by 'order' initially
      const sortedJobs = jobsResponse.data.sort((a, b) => a.order - b.order)
      setJobs(sortedJobs)
    } else if (!isLoading && !jobsResponse) {
        setJobs([])
    }
  }, [jobsResponse, isLoading])

  // Add debounce for search (Refetches on change of 'search')
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on new search
      refetch()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, refetch])

  // Refetch when pagination or status changes (triggers refetch)
  useEffect(() => {
    refetch()
  }, [page, status, refetch])


  const totalJobs = jobsResponse?.total || 0
  const totalPages = Math.ceil(totalJobs / pageSize)

// ----------------------------------------------------------------------
// MUTATION LOGIC
// ----------------------------------------------------------------------

    // 🛑 FIX 1: CHANGE SUCCESS HANDLER TO PREVENT REFETCH/RE-RENDER ON SUCCESS 🛑
    const handlePatchSuccess = () => { 
        setIsUpdating(false)
        setUpdateError(null) // Clear any previous error messages
        // Do NOT call refetch() here for reorder, as the UI is already updated optimistically.
        // For archive/unarchive, we will still call refetch *if* filtering by status is active.
    }
    
    const handlePatchFailure = (err, originalJobs) => {
        setIsUpdating(false)
        setJobs(originalJobs) // Rollback optimistic update
        setUpdateError(err.message)
        console.error('Mutation Error:', err)
    }

    // --- 1. Archive/Unarchive Handler ---
    const handleArchiveToggle = async (jobId, currentStatus) => {
        const isArchived = currentStatus === 'archived'
        const newStatus = isArchived ? 'active' : 'archived'
        
        const originalJobs = jobs
        
        setJobs(jobs.map(j => 
            j.id === jobId ? { ...j, status: newStatus } : j
        ))
        
        setIsUpdating(true)
        setUpdateError(null)

        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}))
                 throw new Error(errorData.error || `Status update failed (${response.status})`)
            }
            
            // 🛑 Archive Success: We MUST refetch if the current filter hides the job.
            // Example: If status='active' and we archive it, it must disappear.
            if (status !== 'all' && newStatus !== status) {
                 refetch() // Triggers a new fetch that removes the job from the current view
            } else {
                handlePatchSuccess() // Just clear loading state
            }
        } catch (err) {
            handlePatchFailure(err, originalJobs)
        }
    }


    // --- 2. Reorder Handler (Optimistic Update & Rollback) ---
    const handleReorderAPI = async (jobId, fromOrder, toOrder, originalJobsForRollback) => {
        setIsUpdating(true)
        setUpdateError(null)
        
        try {
            const response = await fetch(`/api/jobs/${jobId}/reorder`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromOrder, toOrder }),
            })
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Reorder failed (${response.status})`)
            }
            
            // 🛑 Success: Just clear the status. The UI already has the final order.
            handlePatchSuccess()

        } catch (err) {
            // Rollback
            handlePatchFailure(err, originalJobsForRollback)
        }
    }


    // --- 3. Drag and Drop Handler ---
    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result

        if (!destination || destination.index === source.index) {
            return
        }

        const draggedJobId = parseInt(draggableId.split('-')[1])
        const jobToMove = jobs.find(j => j.id === draggedJobId)
        if (!jobToMove) return

        const originalJobsForRollback = jobs

        // Optimistic UI Update
        const newJobs = Array.from(jobs)
        
        const [reorderedItem] = newJobs.splice(source.index, 1)
        newJobs.splice(destination.index, 0, reorderedItem)

        const updatedJobs = newJobs.map((job, index) => ({
            ...job,
            order: index + 1, 
        }))
        
        setJobs(updatedJobs)
        
        // API Call
        const fromOrder = jobToMove.order
        const toOrder = updatedJobs[destination.index].order
        
        handleReorderAPI(draggedJobId, fromOrder, toOrder, originalJobsForRollback)
    }

// ----------------------------------------------------------------------
// RENDER
// ----------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Jobs Board ({totalJobs} Total)</h1>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>

        <Link 
          to="/jobs/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-150"
        >
          Add Job
        </Link>
      </div>

    {/* Update Status and Error Messages */}
    {updateError && (
        <div className="p-3 text-red-700 bg-red-100 border border-red-200 rounded">
            Action Failed: {updateError}
        </div>
    )}
    {isUpdating && <div className="text-sm text-yellow-600">Updating order on server...</div>}


      {/* Jobs Table */}
      {isLoading ? (
        <div className="text-center p-12">Loading...</div>
      ) : (
        // 🛑 FIX 2: WRAP THE DROPPABLE CONTENT IN A TBODY 🛑
        <DragDropContext onDragEnd={onDragEnd}>
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow overflow-hidden">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Job Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Actions
                        </th>
                    </tr>
                </thead>
                <Droppable droppableId="jobs">
                    {(provided) => (
                        <tbody
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="bg-white divide-y divide-gray-200"
                        >
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500">
                                        No jobs found.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job, index) => (
                                    <Draggable 
                                        key={job.id} 
                                        draggableId={`job-${job.id}`} 
                                        index={index}
                                    >
                                        {(provided) => (
                                            <tr
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="hover:bg-gray-50 transition-colors"
                                                style={{ ...provided.draggableProps.style }}
                                            >
                                                <td 
                                                    className="px-6 py-4 w-12"
                                                    {...provided.dragHandleProps} // 🛑 FIX 3: Apply handle to the TD
                                                >
                                                    <GripVertical 
                                                        className="text-gray-400 cursor-grab hover:text-gray-600"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link 
                                                        to={`/jobs/${job.id}`}
                                                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                    >
                                                        {job.title}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 w-24">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                                                        JOB_STATUSES[job.status].color
                                                    }`}>
                                                        {JOB_STATUSES[job.status].label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right w-32 space-x-2 text-sm">
                                                    <Link to={`/jobs/${job.id}/edit`} className="text-gray-500 hover:text-indigo-600">
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleArchiveToggle(job.id, job.status)}
                                                        className={`p-1 rounded-full text-sm ${
                                                            job.status === 'archived' 
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-red-600 hover:bg-red-50'
                                                        }`}
                                                    >
                                                        {job.status === 'archived' ? <CheckCircle className="h-4 w-4 inline" /> : <Archive className="h-4 w-4 inline" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </tbody>
                    )}
                </Droppable>
            </table>
            </DragDropContext>
      )}

      {/* Pagination */}
      {jobs.length > 0 && (
          <div className="flex justify-between items-center">
              <p className="text-sm text-gray-700">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalJobs)} of {totalJobs} results
              </p>
              <div className="space-x-2">
                  <button
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                      Previous
                  </button>
                  <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}
    </div>
  )
}