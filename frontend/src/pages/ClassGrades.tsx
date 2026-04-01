import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'

import TabNavigation from '../components/TabNavigation'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  getClassGradebook,
  getMyCourseGrade,
  getStudentGradebookDetail,
  updateClassGradePolicy,
  updateCourseTotalOverride,
  type GradebookData,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [latePenalty, setLatePenalty] = useState('0')
  const [incompletePenalty, setIncompletePenalty] = useState('0')

  const [courseOverrideGrade, setCourseOverrideGrade] = useState('')
  const [courseOverrideReason, setCourseOverrideReason] = useState('')

  const teacherView = isTeacher() || isAdmin()

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
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!id) return
    loadAll(false)
    const interval = setInterval(() => {
      loadAll(true)
    }, 15000)
    return () => clearInterval(interval)
  }, [id])

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

  const handleSavePolicy = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateClassGradePolicy(classId, {
        late_penalty_percent: Number(latePenalty),
        incomplete_evaluation_penalty_percent: Number(incompletePenalty),
      })
      await loadTeacherData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!selectedStudentDetail) {
      setCourseOverrideGrade('')
      setCourseOverrideReason('')
      return
    }

    setCourseOverrideGrade(
      selectedStudentDetail.course_total?.override !== null && selectedStudentDetail.course_total?.override !== undefined
        ? String(selectedStudentDetail.course_total.override)
        : ''
    )
    setCourseOverrideReason(selectedStudentDetail.course_total?.reason || '')
  }, [selectedStudentDetail])

  const handleSaveCourseTotalOverride = async () => {
    if (!selectedStudentDetail) return

    setSaving(true)
    setError(null)
    try {
      const parsedOverride = courseOverrideGrade === '' ? null : Number(courseOverrideGrade)
      if (parsedOverride !== null && Number.isNaN(parsedOverride)) {
        throw new Error('Override total must be a valid number')
      }

      await updateCourseTotalOverride(classId, {
        student_id: selectedStudentDetail.student.id,
        override_total: parsedOverride,
        reason: courseOverrideReason,
      })

      // Apply optimistic UI update so grade changes are visible immediately.
      const computed = selectedStudentDetail.course_total?.computed ?? null
      const effective = parsedOverride ?? computed
      const source = parsedOverride !== null ? 'override' : computed !== null ? 'computed' : 'pending'

      setSelectedStudentDetail((prev) =>
        prev
          ? {
              ...prev,
              course_total: {
                computed,
                effective,
                override: parsedOverride,
                reason: parsedOverride !== null ? courseOverrideReason : null,
                source,
              },
              course_total_grade: effective,
            }
          : prev
      )

      setGradebook((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          students: prev.students.map((student) =>
            student.student_id === selectedStudentDetail.student.id
              ? {
                  ...student,
                  course_total: {
                    computed,
                    effective,
                    override: parsedOverride,
                    reason: parsedOverride !== null ? courseOverrideReason : null,
                    source,
                  },
                  course_total_grade: effective,
                }
              : student
          ),
        }
      })

      // Re-sync in background; keep optimistic values if a refresh call fails.
      const [gradebookResult, detailResult] = await Promise.allSettled([
        getClassGradebook(classId),
        getStudentGradebookDetail(classId, selectedStudentDetail.student.id),
      ])

      if (gradebookResult.status === 'fulfilled') {
        setGradebook(gradebookResult.value)
      }
      if (detailResult.status === 'fulfilled') {
        setSelectedStudentDetail(detailResult.value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course total override')
    } finally {
      setSaving(false)
    }
  }

  const teacherStats = useMemo(() => {
    if (!gradebook) {
      return { students: 0, assignments: 0, classAverage: null as number | null }
    }

    const allGrades = gradebook.students.flatMap((student) =>
      student.assignments
        .map((assignment) => assignment.effective_grade)
        .filter((grade): grade is number => grade !== null)
    )

    return {
      students: gradebook.students.length,
      assignments: gradebook.assignment_aggregates.length,
      classAverage:
        allGrades.length > 0 ? Number((allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1)) : null,
    }
  }, [gradebook])

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

  return (
    <div className="flex flex-1 flex-col bg-slate-50/40">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {teacherView ? 'Gradebook & Progress' : 'My Grades'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {teacherView
              ? 'Monitor submissions, evaluations, and grades with instructor controls.'
              : 'Track your assignment and course performance in one place.'}
          </p>
        </div>
        <Button onClick={() => loadAll(false)} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <TabNavigation
        tabs={
          teacherView
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Groups', path: `/classes/${id}/groups` },
                { label: 'Student Submissions', path: `/classes/${id}/student-submissions` },
                { label: 'Grades', path: `/classes/${id}/grades` },
              ]
            : [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Grades', path: `/classes/${id}/grades` },
              ]
        }
      />

      <div className="space-y-5 p-6">
        {error && <p className="text-destructive">{error}</p>}
        {loading && <p className="text-muted-foreground">Loading grades...</p>}

        {!loading && teacherView && gradebook && (
          <>
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

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle>Grading Policy</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="late-penalty">Late Penalty (%)</Label>
                  <Input
                    id="late-penalty"
                    type="number"
                    min={0}
                    max={100}
                    value={latePenalty}
                    onChange={(e) => setLatePenalty(e.target.value)}
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
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSavePolicy} disabled={saving}>
                    Save Penalties
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle>Assignment Averages</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-3 text-left">Assignment</th>
                      <th className="p-3 text-left">Submitted</th>
                      <th className="p-3 text-left">Late</th>
                      <th className="p-3 text-left">Missing</th>
                      <th className="p-3 text-left">Average Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.assignment_aggregates.map((assignment) => (
                      <tr key={assignment.assignment_id} className="border-b last:border-b-0">
                        <td className="p-3 font-medium text-slate-900">
                          <Link
                            to={`/assignments/${assignment.assignment_id}`}
                            className="text-blue-700 hover:underline"
                          >
                            {assignment.assignment_name}
                          </Link>
                        </td>
                        <td className="p-3 text-slate-700">{assignment.submitted_count}</td>
                        <td className="p-3 text-slate-700">{assignment.late_count}</td>
                        <td className="p-3 text-slate-700">{assignment.missing_count}</td>
                        <td className="p-3 font-medium text-slate-900">
                          {assignment.average_grade !== null ? assignment.average_grade.toFixed(1) : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle>Gradebook Matrix</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Course Total</th>
                      {gradebook.assignment_aggregates.map((assignment) => (
                        <th key={assignment.assignment_id} className="p-3 text-left">
                          <Link
                            to={`/assignments/${assignment.assignment_id}`}
                            className="text-blue-700 hover:underline"
                          >
                            {assignment.assignment_name}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.students.map((student) => (
                      <tr key={student.student_id} className="border-b align-top last:border-b-0">
                        <td className="p-3">
                          <button
                            className="font-medium text-blue-700 hover:underline"
                            onClick={() => {
                              setSelectedStudentId(student.student_id)
                              setStudentDialogOpen(true)
                            }}
                          >
                            {student.student_name}
                          </button>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {student.course_total_grade !== null ? student.course_total_grade.toFixed(1) : 'Pending'}
                        </td>
                        {student.assignments.map((assignment) => (
                          <td key={`${student.student_id}-${assignment.assignment_id}`} className="p-3 align-top">
                            <div className="font-medium leading-tight">
                              {assignment.effective_grade !== null ? assignment.effective_grade.toFixed(1) : 'Pending'}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge className={`ring-1 ${submissionBadgeClass(assignment.submission_status)}`}>
                                {assignment.submission_status}
                              </Badge>
                              <Badge className={`ring-1 ${evalBadgeClass(assignment.peer_evaluation.status)}`}>
                                Eval {assignment.peer_evaluation.completed}/{assignment.peer_evaluation.expected}
                              </Badge>
                            </div>
                            {assignment.override_grade !== null && (
                              <div className="mt-1 text-xs font-medium text-amber-700">Override applied</div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !teacherView && myGrade && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  Course Total:{' '}
                  {myGrade.course_total_grade !== null ? myGrade.course_total_grade.toFixed(1) : 'Pending'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Status: {myGrade.status}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Grades</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Assignment</th>
                      <th className="p-2 text-left">Submission</th>
                      <th className="p-2 text-left">Peer Eval Completion</th>
                      <th className="p-2 text-left">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myGrade.assignments.map((assignment: any) => (
                      <tr key={assignment.assignment_id} className="border-b">
                        <td className="p-2">
                          <Link
                            to={`/assignments/${assignment.assignment_id}`}
                            className="text-blue-700 hover:underline"
                          >
                            {assignment.assignment_name}
                          </Link>
                        </td>
                        <td className="p-2">{assignment.submission_status}</td>
                        <td className="p-2">
                          {assignment.peer_evaluation.completed}/{assignment.peer_evaluation.expected}
                        </td>
                        <td className="p-2">
                          {assignment.effective_grade !== null ? assignment.effective_grade.toFixed(1) : 'Pending'}
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

      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStudentDetail ? selectedStudentDetail.student.name : 'Student Detail'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudentDetail
                ? `Course total: ${
                    selectedStudentDetail.course_total_grade !== null
                      ? selectedStudentDetail.course_total_grade.toFixed(1)
                      : 'Pending'
                  }`
                : 'Loading student details...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedStudentDetail && <p className="text-sm text-muted-foreground">Loading student details...</p>}
            {selectedStudentDetail && (
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Course Total Override</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="text-muted-foreground">
                      Computed Total:{' '}
                      <span className="font-medium text-slate-900">
                        {selectedStudentDetail.course_total?.computed !== null &&
                        selectedStudentDetail.course_total?.computed !== undefined
                          ? selectedStudentDetail.course_total.computed.toFixed(1)
                          : 'Pending'}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Effective Total:{' '}
                      <span className="font-medium text-slate-900">
                        {selectedStudentDetail.course_total?.effective !== null &&
                        selectedStudentDetail.course_total?.effective !== undefined
                          ? selectedStudentDetail.course_total.effective.toFixed(1)
                          : 'Pending'}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Source: {selectedStudentDetail.course_total?.source || 'pending'}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="course-override-grade">Override Course Total (0-100)</Label>
                    <Input
                      id="course-override-grade"
                      type="number"
                      min={0}
                      max={100}
                      value={courseOverrideGrade}
                      onChange={(e) => setCourseOverrideGrade(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to clear the course total override.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-override-reason">Reason</Label>
                    <Input
                      id="course-override-reason"
                      value={courseOverrideReason}
                      onChange={(e) => setCourseOverrideReason(e.target.value)}
                      placeholder="Explain why this override is needed"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCourseOverrideGrade('')
                        setCourseOverrideReason('')
                      }}
                      disabled={saving}
                    >
                      Clear Form
                    </Button>
                    <Button onClick={handleSaveCourseTotalOverride} disabled={saving}>
                      Save Course Override
                    </Button>
                  </DialogFooter>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
