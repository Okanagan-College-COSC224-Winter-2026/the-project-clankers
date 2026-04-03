import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { BookOpen, BarChart2, ClipboardList, ShieldCheck, ChevronRight } from 'lucide-react'

import TabNavigation from '../components/TabNavigation'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  downloadStudentSubmission,
  getAssignmentGradebook,
  getAssignmentsByClass,
  getClassGradebook,
  getCourseGroups,
  getGroupMembers,
  getMyCourseGrade,
  getStudentGradebookDetail,
  getStudentSubmissions,
  listClasses,
  listCourseMembers,
  updateClassGradePolicy,
  updateGradeOverride,
  type AssignmentGradebookData,
  type GradebookData,
  type GradebookStudentRow,
  type StudentGradebookDetail,
} from '../util/api'
import { isAdmin, isTeacher } from '../util/login'

export default function ClassGrades() {
  const { id } = useParams()
  const classId = Number(id)

  const [gradebook, setGradebook] = useState<GradebookData | null>(null)
  const [myGrade, setMyGrade] = useState<any>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentGradebookDetail | null>(null)
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState<AssignmentGradebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [className, setClassName] = useState<string | null>(null)

  // Grade Policy state
  const [latePenalty, setLatePenalty] = useState('0')
  const [incompletePenalty, setIncompletePenalty] = useState('0')

  // UI toggle state — which sections are visible
  const [showPolicy, setShowPolicy] = useState(false)
  const [showAggregates, setShowAggregates] = useState(false)
  const [lastOpenedPanel, setLastOpenedPanel] = useState<'policy' | 'aggregates' | 'submissions' | null>(null)

  // Inline edit mode — allows editing grade cells directly in the matrix
  const [editMode, setEditMode] = useState(false)
  // Tracks local input values for cells being edited: key = `${studentId}-${assignmentId}`
const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({})

  // Submissions panel state (lazy loaded on first toggle)
  const [showSubmissions, setShowSubmissions] = useState(false)
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<any[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false)
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null)

  const teacherView = isTeacher() || isAdmin()

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadTeacherData = async () => {
    const data = await getClassGradebook(classId)
    setGradebook(data)
    setLatePenalty(String(data.policy.late_penalty_percent ?? 0))
    setIncompletePenalty(String(data.policy.incomplete_evaluation_penalty_percent ?? 0))
  }

  const loadStudentData = async () => {
    const data = await getMyCourseGrade(classId)
    setMyGrade(data)
  }

  const loadAll = async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      if (teacherView) {
        await loadTeacherData()
      } else {
        await loadStudentData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grades')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    listClasses().then((classes) => {
      const match = classes.find((c: { id: number }) => c.id === classId)
      if (match) setClassName(match.name)
    }).catch(() => {})
    loadAll(false)
  }, [id])

  const loadSubmissionsData = async () => {
    if (!id) return
    setSubmissionsLoading(true)
    try {
      const [classMembersData, courseGroups, assignments] = await Promise.all([
        listCourseMembers(id),
        getCourseGroups(classId),
        getAssignmentsByClass(classId),
      ])
      const students = (classMembersData || [])
        .filter((m: any) => m.role === 'student')
        .map((m: any) => ({ id: m.id, name: m.name, email: m.email, student_id: m.student_id || 'N/A' }))
      const groupsWithMembers = await Promise.all(
        courseGroups.map(async (group: any) => {
          try {
            const members = await getGroupMembers(classId, group.id)
            return { ...group, members }
          } catch {
            return { ...group, members: [] }
          }
        })
      )
      const getSubmStatus = (sub: any, dueDate?: string) => {
        if (!sub) return 'Not Submitted'
        if (!dueDate) return 'Submitted'
        return new Date(sub.submitted_at) <= new Date(dueDate) ? 'Submitted' : 'Submitted Late'
      }
      const data = await Promise.all(
        assignments.map(async (assignment: any) => {
          try {
            const submissions = await getStudentSubmissions(assignment.id)
            const isGroup = assignment.submission_type === 'group'
            if (isGroup) {
              const rows = groupsWithMembers.map((group: any) => {
                const memberIds = (group.members || []).map((m: any) => m.id)
                const sub = submissions.find((s: any) => memberIds.includes(s.student_id))
                return { groupId: group.id, groupName: group.name, status: getSubmStatus(sub, assignment.due_date), submission: sub }
              })
              return { assignment, rows, isGroupAssignment: true }
            } else {
              const subMap = new Map(submissions.map((s: any) => [s.student_id, s]))
              const rows = students.map((student: any) => {
                const sub = subMap.get(student.id) as any
                return { studentId: student.id, studentName: student.name, studentIdNumber: student.student_id, email: student.email, status: getSubmStatus(sub, assignment.due_date), submission: sub }
              })
              return { assignment, rows, isGroupAssignment: false }
            }
          } catch {
            return { assignment, rows: [], isGroupAssignment: assignment.submission_type === 'group' }
          }
        })
      )
      setSubmissionsByAssignment(data)
      setSubmissionsLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions')
    } finally {
      setSubmissionsLoading(false)
    }
  }

  useEffect(() => {
    if (showSubmissions && !submissionsLoaded && teacherView && id) {
      loadSubmissionsData()
    }
  }, [showSubmissions])

  // Load student detail when dialog opens
  useEffect(() => {
    if (!selectedStudentId || !teacherView || !studentDialogOpen) {
      setSelectedStudentDetail(null)
      return
    }
    ;(async () => {
      try {
        const detail = await getStudentGradebookDetail(classId, selectedStudentId)
        setSelectedStudentDetail(detail)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student detail')
      }
    })()
  }, [selectedStudentId, classId, teacherView, studentDialogOpen])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSavePolicy = async (late: string, incomplete: string) => {
    const lateVal = Number(late)
    const incompleteVal = Number(incomplete)
    if (isNaN(lateVal) || isNaN(incompleteVal)) return
    try {
      await updateClassGradePolicy(classId, {
        late_penalty_percent: lateVal,
        incomplete_evaluation_penalty_percent: incompleteVal,
      })
      await loadTeacherData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy')
    }
  }

  const cellKey = (studentId: number, assignmentId: number) => `${studentId}-${assignmentId}`

  const handleCellBlur = async (student: GradebookStudentRow, assignmentId: number, rawValue: string) => {
    const key = cellKey(student.student_id, assignmentId)
    const trimmed = rawValue.trim()

    if (trimmed === '') {
      // Clear override
      try {
        await updateGradeOverride(classId, { assignment_id: assignmentId, student_id: student.student_id, override_grade: null })
        await loadAll(true)
      } catch {
        setError('Failed to clear grade override')
      } finally {
        setPendingEdits((prev) => { const n = { ...prev }; delete n[key]; return n })
      }
      return
    }

    const num = parseFloat(trimmed)
    if (isNaN(num) || num < 0) return

    try {
      await updateGradeOverride(classId, { assignment_id: assignmentId, student_id: student.student_id, override_grade: num })
      await loadAll(true)
    } catch {
      setError('Failed to save grade override')
    } finally {
      setPendingEdits((prev) => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  const handleDownloadSubmission = async (submissionId: number, filename: string) => {
    try {
      const blob = await downloadStudentSubmission(submissionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download submission')
    }
  }

  const handleDownloadStudentCSV = () => {
    if (!selectedStudentDetail) return
    const { student, assignments } = selectedStudentDetail
    const headers = [
      'Assignment',
      'Due Date',
      'Submission Status',
      'Evaluations (done/expected)',
      'Computed Grade (%)',
      'Penalty (%)',
      'Effective Grade (%)',
      'Grade Source',
    ]
    const rows = assignments.map((a) => [
      a.assignment_name,
      a.due_date ? new Date(a.due_date).toLocaleDateString() : '—',
      a.submission_status,
      `${a.peer_evaluation.completed}/${a.peer_evaluation.expected}`,
      a.computed_grade != null ? a.computed_grade.toFixed(1) : 'Pending',
      a.penalty_applied_percent > 0 ? `-${a.penalty_applied_percent}` : '0',
      a.effective_grade != null ? a.effective_grade.toFixed(1) : 'Pending',
      a.grade_source,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().slice(0, 10)
    a.download = `Grades_${student.name.replace(/[/\\?%*:|"<>]/g, '_')}_${dateStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadCSV = () => {
    if (!gradebook) return
    const assignmentNames = gradebook.assignment_aggregates.map((a) => a.assignment_name)
    const headerRow = ['Student', 'Email', 'Student #', 'Course Total (%)', ...assignmentNames]
    const dataRows = gradebook.students.map((s) => [
      s.student_name,
      s.email,
      s.student_number ?? '',
      s.course_total_grade != null ? s.course_total_grade.toFixed(1) : 'Pending',
      ...s.assignments.map((a) => (a.effective_grade != null ? a.effective_grade.toFixed(1) : 'Pending')),
    ])
    const csv = [headerRow, ...dataRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().slice(0, 10)
    a.download = `GradeBook_${gradebook.class.name.replace(/[/\\?%*:|"<>]/g, '_')}_${dateStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Derived stats ────────────────────────────────────────────────────────

  const teacherStats = useMemo(() => {
    if (!gradebook) return { students: 0, assignments: 0, classAverage: null as number | null }
    const allGrades = gradebook.students.flatMap((s) =>
      s.assignments.map((a) => a.effective_grade).filter((g): g is number => g !== null)
    )
    return {
      students: gradebook.students.length,
      assignments: gradebook.assignment_aggregates.length,
      classAverage: allGrades.length > 0 ? Number((allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1)) : null,
    }
  }, [gradebook])

  // ─── Badge helpers ────────────────────────────────────────────────────────

  const submissionBadgeClass = (status: string) => {
    if (status === 'submitted') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    if (status === 'submitted late') return 'bg-amber-50 text-amber-700 ring-amber-200'
    return 'bg-slate-50 text-slate-600 ring-slate-200'
  }

  const evalBadgeClass = (status: string) => {
    if (status === 'complete') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    if (status === 'incomplete') return 'bg-amber-50 text-amber-700 ring-amber-200'
    return 'bg-slate-50 text-slate-600 ring-slate-200'
  }

  const submStatusClass = (status: string) => {
    if (status === 'Submitted') return 'bg-green-100 text-green-800'
    if (status === 'Submitted Late') return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-500'
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Page header ── */}
      <div className="flex h-16 items-center border-b bg-background px-6">
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <Link to={`/classes/${id}/home`} className="text-muted-foreground hover:text-foreground transition-colors">{className}</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">Grades</span>
        </nav>
      </div>

      <TabNavigation
        tabs={
          teacherView
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
        {/* ── Sub-header row ── */}
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h3 className="text-lg font-medium">{teacherView ? 'Gradebook' : 'My Grades'}</h3>
          {teacherView && (
            <div className="ml-auto flex gap-2">
              {gradebook && (
                <Button onClick={handleDownloadCSV} variant="outline" size="sm">
                  ↓ Download CSV
                </Button>
              )}
              <Button
                size="sm"
                variant={showPolicy ? 'default' : 'outline'}
                onClick={() => { setShowPolicy((v) => !v); if (!showPolicy) setLastOpenedPanel('policy') }}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Grade Policy
              </Button>
              <Button
                size="sm"
                variant={showAggregates ? 'default' : 'outline'}
                onClick={() => { setShowAggregates((v) => !v); if (!showAggregates) setLastOpenedPanel('aggregates') }}
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Assignment Averages
              </Button>
              <Button
                size="sm"
                variant={showSubmissions ? 'default' : 'outline'}
                onClick={() => { setShowSubmissions((v) => !v); if (!showSubmissions) setLastOpenedPanel('submissions') }}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Submissions
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {loading && <p className="text-muted-foreground">Loading grades...</p>}

        {/* ═══════════════ TEACHER VIEW ════════════════ */}
        {!loading && teacherView && gradebook && (
          <>
            {/* ── Stats row ── */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">{teacherStats.students}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">{teacherStats.assignments}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Overall Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {teacherStats.classAverage !== null ? `${teacherStats.classAverage.toFixed(1)}%` : 'Pending'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Toggle panels (last-opened floats to top) ── */}
            <div className="flex flex-col gap-6">
            {/* ── Grade Policy ── */}
            {showPolicy && (
              <Card className="border-slate-200/80 shadow-sm" style={{ order: lastOpenedPanel === 'policy' ? 1 : 2 }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Grading Policy</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setShowPolicy(false)}>
                    × Close
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="late-penalty">Late Penalty (%)</Label>
                    <Input
                      id="late-penalty"
                      type="number"
                      min={0}
                      max={100}
                      value={latePenalty}
                      onChange={(e) => setLatePenalty(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => handleSavePolicy(e.target.value, incompletePenalty)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incomplete-penalty">Incomplete Evaluation Penalty (%)</Label>
                    <Input
                      id="incomplete-penalty"
                      type="number"
                      min={0}
                      max={100}
                      value={incompletePenalty}
                      onChange={(e) => setIncompletePenalty(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => handleSavePolicy(latePenalty, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Assignment Averages ── */}
            {showAggregates && (
              <Card className="border-slate-200/80 shadow-sm" style={{ order: lastOpenedPanel === 'aggregates' ? 1 : 2 }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Assignment Averages</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setShowAggregates(false)}>
                    × Close
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="p-3 text-left">Assignment</th>
                        <th className="p-3 text-left">Due</th>
                        <th className="p-3 text-left">Submitted</th>
                        <th className="p-3 text-left">Late</th>
                        <th className="p-3 text-left">Missing</th>
                        <th className="p-3 text-left">Average Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebook.assignment_aggregates.map((a) => (
                        <tr key={a.assignment_id} className="border-b last:border-b-0">
                          <td className="p-3 font-medium text-slate-900">
                            <button
                              className="text-blue-700 hover:underline text-left"
                              onClick={async () => {
                                setSelectedAssignmentDetail(null)
                                setAssignmentDialogOpen(true)
                                try {
                                  const detail = await getAssignmentGradebook(a.assignment_id)
                                  setSelectedAssignmentDetail(detail)
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to load assignment detail')
                                  setAssignmentDialogOpen(false)
                                }
                              }}
                            >
                              {a.assignment_name}
                            </button>
                          </td>
                          <td className="p-3 text-slate-500 text-xs">
                            {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-slate-700">{a.submitted_count}</td>
                          <td className="p-3 text-slate-700">{a.late_count}</td>
                          <td className="p-3 text-slate-700">{a.missing_count}</td>
                          <td className="p-3 font-medium text-slate-900">
                            {a.average_grade !== null ? `${a.average_grade.toFixed(1)}%` : 'Pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* ── Submissions panel ── */}
            {showSubmissions && (
              <Card className="border-slate-200/80 shadow-sm" style={{ order: lastOpenedPanel === 'submissions' ? 1 : 2 }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Student Submissions</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setShowSubmissions(false)}>
                    × Close
                  </Button>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading submissions...</p>
                  ) : submissionsByAssignment.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignments found.</p>
                  ) : (
                    <div className="space-y-3">
                      {submissionsByAssignment.map(({ assignment, rows, isGroupAssignment }) => {
                        const submittedCount = rows.filter((row: any) => row.status !== 'Not Submitted').length
                        const total = rows.length
                        const entityType = isGroupAssignment ? 'groups' : 'students'
                        const isExpanded = expandedSubmissionId === assignment.id
                        return (
                          <Card key={assignment.id} className="border-slate-200/80">
                            <CardHeader
                              onClick={() => setExpandedSubmissionId(isExpanded ? null : assignment.id)}
                              className="cursor-pointer hover:bg-muted/50 transition-colors flex-row justify-between items-center py-3"
                            >
                              <div>
                                <CardTitle className="text-base">{assignment.name}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {submittedCount} of {total} {entityType} submitted
                                  {assignment.due_date && ` · Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                                </p>
                              </div>
                              <span className="text-sm text-muted-foreground">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            </CardHeader>
                            {isExpanded && (
                              <CardContent>
                                {rows.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No {entityType} found.</p>
                                ) : isGroupAssignment ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                          <th className="p-2 text-left">Group Name</th>
                                          <th className="p-2 text-left">Status</th>
                                          <th className="p-2 text-left">File</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(rows as any[]).map((row) => (
                                          <tr key={row.groupId} className="border-b last:border-b-0 hover:bg-slate-50/50">
                                            <td className="p-2">{row.groupName}</td>
                                            <td className="p-2">
                                              <span className={`inline-flex px-2 py-0.5 rounded text-xs ${submStatusClass(row.status)}`}>
                                                {row.status}
                                              </span>
                                            </td>
                                            <td className="p-2">
                                              {row.submission ? (
                                                <Button size="sm" variant="outline" onClick={() => handleDownloadSubmission(row.submission.id, row.submission.filename)}>
                                                  Download
                                                </Button>
                                              ) : <span className="text-muted-foreground text-xs">\u2014</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                          <th className="p-2 text-left">Name</th>
                                          <th className="p-2 text-left">Student ID</th>
                                          <th className="p-2 text-left">Email</th>
                                          <th className="p-2 text-left">Status</th>
                                          <th className="p-2 text-left">File</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(rows as any[]).map((row) => (
                                          <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-slate-50/50">
                                            <td className="p-2 font-medium">{row.studentName}</td>
                                            <td className="p-2 text-xs text-muted-foreground">{row.studentIdNumber}</td>
                                            <td className="p-2 text-xs text-muted-foreground">{row.email}</td>
                                            <td className="p-2">
                                              <span className={`inline-flex px-2 py-0.5 rounded text-xs ${submStatusClass(row.status)}`}>
                                                {row.status}
                                              </span>
                                            </td>
                                            <td className="p-2">
                                              {row.submission ? (
                                                <Button size="sm" variant="outline" onClick={() => handleDownloadSubmission(row.submission.id, row.submission.filename)}>
                                                  Download
                                                </Button>
                                              ) : <span className="text-muted-foreground text-xs">\u2014</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </div>{/* end flex-col panels wrapper */}

            {/* ── Gradebook Matrix ── */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gradebook</CardTitle>
                <div className="flex items-center gap-2">
                  {editMode && (
                    <p className="text-xs text-amber-600">
                      Edit mode — click a grade to override. Leave blank to clear override.
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant={editMode ? 'default' : 'outline'}
                    onClick={() => {
                      setEditMode((v) => !v)
                      setPendingEdits({})
                    }}
                  >
                    {editMode ? '✓ Done Editing' : '✏ Edit Grades'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Course Total</th>
                      {gradebook.assignment_aggregates.map((a) => (
                        <th key={a.assignment_id} className="p-3 text-left">
                          <button
                            className="text-blue-700 hover:underline text-left"
                            onClick={async () => {
                              setSelectedAssignmentDetail(null)
                              setAssignmentDialogOpen(true)
                              try {
                                const detail = await getAssignmentGradebook(a.assignment_id)
                                setSelectedAssignmentDetail(detail)
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to load assignment detail')
                                setAssignmentDialogOpen(false)
                              }
                            }}
                          >
                            {a.assignment_name}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.students.map((student) => (
                      <tr key={student.student_id} className="border-b align-middle last:border-b-0 hover:bg-slate-50/50">
                        {/* Student name — opens detail dialog */}
                        <td className="p-3">
                          <button
                            className="font-medium text-blue-700 hover:underline text-left"
                            onClick={() => {
                              setSelectedStudentId(student.student_id)
                              setStudentDialogOpen(true)
                            }}
                          >
                            {student.student_name}
                          </button>
                          {student.student_number && (
                            <p className="text-xs text-muted-foreground">{student.student_number}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </td>

                        {/* Course total */}
                        <td className="p-3 font-semibold text-slate-900">
                          {student.course_total?.source === 'override' ? (
                            <span className="text-amber-700">
                              {student.course_total_grade != null ? `${student.course_total_grade.toFixed(1)}%` : '—'}
                              <span className="ml-1 text-xs font-normal">(override)</span>
                            </span>
                          ) : student.course_total_grade != null ? (
                            `${student.course_total_grade.toFixed(1)}%`
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )}
                        </td>

                        {/* Per-assignment grade cells */}
                        {student.assignments.map((assignment) => {
                          const key = cellKey(student.student_id, assignment.assignment_id)
                          const pendingVal = pendingEdits[key]
                          const displayGrade = assignment.effective_grade

                          return (
                            <td key={key} className="p-3">
                              {editMode ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-7 w-20 text-xs"
                                    placeholder={displayGrade != null ? displayGrade.toFixed(1) : '—'}
                                    value={pendingVal ?? (assignment.override_grade != null ? String(assignment.override_grade) : '')}
                                    onChange={(e) =>
                                      setPendingEdits((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    onBlur={(e) => handleCellBlur(student, assignment.assignment_id, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    }}
                                  />
                                </div>
                              ) : (
                                <div>
                                  <span className={`font-medium ${assignment.grade_source === 'override' ? 'text-amber-700' : 'text-slate-900'}`}>
                                    {displayGrade != null ? `${displayGrade.toFixed(1)}%` : <span className="text-muted-foreground text-xs">Pending</span>}
                                  </span>
                                  {assignment.grade_source === 'override' && (
                                    <p className="text-xs text-amber-600 mt-0.5">override</p>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {gradebook.students.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No students enrolled yet.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════ STUDENT VIEW ════════════════ */}
        {!loading && !teacherView && myGrade && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  Course Total:{' '}
                  {myGrade.course_total_grade !== null ? `${myGrade.course_total_grade.toFixed(1)}%` : 'Pending'}
                  {myGrade.course_total?.source === 'override' && (
                    <span className="ml-2 text-sm font-normal text-amber-600">(instructor adjusted)</span>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Grades</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-2 text-left">Assignment</th>
                      <th className="p-2 text-left">Due</th>
                      <th className="p-2 text-left">Submission</th>
                      <th className="p-2 text-left">Peer Eval</th>
                      <th className="p-2 text-left">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myGrade.assignments.map((assignment: any) => (
                      <tr key={assignment.assignment_id} className="border-b">
                        <td className="p-2">
                          <Link to={`/assignments/${assignment.assignment_id}`} className="text-blue-700 hover:underline">
                            {assignment.assignment_name}
                          </Link>
                        </td>
                        <td className="p-2 text-xs text-slate-500">
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-2">
                          <Badge className={`ring-1 ${submissionBadgeClass(assignment.submission_status)}`}>
                            {assignment.submission_status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge className={`ring-1 ${evalBadgeClass(assignment.peer_evaluation.status)}`}>
                            {assignment.peer_evaluation.completed}/{assignment.peer_evaluation.expected}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">
                          {assignment.effective_grade !== null ? `${assignment.effective_grade.toFixed(1)}%` : 'Pending'}
                          {assignment.grade_source === 'override' && (
                            <span className="ml-1 text-xs text-amber-600">(adjusted)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══════════════ STUDENT DETAIL DIALOG ════════════════ */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="w-full sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pt-5 pb-4 shrink-0">
            <DialogTitle>
              {selectedStudentDetail ? selectedStudentDetail.student.name : 'Student Detail'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudentDetail
                ? `${selectedStudentDetail.student.email}${selectedStudentDetail.student.student_number ? ` · #${selectedStudentDetail.student.student_number}` : ''}`
                : 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
          {selectedStudentDetail && selectedStudentDetail.assignments.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button size="sm" variant="outline" onClick={handleDownloadStudentCSV}>
                ↓ Download CSV
              </Button>
            </div>
          )}
          {!selectedStudentDetail && (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading student details…</p>
          )}

          {selectedStudentDetail && (
            <div className="space-y-5">
              {/* ── Per-assignment detail ── */}
              {selectedStudentDetail.assignments.map((assignment) => (
                <Card key={assignment.assignment_id} className="border-slate-200/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          <Link to={`/assignments/${assignment.assignment_id}`} className="text-blue-700 hover:underline">
                            {assignment.assignment_name}
                          </Link>
                        </CardTitle>
                        {assignment.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${assignment.grade_source === 'override' ? 'text-amber-700' : 'text-slate-900'}`}>
                          {assignment.effective_grade != null ? `${assignment.effective_grade.toFixed(1)}%` : 'Pending'}
                        </p>
                        {assignment.grade_source === 'override' && (
                          <p className="text-xs text-amber-600">override applied</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* Status badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`ring-1 ${submissionBadgeClass(assignment.submission_status)}`}>
                        {assignment.submission_status}
                      </Badge>
                      <Badge className={`ring-1 ${evalBadgeClass(assignment.peer_evaluation.status)}`}>
                        Eval {assignment.peer_evaluation.completed}/{assignment.peer_evaluation.expected}
                      </Badge>
                      {assignment.penalty_applied_percent > 0 && (
                        <Badge className="ring-1 bg-red-50 text-red-700 ring-red-200">
                          −{assignment.penalty_applied_percent}% penalty
                        </Badge>
                      )}
                    </div>

                    {/* Submissions */}
                    {assignment.all_submissions.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Submissions</p>
                        <ul className="space-y-1">
                          {assignment.all_submissions.map((sub) => (
                            <li key={sub.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                              <span className="text-xs text-slate-700">{sub.filename}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(sub.submitted_at).toLocaleString()}
                                </span>
                                <button
                                  className="text-xs text-blue-600 hover:underline"
                                  onClick={() => handleDownloadSubmission(sub.id, sub.filename)}
                                >
                                  Download
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No submission uploaded.</p>
                    )}

                    {/* Reviews received */}
                    {assignment.received_reviews.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Reviews Received</p>
                        <ul className="space-y-1">
                          {assignment.received_reviews.map((review) => (
                            <li key={review.review_id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                              <div>
                                <span className="text-xs text-slate-700">{review.reviewer_name}</span>
                                <span className="ml-2 text-xs text-muted-foreground capitalize">({review.review_type})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`ring-1 text-xs ${review.is_complete ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                                  {review.is_complete ? 'Complete' : 'Incomplete'}
                                </Badge>
                                <span className="text-xs font-medium text-slate-900">
                                  {review.grade != null ? `${review.grade.toFixed(1)}%` : '—'}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Computed grade breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2 text-muted-foreground">
                      <div>Computed: <span className="font-medium text-slate-800">{assignment.computed_grade != null ? `${assignment.computed_grade.toFixed(1)}%` : '—'}</span></div>
                      <div>Penalty: <span className="font-medium text-slate-800">{assignment.penalty_applied_percent > 0 ? `−${assignment.penalty_applied_percent}%` : 'None'}</span></div>
                      <div>Source: <span className="font-medium text-slate-800 capitalize">{assignment.grade_source}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {selectedStudentDetail.assignments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No assignments in this course yet.</p>
              )}
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ ASSIGNMENT DETAIL DIALOG ════════════════ */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="w-full sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pt-5 pb-4 shrink-0">
            <DialogTitle>
              {selectedAssignmentDetail ? selectedAssignmentDetail.assignment.name : 'Assignment Detail'}
            </DialogTitle>
            <DialogDescription>
              {selectedAssignmentDetail
                ? `Due: ${selectedAssignmentDetail.assignment.due_date ? new Date(selectedAssignmentDetail.assignment.due_date).toLocaleDateString() : 'No due date'}`
                : 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
          {!selectedAssignmentDetail && (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading assignment details…</p>
          )}

          {selectedAssignmentDetail && (
            <div className="space-y-4">
              {/* ── Aggregate summary ── */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="border-slate-200/80">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {selectedAssignmentDetail.aggregate.average_grade != null
                        ? `${selectedAssignmentDetail.aggregate.average_grade.toFixed(1)}%`
                        : 'Pending'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-xl font-semibold text-slate-900">{selectedAssignmentDetail.aggregate.submitted_count}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="text-xl font-semibold text-amber-700">{selectedAssignmentDetail.aggregate.late_count}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Missing</p>
                    <p className="text-xl font-semibold text-red-700">{selectedAssignmentDetail.aggregate.missing_count}</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Per-student breakdown ── */}
              <Card className="border-slate-200/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Student Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="p-3 text-left">Student</th>
                        <th className="p-3 text-left">Submission</th>
                        <th className="p-3 text-left">Peer Eval</th>
                        <th className="p-3 text-left">Computed</th>
                        <th className="p-3 text-left">Penalty</th>
                        <th className="p-3 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssignmentDetail.students.map((s) => (
                        <tr key={s.student_id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-3">
                            <button
                              className="font-medium text-blue-700 hover:underline text-left"
                              onClick={() => {
                                setAssignmentDialogOpen(false)
                                setSelectedStudentId(s.student_id)
                                setStudentDialogOpen(true)
                              }}
                            >
                              {s.student_name}
                            </button>
                            {s.student_number && (
                              <p className="text-xs text-muted-foreground">{s.student_number}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge className={`ring-1 ${submissionBadgeClass(s.entry.submission_status)}`}>
                              {s.entry.submission_status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`ring-1 ${evalBadgeClass(s.entry.peer_evaluation.status)}`}>
                              {s.entry.peer_evaluation.completed}/{s.entry.peer_evaluation.expected}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-700">
                            {s.entry.computed_grade != null ? `${s.entry.computed_grade.toFixed(1)}%` : '—'}
                          </td>
                          <td className="p-3 text-slate-700">
                            {s.entry.penalty_applied_percent > 0 ? `−${s.entry.penalty_applied_percent}%` : '—'}
                          </td>
                          <td className="p-3">
                            <span className={`font-semibold ${s.entry.grade_source === 'override' ? 'text-amber-700' : 'text-slate-900'}`}>
                              {s.entry.effective_grade != null ? `${s.entry.effective_grade.toFixed(1)}%` : <span className="text-muted-foreground">Pending</span>}
                            </span>
                            {s.entry.grade_source === 'override' && (
                              <p className="text-xs text-amber-600">override</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedAssignmentDetail.students.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No students enrolled yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
