import React, { useState, useEffect } from 'react'
import { useFetch } from '../hooks/useFetch'
import { Link } from 'react-router-dom'
import { Search, ListFilter, Archive, CheckCircle } from 'lucide-react'

const JOB_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', color: 'bg-red-100 text-red-700' }
}

export default function JobsBoard() {
  // State for pagination and filtering
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')

  // API URL with all parameters
  const apiUrl = `/api/jobs?page=${page}&pageSize=${pageSize}&status=${status}&search=${search}`
  
  // Fetch data using our custom hook
  const { data: jobsResponse, isLoading, error, refetch } = useFetch(apiUrl)

  // Add debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on new search
      refetch()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Refetch when pagination or status changes
  useEffect(() => {
    refetch()
  }, [page, status])

  const jobs = jobsResponse?.data || []
  const totalJobs = jobsResponse?.total || 0
  const totalPages = Math.ceil(totalJobs / pageSize)

  // Archive/Unarchive handler
  const handleArchiveToggle = async (jobId, isArchived) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: isArchived ? 'active' : 'archived' 
        })
      })

      if (!response.ok) throw new Error('Failed to update job status')
      
      refetch() // Refresh the list after successful update
    } catch (err) {
      console.error('Error updating job:', err)
      alert('Failed to update job status')
    }
  }

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
          />
        </div>
        
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border rounded-lg p-2"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>

        <Link 
          to="/jobs/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          Add Job
        </Link>
      </div>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="text-center p-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link 
                      to={`/jobs/${job.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                      JOB_STATUSES[job.status].color
                    }`}>
                      {JOB_STATUSES[job.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {job.tags.map((tag, i) => (
                        <span 
                          key={`${job.id}-${tag}-${i}`}
                          className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleArchiveToggle(job.id, job.status === 'archived')}
                      className={`p-2 rounded-full ${
                        job.status === 'archived' 
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {job.status === 'archived' ? <CheckCircle /> : <Archive />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalJobs)} of {totalJobs} results
        </p>
        <div className="space-x-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}