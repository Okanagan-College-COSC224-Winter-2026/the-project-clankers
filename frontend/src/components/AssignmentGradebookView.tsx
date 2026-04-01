import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAssignmentGradebook, type AssignmentGradebookData } from '../util/api'

interface Props {
  assignmentId: number
}

export default function AssignmentGradebookView({ assignmentId }: Props) {
  const [data, setData] = useState<AssignmentGradebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getAssignmentGradebook(assignmentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment gradebook')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [assignmentId])

  const submissionBadge = (status: string) => {
    if (status === 'submitted') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    if (status === 'submitted late') return 'bg-amber-50 text-amber-700 ring-amber-200'
    return 'bg-slate-50 text-slate-600 ring-slate-200'
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading assignment gradebook...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">No gradebook data.</div>
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assignment Grades</h3>
        <Button size="sm" variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.aggregate.submitted_count}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Late</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.aggregate.late_count}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Missing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.aggregate.missing_count}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Average Grade</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data.aggregate.average_grade !== null ? data.aggregate.average_grade.toFixed(1) : 'Pending'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3 text-left">Student</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Peer Eval</th>
                <th className="p-3 text-left">Computed</th>
                <th className="p-3 text-left">Effective</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.student_id} className="border-b">
                  <td className="p-3">
                    <Link to={`/profile/${student.student_id}`} className="font-medium text-blue-700 hover:underline">
                      {student.student_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </td>
                  <td className="p-3">
                    <Badge className={`ring-1 ${submissionBadge(student.entry.submission_status)}`}>
                      {student.entry.submission_status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {student.entry.peer_evaluation.completed}/{student.entry.peer_evaluation.expected}
                  </td>
                  <td className="p-3">{student.entry.computed_grade !== null ? student.entry.computed_grade.toFixed(1) : 'Pending'}</td>
                  <td className="p-3 font-semibold">
                    {student.entry.effective_grade !== null ? student.entry.effective_grade.toFixed(1) : 'Pending'}
                    {student.entry.override_grade !== null && (
                      <span className="ml-2 text-xs text-amber-700">override</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
