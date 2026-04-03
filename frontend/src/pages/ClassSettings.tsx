import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import { listAssignments, listClasses, updateClass, deleteClass, archiveClass, getClassDetails } from '../util/api'
import { isTeacher, isAdmin } from '../util/login'
import { Settings, Users, Trash2, Archive, BookOpen, ChevronRight } from 'lucide-react'

export default function ClassSettings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const idNew = Number(id)

  const [className, setClassName] = useState<string | null>(null)
  const [editedClassName, setEditedClassName] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [isSavingName, setIsSavingName] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'success' | 'error'>('success')
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    ;(async () => {
      const classes = await listClasses()
      const currentClass = classes.find((c: { id: number }) => c.id === idNew)
      if (currentClass) {
        setClassName(currentClass.name)
        setEditedClassName(currentClass.name)
      }
      try {
        const details = await getClassDetails(idNew)
        setStudentCount(details.student_count ?? 0)
      } catch {
        // non-critical
      }
      try {
        const assignments = await listAssignments(String(id))
        setAssignmentCount(assignments.length ?? 0)
      } catch {
        // non-critical
      }
    })()
  }, [id])

  const handleSaveClassName = async () => {
    if (!editedClassName.trim()) {
      setStatusType('error')
      setStatusMessage('Class name cannot be empty')
      return
    }
    setIsSavingName(true)
    try {
      await updateClass(idNew, editedClassName.trim())
      setClassName(editedClassName.trim())
      setStatusType('success')
      setStatusMessage('Class name updated successfully!')
    } catch (error) {
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error updating class name')
    }
    setIsSavingName(false)
  }

  const handleArchiveClass = async () => {
    try {
      await archiveClass(idNew)
      setStatusType('success')
      setStatusMessage('Class archived successfully!')
      setTimeout(() => navigate('/home'), 1500)
    } catch (error) {
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error archiving class')
    }
    setShowArchiveConfirm(false)
  }

  const handleDeleteClass = async () => {
    try {
      await deleteClass(idNew)
      setStatusType('success')
      setStatusMessage('Class deleted successfully!')
      setTimeout(() => navigate('/home'), 1500)
    } catch (error) {
      setStatusType('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error deleting class')
    }
    setShowDeleteConfirm(false)
  }

  const hasActiveData = assignmentCount > 0 || studentCount > 0

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Page header ── */}
      <div className="flex h-16 items-center border-b bg-background px-6">
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <Link to={`/classes/${id}/home`} className="text-muted-foreground hover:text-foreground transition-colors">{className}</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">Settings</span>
        </nav>
      </div>

      <TabNavigation
        tabs={
          isTeacher() || isAdmin()
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

      {!isTeacher() && !isAdmin() ? (
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">You don't have access to class settings.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-8 p-6">
          {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

          {/* ── General ── */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-medium">General</h3>
            </div>
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Course Name</CardTitle>
                <CardDescription>The name displayed to all students and instructors.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    value={editedClassName}
                    onChange={(e) => setEditedClassName(e.target.value)}
                    placeholder="Enter class name"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveClassName()}
                  />
                </div>
                <Button
                  onClick={handleSaveClassName}
                  disabled={isSavingName || editedClassName.trim() === className}
                >
                  {isSavingName ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* ── Enrollment ── */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-medium">Enrollment</h3>
            </div>
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enrolled Students</p>
                    <p className="text-sm text-muted-foreground">Total students currently in this course.</p>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-base">{studentCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Assignments</p>
                    <p className="text-sm text-muted-foreground">Total assignments created for this course.</p>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-base">{assignmentCount}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage student enrollment from the{' '}
                  <button
                    className="cursor-pointer underline"
                    onClick={() => navigate(`/classes/${id}/members`)}
                  >
                    Members
                  </button>{' '}
                  tab using the Manage Enrollment button.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── Course Content ── */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h3 className="text-lg font-medium">Course Content</h3>
            </div>
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manage Assignments</p>
                    <p className="text-sm text-muted-foreground">
                      Create and manage assignments, peer review settings, and due dates.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/classes/${id}/home`)}>
                    Go to Home
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="font-medium">Group Management</p>
                    <p className="text-sm text-muted-foreground">
                      Create and manage student groups for group assignments.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/classes/${id}/members`)}>
                    Go to Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Danger Zone ── */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            </div>
            <div className="space-y-3">
              <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Archive Course</p>
                      <p className="text-sm text-muted-foreground">
                        Hides the course from your dashboard. All data and student work is preserved and can be restored.
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => setShowArchiveConfirm(true)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Course</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently removes the course and all associated data. This cannot be undone.
                      </p>
                      {hasActiveData && !isAdmin() && (
                        <p className="mt-1 text-sm font-medium text-destructive">
                          ⚠️ This course has active data. Only admins can force delete. Archive it instead.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={hasActiveData && !isAdmin()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* Archive confirm */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold">Archive Course?</h2>
            <p className="mb-4 text-sm text-gray-600">
              <strong>"{className}"</strong> will be hidden from your dashboard. All student data and assignments are preserved and can be unarchived later.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowArchiveConfirm(false)} variant="outline">Cancel</Button>
              <Button onClick={handleArchiveClass} variant="secondary">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold">Delete Course?</h2>
            <p className="mb-2 text-sm text-gray-600">
              You are about to permanently delete <strong>"{className}"</strong>.
            </p>
            {hasActiveData && (
              <p className="mb-3 text-sm font-bold text-orange-600">
                ⚠️ This course has
                {assignmentCount > 0 && ` ${assignmentCount} assignment(s)`}
                {assignmentCount > 0 && studentCount > 0 && ' and'}
                {studentCount > 0 && ` ${studentCount} enrolled student(s)`}
                . All data will be permanently lost.
              </p>
            )}
            <p className="mb-4 text-sm font-medium text-red-600">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">Cancel</Button>
              <Button onClick={handleDeleteClass} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
