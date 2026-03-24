import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
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

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getAssignmentDetails(Number(id))
        setAssignmentName(data.name)

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
      {courseId && (
        <div className="border-b px-6 py-2">
          <Link
            to={`/classes/${courseId}/home`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {courseName || 'Back to class'}
          </Link>
        </div>
      )}

      <div className="border-b bg-background px-6 py-4">
        <h2 className="text-xl font-semibold">{assignmentName || 'Loading...'}</h2>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/assignments/${id}` },
                { label: 'Members', path: `/assignments/${id}/members` },
                { label: 'Groups', path: `/assignments/${id}/groups` },
                { label: 'Rubric', path: `/assignments/${id}/rubric` },
                { label: 'Student Submissions', path: `/assignments/${id}/student-submissions` },
                { label: 'Manage', path: `/assignments/${id}/manage` },
              ]
            : [
                { label: 'Home', path: `/assignments/${id}` },
                { label: 'Members', path: `/assignments/${id}/members` },
                { label: 'Submission', path: `/assignments/${id}/submission` },
              ]
        }
      />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <h3 className="text-lg font-medium">Rubric</h3>
        </div>

        <Card className="p-4">
          <RubricDisplay rubricId={Number(id)} onCriterionSelect={() => {}} grades={[]} />
        </Card>

        {isTeacher() && <RubricCreator id={Number(id)} />}
      </div>
    </div>
  )
}
