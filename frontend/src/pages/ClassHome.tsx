import { useParams } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import AssignmentCard from '../components/AssignmentCard'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import { listAssignments, listClasses, createAssignment } from '../util/api'
import { parseUTC } from '../util/dates'

const toDatetimeLocal = (iso: string): string => {
  const d = parseUTC(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
import { isTeacher } from '../util/login'
import { Plus, FileText } from 'lucide-react'

interface Assignment {
  id: number
  name: string
  due_date?: string
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [peerReviewStartDate, setPeerReviewStartDate] = useState('')
  const [peerReviewDueDate, setPeerReviewDueDate] = useState('')

  const fetchAssignments = useCallback(async () => {
      const resp = await listAssignments(String(id))
      const classes = await listClasses()
      const currentClass = classes.find((c: { id: number }) => c.id === Number(id))
      setAssignments(resp)
      setClassName(currentClass?.name || null)
  }, [id])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    const handleFocus = () => fetchAssignments();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAssignments]);

  const tryCreateAssignment = async () => {
    try {
      setStatusMessage('')
      setCreateError('')

      if ((peerReviewStartDate || peerReviewDueDate) && !dueDate) {
        setCreateError('A due date must be set before setting peer review dates')
        return
      }

      if (dueDate && peerReviewStartDate && new Date(peerReviewStartDate) < new Date(dueDate)) {
        setCreateError('Peer review start date cannot be before the due date')
        return
      }

      if (dueDate && peerReviewDueDate && new Date(peerReviewDueDate) < new Date(dueDate)) {
        setCreateError('Peer review due date cannot be before the due date')
        return
      }

      if (peerReviewStartDate && peerReviewDueDate && new Date(peerReviewDueDate) < new Date(peerReviewStartDate)) {
        setCreateError('Peer review due date cannot be before the peer review start date')
        return
      }

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
      setCreateError('Error creating assignment.')
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 items-center border-b bg-background px-6">
        <h2 className="text-xl font-semibold">{className}</h2>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Grades', path: `/classes/${id}/grades` },
                { label: 'Settings', path: `/classes/${id}/settings` },
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-medium">
              <FileText className="h-5 w-5" />
              Assignments
            </h3>
            {isTeacher() && (
              <Button
                onClick={() => { setCreateError(''); setIsCreateDialogOpen(true) }}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent showCloseButton={true} className="!max-w-6xl !max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>

          {createError && <StatusMessage message={createError} type="error" />}

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
              {startDate ? (
                <div className="flex gap-2">
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStartDate('')} className="text-muted-foreground px-2">✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Not set</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setStartDate(toDatetimeLocal(new Date().toISOString()))}>Set</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              {dueDate ? (
                <div className="flex gap-2">
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setDueDate(''); setPeerReviewStartDate(''); setPeerReviewDueDate(''); }} className="text-muted-foreground px-2">✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Not set</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDueDate(toDatetimeLocal(new Date().toISOString()))}>Set</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="peerReviewStartDate">Peer Review Start Date (Optional)</Label>
              {peerReviewStartDate ? (
                <div className="flex gap-2">
                  <Input
                    id="peerReviewStartDate"
                    type="datetime-local"
                    value={peerReviewStartDate}
                    onChange={(e) => setPeerReviewStartDate(e.target.value)}
                    min={dueDate || undefined}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setPeerReviewStartDate(''); setPeerReviewDueDate(''); }} className="text-muted-foreground px-2">✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{dueDate ? 'Not set' : 'Set due date first'}</span>
                  <Button type="button" variant="outline" size="sm" disabled={!dueDate} onClick={() => setPeerReviewStartDate(dueDate)}>Set</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="peerReviewDueDate">Peer Review Due Date (Optional)</Label>
              {peerReviewDueDate ? (
                <div className="flex gap-2">
                  <Input
                    id="peerReviewDueDate"
                    type="datetime-local"
                    value={peerReviewDueDate}
                    onChange={(e) => setPeerReviewDueDate(e.target.value)}
                    min={peerReviewStartDate || dueDate || undefined}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPeerReviewDueDate('')} className="text-muted-foreground px-2">✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{dueDate ? 'Not set' : 'Set due date first'}</span>
                  <Button type="button" variant="outline" size="sm" disabled={!dueDate} onClick={() => setPeerReviewDueDate(peerReviewStartDate || dueDate)}>Set</Button>
                </div>
              )}
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
                setCreateError('')
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
    </div>
  )
}
