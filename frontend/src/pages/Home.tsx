import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users, Loader2 } from 'lucide-react'
import ClassCard from '../components/ClassCard'
import { listClasses, listAssignments } from '../util/api'
import { isTeacher, isAdmin } from '../util/login'

interface Course {
  id: number
  name: string
}

interface CourseWithAssignments extends Course {
  assignments: unknown[]
  assignmentCount: number
}

export default function Home() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const coursesResp = await listClasses()

        const coursesWithAssignments = await Promise.all(
          coursesResp.map(async (course: Course) => {
            try {
              const assignments = await listAssignments(String(course.id))
              return {
                ...course,
                assignments: assignments || [],
                assignmentCount: assignments?.length || 0,
              }
            } catch (error) {
              console.error(`Error fetching assignments for course ${course.id}:`, error)
              return {
                ...course,
                assignments: [],
                assignmentCount: 0,
              }
            }
          })
        )

        setCourses(coursesWithAssignments)
      } catch (error) {
        console.error('Error fetching courses:', error)
        setError('Failed to load courses. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <h1 className="mb-6 text-3xl font-bold">Peer Review Dashboard</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading courses...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <h1 className="mb-6 text-3xl font-bold">Peer Review Dashboard</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="mb-6 text-3xl font-bold">Peer Review Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.length === 0 && !isTeacher() ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">No courses yet</h2>
              <p className="text-muted-foreground">
                Contact your instructor to get enrolled in courses.
              </p>
            </CardContent>
          </Card>
        ) : (
          courses.map((course) => {
            const assignmentText = `${course.assignmentCount || 0} assignments`

            return (
              <ClassCard
                key={course.id}
                image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                name={course.name}
                subtitle={assignmentText}
                onclick={() => {
                  window.location.href = `/classes/${course.id}/home`
                }}
              />
            )
          })
        )}

        {isTeacher() && (
          <Card
            className="flex cursor-pointer items-center justify-center border-2 border-dashed transition-colors hover:border-primary hover:bg-accent"
            onClick={() => (window.location.href = '/classes/create')}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="font-medium">Create Class</span>
            </CardContent>
          </Card>
        )}

        {isAdmin() && (
          <Card
            className="flex cursor-pointer items-center justify-center border-2 border-dashed transition-colors hover:border-primary hover:bg-accent"
            onClick={() => (window.location.href = '/admin/create-teacher')}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="font-medium">Create Teacher</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
