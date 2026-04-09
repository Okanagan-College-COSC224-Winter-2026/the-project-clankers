import { Card, CardContent } from '@/components/ui/card'
import { ReactNode } from 'react'
import { Users, AlertCircle, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isTeacher } from '@/util/login'

interface Props {
  image: string
  name: string
  subtitle: string
  onclick?: () => void
  action?: ReactNode
  studentCount?: number
  nextDueDate?: string | null
  pendingReviews?: number
  classId?: number
}

export default function ClassCard(props: Props) {
  const navigate = useNavigate()

  // Parse and format the next due date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No upcoming deadlines'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const pendingCount = props.pendingReviews || 0
  const hasPendingReviews = pendingCount > 0

  const handleStudentCountClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.classId) {
      navigate(`/classes/${props.classId}/members`)
    }
  }

  const handlePendingReviewsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.classId) {
      navigate(`/classes/${props.classId}/student-submissions`)
    }
  }

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col h-full"
      onClick={props.onclick}
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={props.image}
          alt={props.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-lg truncate mb-1">{props.name}</h2>
          <p className="text-sm text-muted-foreground truncate mb-4">{props.subtitle}</p>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-2 text-sm">
          {/* Student Count */}
          {props.studentCount !== undefined && (
            <div 
              onClick={handleStudentCountClick}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>{props.studentCount} {props.studentCount === 1 ? 'student' : 'students'}</span>
            </div>
          )}

          {/* Next Due Date */}
          {props.nextDueDate !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatDate(props.nextDueDate)}</span>
            </div>
          )}

          {/* Pending Reviews */}
          {props.pendingReviews !== undefined && isTeacher() && (
            <div 
              onClick={handlePendingReviewsClick}
              className={`flex items-center gap-2 transition-colors cursor-pointer ${
                hasPendingReviews 
                  ? 'text-amber-600 hover:text-amber-700' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {pendingCount === 0 
                  ? 'All reviews complete' 
                  : `${pendingCount} pending review${pendingCount === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
        </div>

        {props.action && (
          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {props.action}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
