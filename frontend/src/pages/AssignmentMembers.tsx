import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users } from 'lucide-react'
import TabNavigation from '../components/TabNavigation'
import { listCourseMembers, getAssignmentDetails, listClasses, getProfilePictureUrl } from '../util/api'
import { isTeacher } from '../util/login'

interface User {
  id: number
  name: string
  email: string
  role: string
  student_id?: string
  profile_picture_url?: string
}

const roleColors = {
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  student: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function AssignmentMembers() {
  const { id } = useParams()
  const [members, setMembers] = useState<User[]>([])
  const [assignmentName, setAssignmentName] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<Map<number, string>>(new Map())
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseName, setCourseName] = useState<string>('')

  const loadMembers = useCallback(async () => {
    try {
      const assignmentData = await getAssignmentDetails(Number(id))
      if (assignmentData) {
        setAssignmentName(assignmentData.name || null)

        if (assignmentData.courseID) {
          setCourseId(assignmentData.courseID)
          try {
            const classes = await listClasses()
            const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID)
            if (course) setCourseName(course.name)
          } catch (e) {
            console.error(e)
          }
          const courseMembers = await listCourseMembers(String(assignmentData.courseID))
          setMembers(courseMembers)

          try {
            const groupsResp = await fetch(
              `http://localhost:5000/classes/${assignmentData.courseID}/groups`,
              { credentials: 'include' }
            )
            if (groupsResp.ok) {
              const groups = await groupsResp.json()
              const mapping = new Map<number, string>()

              for (const group of groups) {
                const membersResp = await fetch(
                  `http://localhost:5000/classes/${assignmentData.courseID}/groups/${group.id}/members`,
                  { credentials: 'include' }
                )
                if (membersResp.ok) {
                  const groupMembers = await membersResp.json()
                  groupMembers.forEach((member: User) => {
                    mapping.set(member.id, group.name)
                  })
                }
              }
              setUserGroups(mapping)
            }
          } catch (error) {
            console.error('Error loading groups:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }, [id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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

      <div className="flex-1 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-medium">Assignment Members</h3>
          <Badge variant="secondary">{members.length}</Badge>
        </div>

        {members.length === 0 ? (
          <p className="text-muted-foreground">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const groupName = userGroups.get(member.id)

              return (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage
                        src={getProfilePictureUrl(member.profile_picture_url)}
                        alt={member.name}
                      />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <Badge
                          className={
                            roleColors[member.role as keyof typeof roleColors] ||
                            'bg-gray-100 text-gray-700'
                          }
                        >
                          {member.role}
                        </Badge>
                        {groupName && <Badge variant="outline">Group: {groupName}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                        {member.student_id && <span> | ID: {member.student_id}</span>}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
