import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import AssignmentCard from '../components/AssignmentCard'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import RosterUploadResult from '../components/RosterUploadResult'
import ErrorModal from '../components/ErrorModal'
import { listAssignments, listClasses, createAssignment } from '../util/api'
import { importCSV } from '../util/csv'
import { isTeacher } from '../util/login'
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

  useEffect(() => {
    ;(async () => {
      const resp = await listAssignments(String(id))
      const classes = await listClasses()
      const currentClass = classes.find((c: { id: number }) => c.id === Number(id))
      setAssignments(resp)
      setClassName(currentClass?.name || null)
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
        anonymousReview
      )
      if (!createdAssignment?.id) {
        throw new Error('Failed to create assignment')
      }

      setAssignments((prev) => [...prev, createdAssignment])
      setNewAssignmentName('')
      setSubmissionType('individual')
      setInternalReview(false)
      setExternalReview(false)
      setAnonymousReview(false)
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <h2 className="text-xl font-semibold">{className}</h2>
        {isTeacher() && (
          <Button onClick={handleRosterUpload} disabled={isUploadingRoster} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
          </Button>
        )}
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Groups', path: `/classes/${id}/groups` },
                { label: 'Student Submissions', path: `/classes/${id}/student-submissions` },
                { label: 'Rubrics', path: `/classes/${id}/rubrics` },
              ]
            : [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
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
          <h3 className="flex items-center gap-2 text-lg font-medium">
            <FileText className="h-5 w-5" />
            Assignments
          </h3>
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

<<<<<<< HEAD
        {isTeacher() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" />
                Create New Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="flex flex-wrap gap-4">
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

              <Button onClick={tryCreateAssignment}>
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {uploadError && (
        <ErrorModal
          title="Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
    </div>
  )
}
