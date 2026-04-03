import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import AssignmentCard from '../components/AssignmentCard'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import RosterUploadResult from '../components/RosterUploadResult'
import ErrorModal from '../components/ErrorModal'
import { listAssignments, listClasses, createAssignment, updateClass, deleteClass, archiveClass, getClassDetails } from '../util/api'
import { importCSV } from '../util/csv'
import { isTeacher, isAdmin } from '../util/login'
import { Upload, Plus, FileText } from 'lucide-react'

interface Assignment {
  id: number
  name: string
  due_date?: string
}

interface RosterUploadResultData {
  message: string
  enrolled_count: number
  created_count: number
  existing_count?: number
  new_students?: Array<{
    email: string
    student_id: string
    temp_password: string
  }>
  enrolled_existing_students?: Array<{
    email: string
    student_id: string
    name: string
  }>
  existing_students?: Array<{
    email: string
    student_id: string
    name: string
  }>
}

export default function ClassHome() {
  const { id } = useParams()
  const navigate = useNavigate()
  const idNew = Number(id)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [newAssignmentName, setNewAssignmentName] = useState('')
  const [submissionType, setSubmissionType] = useState<'individual' | 'group'>('individual')
  const [internalReview, setInternalReview] = useState(false)
  const [externalReview, setExternalReview] = useState(false)
  const [anonymousReview, setAnonymousReview] = useState(false)
  const [className, setClassName] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'error' | 'success'>('error')
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null)
  const [isUploadingRoster, setIsUploadingRoster] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isEditingClassName, setIsEditingClassName] = useState(false)
  const [editedClassName, setEditedClassName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [peerReviewStartDate, setPeerReviewStartDate] = useState('')
  const [peerReviewDueDate, setPeerReviewDueDate] = useState('')

  useEffect(() => {
    ;(async () => {
      const resp = await listAssignments(String(id))
      const classes = await listClasses()
      const currentClass = classes.find((c: { id: number }) => c.id === Number(id))
      setAssignments(resp)
      setClassName(currentClass?.name || null)
      try {
        const details = await getClassDetails(Number(id))
        setStudentCount(details.student_count ?? 0)
      } catch {
        // non-critical, default stays 0
      }
    })()
  }, [id])

  const tryCreateAssignment = async () => {
    try {
      setStatusMessage('')
      const response = await createAssignment(
        idNew,
        newAssignmentName,
        submissionType,
        internalReview,
        externalReview,
        anonymousReview,
        startDate || undefined,
        dueDate || undefined,
        description || undefined,
        peerReviewStartDate || undefined,
        peerReviewDueDate || undefined
      )
      const createdAssignment = response?.assignment

      if (!createdAssignment?.id) {
        throw new Error('Failed to create assignment')
      }

      setAssignments((prev) => [...prev, createdAssignment])
      setNewAssignmentName('')
      setSubmissionType('individual')
      setInternalReview(false)
      setExternalReview(false)
      setAnonymousReview(false)
      setStartDate('')
      setDueDate('')
      setDescription('')
      setPeerReviewStartDate('')
      setPeerReviewDueDate('')
      setIsCreateDialogOpen(false)
      setStatusType('success')
      setStatusMessage('Assignment created successfully!')
    } catch (error) {
      console.error('Error creating assignment:', error)
      setStatusType('error')
      setStatusMessage('Error creating assignment.')
    }
  }

  const handleRosterUpload = () => {
    if (isUploadingRoster) return

    setIsUploadingRoster(true)
    setStatusMessage('Opening file picker...')
    setStatusType('success')

    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false)
        setStatusMessage('')
        setRosterResult(result)
      },
      (error) => {
        setIsUploadingRoster(false)
        setStatusMessage('')
        const errorMessage = error instanceof Error ? error.message : String(error)
        setUploadError(errorMessage)
      },
      () => {
        setIsUploadingRoster(false)
        setStatusMessage('')
      }
    )
  }

  const handleEditClassName = () => {
    setEditedClassName(className || '')
    setIsEditingClassName(true)
  }

  const handleSaveClassName = async () => {
    if (!editedClassName.trim()) {
      setStatusType('error')
      setStatusMessage('Class name cannot be empty')
      return
    }

    try {
      await updateClass(idNew, editedClassName.trim())
      setClassName(editedClassName.trim())
      setIsEditingClassName(false)
      setStatusType('success')
      setStatusMessage('Class name updated successfully!')
    } catch (error) {
      console.error('Error updating class name:', error)
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error updating class name')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingClassName(false)
    setEditedClassName('')
  }

  const handleDeleteClass = async () => {
    try {
      await deleteClass(idNew)
      setStatusType('success')
      setStatusMessage('Class deleted successfully!')
      setTimeout(() => {
        navigate('/home')
      }, 1500)
    } catch (error) {
      console.error('Error deleting class:', error)
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error deleting class')
      setShowDeleteConfirm(false)
    }
  }

  const handleArchiveClass = async () => {
    try {
      await archiveClass(idNew)
      setStatusType('success')
      setStatusMessage('Class archived successfully!')
      setTimeout(() => {
        navigate('/home')
      }, 1500)
    } catch (error) {
      console.error('Error archiving class:', error)
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error archiving class')
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        {isEditingClassName ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedClassName}
              onChange={(e) => setEditedClassName(e.target.value)}
              className="max-w-md"
              placeholder="Class name"
            />
            <Button onClick={handleSaveClassName} size="sm">
              Save
            </Button>
            <Button onClick={handleCancelEdit} size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{className}</h2>
            {isTeacher() && (
              <button
                onClick={handleEditClassName}
                className="rounded p-1 hover:bg-gray-100"
                title="Edit class name"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {isTeacher() && (
            <Button onClick={handleRosterUpload} disabled={isUploadingRoster} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
            </Button>
          )}
          {(isTeacher() || isAdmin()) && (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
            >
              Delete Class
            </Button>
          )}
        </div>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Groups', path: `/classes/${id}/groups` },
                { label: 'Grades', path: `/classes/${id}/grades` },
              ]
            : [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Grades', path: `/classes/${id}/grades` },
              ]
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

        {rosterResult && (
          <RosterUploadResult
            enrolledCount={rosterResult.enrolled_count}
            createdCount={rosterResult.created_count}
            existingCount={rosterResult.existing_count}
            newStudents={rosterResult.new_students}
            enrolledExistingStudents={rosterResult.enrolled_existing_students}
            existingStudents={rosterResult.existing_students}
            onClose={() => setRosterResult(null)}
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-medium">
              <FileText className="h-5 w-5" />
              Assignments
            </h3>
            {isTeacher() && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            )}
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  id={assignment.id}
                  dueDate={assignment.due_date}
                  classId={id}
                >
                  {assignment.name}
                </AssignmentCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <ErrorModal
          title="Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent showCloseButton={true} className="!max-w-6xl !max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignmentName">Assignment Name</Label>
              <Input
                id="assignmentName"
                placeholder="Enter assignment name"
                value={newAssignmentName}
                onChange={(e) => setNewAssignmentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Assignment Details (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter assignment description (supports markdown formatting)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none min-h-40 max-h-96 overflow-y-auto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peerReviewStartDate">Peer Review Start Date (Optional)</Label>
              <Input
                id="peerReviewStartDate"
                type="datetime-local"
                value={peerReviewStartDate}
                onChange={(e) => setPeerReviewStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peerReviewDueDate">Peer Review Due Date (Optional)</Label>
              <Input
                id="peerReviewDueDate"
                type="datetime-local"
                value={peerReviewDueDate}
                onChange={(e) => setPeerReviewDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Submission Type</Label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="individual"
                    checked={submissionType === 'individual'}
                    onChange={(e) => {
                      setSubmissionType(e.target.value as 'individual')
                      setInternalReview(false)
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="group"
                    checked={submissionType === 'group'}
                    onChange={(e) => setSubmissionType(e.target.value as 'group')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Group</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Peer Review Options</Label>
              <div className="flex flex-col gap-3">
                {submissionType === 'group' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="internalReview"
                      checked={internalReview}
                      onCheckedChange={(checked) => setInternalReview(!!checked)}
                    />
                    <Label htmlFor="internalReview" className="cursor-pointer text-sm font-normal">
                      Internal Review
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="externalReview"
                    checked={externalReview}
                    onCheckedChange={(checked) => setExternalReview(!!checked)}
                  />
                  <Label htmlFor="externalReview" className="cursor-pointer text-sm font-normal">
                    External Review
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anonymousReview"
                    checked={anonymousReview}
                    onCheckedChange={(checked) => setAnonymousReview(!!checked)}
                  />
                  <Label htmlFor="anonymousReview" className="cursor-pointer text-sm font-normal">
                    Anonymous Reviews
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewAssignmentName('')
                setSubmissionType('individual')
                setInternalReview(false)
                setExternalReview(false)
                setAnonymousReview(false)
                setStartDate('')
                setDueDate('')
                setDescription('')
                setPeerReviewStartDate('')
                setPeerReviewDueDate('')
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={tryCreateAssignment}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Delete or Archive Class</h2>
            <p className="mb-2">
              What would you like to do with <strong>"{className}"</strong>?
            </p>
            <p className="mb-4 text-sm text-gray-600">
              <strong>Archive</strong> hides the class from your dashboard but preserves all data.
              <br />
              <strong>Delete</strong> permanently removes the class and cannot be undone.
            </p>
            {(assignments.length > 0 || studentCount > 0) && (
              <p className={`mb-4 font-bold ${isAdmin() ? 'text-orange-600' : 'text-red-600'}`}>
                ⚠️ This class has
                {assignments.length > 0 && ` ${assignments.length} assignment(s)`}
                {assignments.length > 0 && studentCount > 0 && ' and'}
                {studentCount > 0 && ` ${studentCount} enrolled student(s)`}
                .{isAdmin()
                  ? ' As an admin, you can force delete this class, but all data will be permanently lost.'
                  : ' This class cannot be deleted. Archive it instead, or contact an admin to force delete.'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleArchiveClass} variant="secondary">
                Archive
              </Button>
              <Button
                onClick={handleDeleteClass}
                variant="destructive"
                disabled={(assignments.length > 0 || studentCount > 0) && !isAdmin()}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
