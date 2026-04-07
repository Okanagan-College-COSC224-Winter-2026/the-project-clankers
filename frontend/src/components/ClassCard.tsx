import { Card, CardContent } from '@/components/ui/card'
import { ReactNode } from 'react'
import { Users, AlertCircle, Calendar } from 'lucide-react'

interface Props {
  image: string
  name: string
  subtitle: string
  onclick?: () => void
  action?: ReactNode
  studentCount?: number
  nextDueDate?: string | null
  pendingReviews?: number
}

export default function ClassCard(props: Props) {
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

  // Generate a color based on course name (for visual differentiation)
  const getCardColor = (name: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-green-400 to-green-600',
      'from-amber-400 to-amber-600',
      'from-indigo-400 to-indigo-600',
      'from-rose-400 to-rose-600',
      'from-cyan-400 to-cyan-600',
    ]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const cardGradient = getCardColor(props.name)
  const pendingCount = props.pendingReviews || 0
  const hasPendingReviews = pendingCount > 0

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col h-full"
      onClick={props.onclick}
    >
      {/* Gradient header instead of image */}
      <div className={`aspect-video overflow-hidden bg-gradient-to-br ${cardGradient} flex items-center justify-center p-4`}>
        <div className="text-white text-center">
          <h3 className="text-sm font-semibold opacity-90">Academic Dashboard</h3>
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-lg truncate mb-1">{props.name}</h2>
          <p className="text-sm text-muted-foreground truncate mb-4">{props.subtitle}</p>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3 text-sm">
          {/* Student Count */}
          {props.studentCount !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
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
          {props.pendingReviews !== undefined && (
            <div className={`flex items-center gap-2 transition-colors ${
              hasPendingReviews 
                ? 'text-amber-600 hover:text-amber-700' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
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
