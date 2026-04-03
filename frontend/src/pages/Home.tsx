import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users, Loader2, Archive } from 'lucide-react'
import ClassCard from '../components/ClassCard'
import { listClasses, listAssignments, getArchivedClasses, unarchiveClass, getMyCourseGrade } from '../util/api'
import { isTeacher, isAdmin } from '../util/login'
import { Button } from '@/components/ui/button'

interface Course {
  id: number
  name: string
}

interface CourseWithAssignments extends Course {
  assignments: unknown[]
  assignmentCount: number
  courseTotalGrade?: number | null
  gradeStatus?: string
}

export default function Home() {
  const location = useLocation()
  const [courses, setCourses] = useState<CourseWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchivedModal, setShowArchivedModal] = useState(false)
  const [archivedClasses, setArchivedClasses] = useState<any[]>([])
  const [loadingArchived, setLoadingArchived] = useState(false)

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const coursesResp = await listClasses()

      const coursesWithAssignments = await Promise.all(
        coursesResp.map(async (course: Course) => {
          try {
            const assignments = await listAssignments(String(course.id))
            let courseTotalGrade: number | null = null
            let gradeStatus = 'pending evaluations'

            if (!isTeacher() && !isAdmin()) {
              try {
                const gradeData = await getMyCourseGrade(course.id)
                courseTotalGrade = gradeData.course_total_grade
                gradeStatus = gradeData.status
              } catch {
                courseTotalGrade = null
                gradeStatus = 'grade unavailable'
              }
            }

            return {
              ...course,
              assignments: assignments || [],
              assignmentCount: assignments?.length || 0,
              courseTotalGrade,
              gradeStatus,
            }
          } catch (error) {
            console.error(`Error fetching assignments for course ${course.id}:`, error)
            return {
              ...course,
              assignments: [],
              assignmentCount: 0,
              courseTotalGrade: null,
              gradeStatus: 'grade unavailable',
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
  }

  useEffect(() => {
    fetchCourses()
  }, [location.pathname])

  const handleOpenArchived = async () => {
    setShowArchivedModal(true)
    setLoadingArchived(true)
    try {
      const archived = await getArchivedClasses()
      setArchivedClasses(archived)
    } catch (error) {
      console.error('Error fetching archived classes:', error)
    } finally {
      setLoadingArchived(false)
    }
  }

  const handleRestoreClass = async (classId: number) => {
    try {
      await unarchiveClass(classId)
      // Remove from archived list
      setArchivedClasses(archivedClasses.filter(c => c.id !== classId))
      // Reload active courses
      const coursesResp = await listClasses()
      const coursesWithAssignments = await Promise.all(
        coursesResp.map(async (course: Course) => {
          try {
            const assignments = await listAssignments(String(course.id))
              let courseTotalGrade: number | null = null
              let gradeStatus = 'pending evaluations'

              if (!isTeacher() && !isAdmin()) {
                try {
                  const gradeData = await getMyCourseGrade(course.id)
                  courseTotalGrade = gradeData.course_total_grade
                  gradeStatus = gradeData.status
                } catch {
                  courseTotalGrade = null
                  gradeStatus = 'grade unavailable'
                }
              }

            return {
              ...course,
              assignments: assignments || [],
              assignmentCount: assignments?.length || 0,
                courseTotalGrade,
                gradeStatus,
            }
          } catch (error) {
            return {
              ...course,
              assignments: [],
              assignmentCount: 0,
                courseTotalGrade: null,
                gradeStatus: 'grade unavailable',
            }
          }
        })
      )
      setCourses(coursesWithAssignments)
    } catch (error) {
      console.error('Error restoring class:', error)
    }
  }

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
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 items-center justify-between border-b bg-background px-6">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        {(isTeacher() || isAdmin()) && (
          <Button onClick={handleOpenArchived} variant="outline" size="sm">
            <Archive className="mr-2 h-4 w-4" />
            Archived Classes
          </Button>
        )}
      </div>
      <div className="flex-1 p-6">

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
                action={
                  !isTeacher() && !isAdmin() ? (
                    <details className="w-full rounded-md border px-2 py-1 text-xs">
                      <summary className="cursor-pointer font-medium">View Course Total</summary>
                      <p className="mt-1 font-medium">
                        Course Grade:{' '}
                        {course.courseTotalGrade !== null && course.courseTotalGrade !== undefined
                          ? course.courseTotalGrade.toFixed(1)
                          : 'Pending'}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {course.gradeStatus || 'pending evaluations'}
                      </p>
                    </details>
                  ) : undefined
                }
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

      {showArchivedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-4xl w-full rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Archived Classes</h2>
              <button
                onClick={() => setShowArchivedModal(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {loadingArchived ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : archivedClasses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Archive className="mx-auto mb-4 h-12 w-12" />
                <p>No archived classes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedClasses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <h3 className="font-semibold">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.assignments_count} assignment(s) • {course.student_count} student(s)
                        {isAdmin() && course.teacher && (
                          <> • Teacher: {course.teacher.name}</>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRestoreClass(course.id)}
                      variant="outline"
                      size="sm"
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
