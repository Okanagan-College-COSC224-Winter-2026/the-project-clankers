import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronRight, FileSpreadsheet } from 'lucide-react'
import TabNavigation from '../components/TabNavigation'
import RubricCreator from '../components/RubricCreator'
import RubricDisplay from '../components/RubricDisplay'
import { getAssignmentDetails, listClasses } from '../util/api'
import { isTeacher } from '../util/login'

export default function AssignmentRubric() {
  const { id } = useParams()
  const [assignmentName, setAssignmentName] = useState('')
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseName, setCourseName] = useState('')
  const [internalReview, setInternalReview] = useState(false)
  const [externalReview, setExternalReview] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getAssignmentDetails(Number(id))
        setAssignmentName(data.name)
        setInternalReview(data.internal_review || false)
        setExternalReview(data.external_review || false)

        if (data.courseID) {
          setCourseId(data.courseID)
          const classes = await listClasses()
          const cls = classes.find((c: { id: number }) => c.id === data.courseID)
          if (cls) setCourseName(cls.name)
        }
      } catch (error) {
        console.error('Error loading assignment:', error)
      }
    })()
  }, [id])

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 items-center border-b bg-background px-6">
        <nav className="flex items-center gap-1 text-sm">
          {courseId ? (
            <Link to={`/classes/${courseId}/home`} className="text-muted-foreground hover:text-foreground transition-colors">{courseName || '...'}</Link>
          ) : (
            <span className="text-muted-foreground">...</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <Link to={`/assignments/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">{assignmentName || '...'}</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">Rubric</span>
        </nav>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/assignments/${id}` },
                { label: 'Members', path: `/assignments/${id}/members` },
                { label: 'Rubric', path: `/assignments/${id}/rubric` },
                { label: 'Submissions', path: `/assignments/${id}/student-submissions` },
                { label: 'Manage', path: `/assignments/${id}/manage` },
              ]
            : [
                { label: 'Home', path: `/assignments/${id}` },
                { label: 'Members', path: `/assignments/${id}/members` },
                { label: 'Submission', path: `/assignments/${id}/submission` },
                { label: 'Peer Reviews', path: `/assignments/${id}/peer-reviews` },
              ]
        }
      />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <h3 className="text-lg font-medium">Assignment Rubric</h3>
        </div>

        <Card className="p-6">
          <RubricDisplay
            rubricId={Number(id)}
            onCriterionSelect={() => {}}
            grades={[]}
            internalReviewEnabled={internalReview}
            externalReviewEnabled={externalReview}
          />
        </Card>

        {isTeacher() && <RubricCreator id={Number(id)} />}
      </div>
    </div>
  )
}
