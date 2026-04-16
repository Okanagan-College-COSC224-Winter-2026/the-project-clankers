import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users, Loader2, Archive, Eye, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import ClassCard from '../components/ClassCard'
import { listClasses, listAssignments, getArchivedClasses, unarchiveClass, getMyCourseGrade, hideClass, getHiddenClasses, unhideClass } from '../util/api'
import { isTeacher, isAdmin } from '../util/login'
import { Button } from '@/components/ui/button'

interface Course {
  id: number
  name: string
}

interface CourseWithAssignments extends Course {
  assignments: unknown[]
  assignmentCount: number
  student_count: number
  next_due_date: string | null
  pending_reviews_count: number
}

export default function Home() {
  const location = useLocation()
  const [courses, setCourses] = useState<CourseWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchivedModal, setShowArchivedModal] = useState(false)
  const [archivedClasses, setArchivedClasses] = useState<Array<{ id: number; name: string }>>([])
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [showHiddenModal, setShowHiddenModal] = useState(false)
  const [hiddenClasses, setHiddenClasses] = useState<Array<{ id: number; name: string }>>([])
  const [loadingHidden, setLoadingHidden] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const coursesResp = await listClasses()

      const coursesWithAssignments = await Promise.all(
        coursesResp.map(async (course: CourseWithAssignments) => {
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
        coursesResp.map(async (course: CourseWithAssignments) => {
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
          } catch {
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

  const handleOpenHidden = async () => {
    setShowHiddenModal(true)
    setLoadingHidden(true)
    try {
      const hidden = await getHiddenClasses()
      setHiddenClasses(hidden)
    } catch (error) {
      console.error('Error fetching hidden classes:', error)
    } finally {
      setLoadingHidden(false)
    }
  }

  const handleHideClass = async (classId: number) => {
    try {
      await hideClass(classId)
      // Remove from visible courses and reload
      fetchCourses()
    } catch (error) {
      console.error('Error hiding class:', error)
    }
  }

  const handleRestoreHiddenClass = async (classId: number) => {
    try {
      await unhideClass(classId)
      // Remove from hidden list
      setHiddenClasses(hiddenClasses.filter(c => c.id !== classId))
      // Reload active courses
      fetchCourses()
    } catch (error) {
      console.error('Error restoring hidden class:', error)
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-48 pl-8 text-sm"
            />
          </div>
          {!isTeacher() && !isAdmin() && (
            <Button onClick={handleOpenHidden} variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              All Classes
            </Button>
          )}
          {(isTeacher() || isAdmin()) && (
            <Button onClick={handleOpenArchived} variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" />
              Archived Classes
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 p-6">

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(() => {
          const filtered = courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
          return filtered.length === 0 && !isTeacher() ? (
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
          filtered.map((course) => {
            const assignmentText = `${course.assignmentCount || 0} assignments`

            return (
              <ClassCard
                key={course.id}
                image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                name={course.name}
                subtitle={assignmentText}
                action={
                  !isTeacher() && !isAdmin() ? (
                    <div className="w-full flex flex-col gap-2">
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
                      <Button
                        onClick={() => handleHideClass(course.id)}
                        variant="outline"
                        size="xs"
                      >
                        Remove from View
                      </Button>
                    </div>
                  ) : undefined
                }
                studentCount={course.student_count}
                nextDueDate={course.next_due_date}
                pendingReviews={course.pending_reviews_count}
                classId={course.id}
                onclick={() => {
                  window.location.href = `/classes/${course.id}/home`
                }}
              />
            )
          })
        )
        })()}

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

      {showHiddenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-4xl w-full rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">All Classes</h2>
              <button
                onClick={() => setShowHiddenModal(false)}
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

            {loadingHidden ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hiddenClasses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Eye className="mx-auto mb-4 h-12 w-12" />
                <p>All your classes are visible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hiddenClasses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <h3 className="font-semibold">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.assignments_count} assignment(s)
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRestoreHiddenClass(course.id)}
                      variant="outline"
                      size="sm"
                    >
                      Add to View
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
