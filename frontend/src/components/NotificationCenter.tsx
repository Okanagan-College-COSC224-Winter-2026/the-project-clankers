import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getEnrollmentRequests, approveEnrollmentRequest, rejectEnrollmentRequest } from '../util/api'

interface EnrollmentRequest {
  id: number
  studentID: number
  courseID: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  resolved_at?: string
  teacher_notes?: string
  student: {
    id: number
    name: string
    email: string
  }
  course: {
    id: number
    name: string
  }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onRequestUpdated?: () => void
}

export default function NotificationCenter({ isOpen, onClose, onRequestUpdated }: Props) {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getEnrollmentRequests()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching enrollment requests:', err)
      setError('Failed to load enrollment requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const handleApprove = async (requestId: number) => {
    try {
      setProcessingId(requestId)
      await approveEnrollmentRequest(requestId)
      // Update local state
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r))
      onRequestUpdated?.()
    } catch (err) {
      console.error('Error approving request:', err)
      alert('Failed to approve request: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: number) => {
    const notes = prompt('Add notes (optional):')
    try {
      setProcessingId(requestId)
      await rejectEnrollmentRequest(requestId, notes || '')
      // Update local state
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
      onRequestUpdated?.()
    } catch (err) {
      console.error('Error rejecting request:', err)
      alert('Failed to reject request: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = filter === 'pending' ? requests.filter(r => r.status === 'pending') : requests

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-2xl w-full rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Enrollment Requests</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2 border-b">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 ${
              filter === 'pending'
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 ${
              filter === 'all'
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({requests.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p>
              {filter === 'pending'
                ? 'No pending enrollment requests'
                : 'No enrollment requests'}
            </p>
          </div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{request.student.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Requesting to join: <span className="font-medium">{request.course.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Email: {request.student.email}</p>
                  <p className="text-xs text-gray-500">
                    Requested: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                  {request.teacher_notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">Notes: {request.teacher_notes}</p>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-1 rounded bg-green-600 p-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span className="text-sm">Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-1 rounded bg-red-600 p-2 text-white hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">Reject</span>
                    </button>
                  </div>
                )}

                {request.status !== 'pending' && (
                  <div className="ml-4">
                    {request.status === 'approved' && (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    )}
                    {request.status === 'rejected' && (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
