import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Check, AlertTriangle, Info, UserPlus } from 'lucide-react'

interface NewStudent {
  email: string
  student_id: string
  temp_password: string
}

interface ExistingStudent {
  email: string
  student_id: string
  name: string
}

interface Props {
  enrolledCount: number
  createdCount: number
  existingCount?: number
  newStudents?: NewStudent[]
  enrolledExistingStudents?: ExistingStudent[]
  existingStudents?: ExistingStudent[]
  onClose: () => void
}

export default function RosterUploadResult(props: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyAll = () => {
    if (!props.newStudents || props.newStudents.length === 0) return

    const text = props.newStudents
      .map((s) => `${s.email} - Password: ${s.temp_password}`)
      .join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadCSV = () => {
    if (!props.newStudents || props.newStudents.length === 0) return

    const csv = [
      'Student ID,Email,Temporary Password',
      ...props.newStudents.map((s) => `${s.student_id},${s.email},${s.temp_password}`),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student-credentials-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90vh] max-w-6xl sm:max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Roster Upload Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Section */}
          <div className="space-y-2">
            {props.enrolledCount === 0 &&
              props.createdCount === 0 &&
              (props.existingCount ?? 0) > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Info className="h-4 w-4" />
                  <span>No changes made - all students were already enrolled in this course</span>
                </div>
              )}

            {props.enrolledCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>{props.enrolledCount} student(s) enrolled in this course</span>
                </div>

                {props.createdCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{props.createdCount} new</Badge>
                    <span>student account(s) created</span>
                  </div>
                )}

                {props.createdCount === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>All students had existing accounts - no new accounts created</span>
                  </div>
                )}
              </div>
            )}

            {(props.existingCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>{props.existingCount} student(s) were already enrolled (skipped)</span>
              </div>
            )}
          </div>

          {/* New Students with Passwords */}
          {props.newStudents && props.newStudents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  <strong>Important:</strong> Save these temporary passwords now. They will not be
                  shown again.
                </span>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCopyAll} size="sm">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All
                    </>
                  )}
                </Button>
                <Button onClick={handleDownloadCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Student ID</th>
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                      <th className="px-4 py-2 text-left font-medium">Temporary Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.newStudents.map((student, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">{student.student_id}</td>
                        <td className="px-4 py-2">{student.email}</td>
                        <td className="px-4 py-2 font-mono text-xs">{student.temp_password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enrolled Existing Students */}
          {props.enrolledExistingStudents && props.enrolledExistingStudents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Existing Students Enrolled</h3>
              <p className="text-xs text-muted-foreground">
                These students already had accounts and have been enrolled in this course.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Student ID</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.enrolledExistingStudents.map((student, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">{student.student_id}</td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Already Enrolled Students */}
          {props.existingStudents && props.existingStudents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Students Already Enrolled</h3>
              <p className="text-xs text-muted-foreground">
                These students were already enrolled in this course.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Student ID</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.existingStudents.map((student, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">{student.student_id}</td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
