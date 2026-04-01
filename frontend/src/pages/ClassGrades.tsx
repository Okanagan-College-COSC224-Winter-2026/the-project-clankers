import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import TabNavigation from '../components/TabNavigation'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  getClassGradebook,
  getMyCourseGrade,
  getStudentGradebookDetail,
  updateClassGradePolicy,
  updateGradeOverride,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [latePenalty, setLatePenalty] = useState('0')
  const [incompletePenalty, setIncompletePenalty] = useState('0')

  const [overrideAssignmentId, setOverrideAssignmentId] = useState<number | null>(null)
  const [overrideStudentId, setOverrideStudentId] = useState<number | null>(null)
  const [overrideGrade, setOverrideGrade] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

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

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      if (teacherView) {
        await loadTeacherData()
      } else {
        await loadStudentData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadAll()
    const interval = setInterval(loadAll, 15000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    if (!selectedStudentId || !teacherView) {
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
  }, [selectedStudentId, classId, teacherView])

  const assignmentNameById = useMemo(() => {
    const map = new Map<number, string>()
    gradebook?.assignment_aggregates.forEach((assignment) => {
      map.set(assignment.assignment_id, assignment.assignment_name)
    })
    return map
  }, [gradebook])

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

  const handleSetOverride = async (studentId: number, assignmentId: number, current: number | null) => {
    setOverrideStudentId(studentId)
    setOverrideAssignmentId(assignmentId)
    setOverrideGrade(current !== null ? String(current) : '')
    setOverrideReason('')
  }

  const handleSaveOverride = async () => {
    if (!overrideStudentId || !overrideAssignmentId) return

    setSaving(true)
    setError(null)
    try {
      await updateGradeOverride(classId, {
        student_id: overrideStudentId,
        assignment_id: overrideAssignmentId,
        override_grade: overrideGrade === '' ? null : Number(overrideGrade),
        reason: overrideReason,
      })
      setOverrideStudentId(null)
      setOverrideAssignmentId(null)
      setOverrideGrade('')
      setOverrideReason('')
      await loadTeacherData()
      if (selectedStudentId) {
        const detail = await getStudentGradebookDetail(classId, selectedStudentId)
        setSelectedStudentDetail(detail)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update override')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <h2 className="text-xl font-semibold">{teacherView ? 'Gradebook & Progress' : 'My Grades'}</h2>
        <Button onClick={loadAll} variant="outline" size="sm">
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

      <div className="space-y-4 p-6">
        {error && <p className="text-destructive">{error}</p>}
        {loading && <p className="text-muted-foreground">Loading grades...</p>}

        {!loading && teacherView && gradebook && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Penalty Safeguards</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Assignment Averages</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Assignment</th>
                      <th className="p-2 text-left">Submitted</th>
                      <th className="p-2 text-left">Late</th>
                      <th className="p-2 text-left">Missing</th>
                      <th className="p-2 text-left">Average Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.assignment_aggregates.map((assignment) => (
                      <tr key={assignment.assignment_id} className="border-b">
                        <td className="p-2">{assignment.assignment_name}</td>
                        <td className="p-2">{assignment.submitted_count}</td>
                        <td className="p-2">{assignment.late_count}</td>
                        <td className="p-2">{assignment.missing_count}</td>
                        <td className="p-2">
                          {assignment.average_grade !== null ? assignment.average_grade.toFixed(1) : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Per-Student Gradebook</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">Course Total</th>
                      {gradebook.assignment_aggregates.map((assignment) => (
                        <th key={assignment.assignment_id} className="p-2 text-left">
                          {assignment.assignment_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.students.map((student) => (
                      <tr key={student.student_id} className="border-b">
                        <td className="p-2">
                          <button
                            className="text-blue-600 underline hover:text-blue-800"
                            onClick={() => setSelectedStudentId(student.student_id)}
                          >
                            {student.student_name}
                          </button>
                        </td>
                        <td className="p-2">
                          {student.course_total_grade !== null ? student.course_total_grade.toFixed(1) : 'Pending'}
                        </td>
                        {student.assignments.map((assignment) => (
                          <td key={`${student.student_id}-${assignment.assignment_id}`} className="p-2 align-top">
                            <div className="font-medium">
                              {assignment.effective_grade !== null ? assignment.effective_grade.toFixed(1) : 'Pending'}
                            </div>
                            <div className="text-xs text-muted-foreground">{assignment.submission_status}</div>
                            <div className="text-xs text-muted-foreground">
                              Eval: {assignment.peer_evaluation.completed}/{assignment.peer_evaluation.expected}
                            </div>
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSetOverride(
                                  student.student_id,
                                  assignment.assignment_id,
                                  assignment.override_grade
                                )
                              }
                            >
                              Override
                            </Button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {overrideStudentId && overrideAssignmentId && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Grade Override</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="override-grade">Override Grade (0-100)</Label>
                    <Input
                      id="override-grade"
                      type="number"
                      min={0}
                      max={100}
                      value={overrideGrade}
                      onChange={(e) => setOverrideGrade(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Clear the field and save to remove an override.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="override-reason">Reason</Label>
                    <Input
                      id="override-reason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder={`Reason for ${assignmentNameById.get(overrideAssignmentId) || 'assignment'}`}
                    />
                  </div>
                  <div className="flex gap-2 md:col-span-3">
                    <Button onClick={handleSaveOverride} disabled={saving}>
                      Save Override
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOverrideStudentId(null)
                        setOverrideAssignmentId(null)
                        setOverrideGrade('')
                        setOverrideReason('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStudentDetail && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedStudentDetail.student.name} Detail
                    {' · '}
                    {selectedStudentDetail.course_total_grade !== null
                      ? selectedStudentDetail.course_total_grade.toFixed(1)
                      : 'Pending'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStudentDetail.assignments.map((assignment) => (
                    <div key={assignment.assignment_id} className="rounded border p-3">
                      <div className="font-semibold">{assignment.assignment_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Submission: {assignment.submission_status}
                        {assignment.submission ? ` (${assignment.submission.filename})` : ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Grade: {assignment.effective_grade !== null ? assignment.effective_grade.toFixed(1) : 'Pending'}
                      </div>
                      <div className="mt-2 text-sm">Received Peer Evaluations</div>
                      {assignment.received_reviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No peer evaluations yet.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {assignment.received_reviews.map((review) => (
                            <li key={review.review_id}>
                              {review.reviewer_name} · {review.review_type} ·{' '}
                              {review.grade !== null ? review.grade.toFixed(1) : 'Pending'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
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
                        <td className="p-2">{assignment.assignment_name}</td>
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
    </div>
  )
}
