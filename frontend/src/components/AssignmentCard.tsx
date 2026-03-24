import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { getStudentSubmissions, listCourseMembers } from '../util/api'
import { isTeacher } from '../util/login'
import { cn } from '@/lib/utils'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  id: number | string
  dueDate?: string | null
  classId?: number | string
}

type Status = 'In Progress' | 'Overdue' | 'Complete' | 'Submitted' | 'Submitted Late' | null

export default function AssignmentCard(props: Props) {
  const [status, setStatus] = useState<Status>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const calculateStatus = async () => {
      try {
        const submissionsData = await getStudentSubmissions(Number(props.id))

        if (isTeacher() && props.classId) {
          const classMembersData = await listCourseMembers(String(props.classId))
          const students = (classMembersData || []).filter(
            (member: { role: string }) => member.role === 'student'
          )

          const submittedStudentIds = new Set(
            submissionsData.map((sub: { student_id: number }) => sub.student_id)
          )
          const allStudentsSubmitted =
            students.length > 0 &&
            students.every((student: { id: number }) => submittedStudentIds.has(student.id))

          if (allStudentsSubmitted) {
            setStatus('Complete')
          } else if (props.dueDate) {
            const isPastDue = new Date(props.dueDate) < new Date()
            setStatus(isPastDue ? 'Overdue' : 'In Progress')
          } else {
            setStatus('In Progress')
          }
        } else {
          if (submissionsData.length > 0) {
            const submission = submissionsData[0]
            if (props.dueDate) {
              const submittedAt = new Date(submission.submitted_at)
              const dueDate = new Date(props.dueDate)
              setStatus(submittedAt <= dueDate ? 'Submitted' : 'Submitted Late')
            } else {
              setStatus('Submitted')
            }
          } else {
            if (props.dueDate) {
              const isPastDue = new Date(props.dueDate) < new Date()
              setStatus(isPastDue ? 'Overdue' : null)
            } else {
              setStatus(null)
            }
          }
        }
      } catch (error) {
        console.error('Error calculating assignment status:', error)
        if (props.dueDate) {
          const isPastDue = new Date(props.dueDate) < new Date()
          setStatus(isPastDue ? 'Overdue' : 'In Progress')
        } else {
          setStatus('In Progress')
        }
      } finally {
        setIsLoading(false)
      }
    }

    calculateStatus()
  }, [props.id, props.classId, props.dueDate])

  const getBadgeVariant = () => {
    if (status === 'Complete' || status === 'Submitted') return 'default'
    if (status === 'Submitted Late') return 'secondary'
    if (status === 'Overdue') return 'destructive'
    return 'outline'
  }

  const getBadgeText = () => {
    if (isLoading) return 'Loading...'
    if (status) return status
    return props.dueDate ? `Due: ${new Date(props.dueDate).toLocaleDateString()}` : ''
  }

  return (
    <Card
      onClick={() => (window.location.href = `/assignments/${props.id}`)}
      className="flex cursor-pointer items-center gap-4 p-4 transition-all hover:bg-accent"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      <span className="flex-1 font-medium">{props.children}</span>

      {(props.dueDate || status) && (
        <Badge
          variant={getBadgeVariant()}
          className={cn(
            status === 'Complete' || status === 'Submitted'
              ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300'
              : '',
            status === 'Submitted Late'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
              : ''
          )}
        >
          {getBadgeText()}
        </Badge>
      )}
    </Card>
  )
}
