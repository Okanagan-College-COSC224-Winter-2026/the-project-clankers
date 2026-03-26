import { useParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Upload, Users } from 'lucide-react'
import TabNavigation from '../components/TabNavigation'
import RosterUploadResult from '../components/RosterUploadResult'
import ErrorModal from '../components/ErrorModal'
import { importCSV } from '../util/csv'
import { listCourseMembers, listClasses, getProfilePictureUrl } from '../util/api'
import { isTeacher } from '../util/login'

interface User {
  id: number
  name: string
  email: string
  role: string
  student_id?: string
  profile_picture_url?: string
}

interface RosterUploadResultData {
  message: string
  enrolled_count: number
  created_count: number
  existing_count?: number
  new_students?: Array<{
    email: string
    student_id: string
    temp_password: string
  }>
  enrolled_existing_students?: Array<{
    email: string
    student_id: string
    name: string
  }>
  existing_students?: Array<{
    email: string
    student_id: string
    name: string
  }>
}

const roleColors = {
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  student: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function ClassMembers() {
  const { id } = useParams()
  const [members, setMembers] = useState<User[]>([])
  const [className, setClassName] = useState<string | null>(null)
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null)
  const [isUploadingRoster, setIsUploadingRoster] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<Map<number, string>>(new Map())

  const loadMembers = useCallback(async () => {
    const members = await listCourseMembers(id as string)
    const classes = await listClasses()
    const currentClass = classes.find((c: { id: number }) => c.id === Number(id))
    setMembers(members)
    setClassName(currentClass?.name || null)

    try {
      const groupsResp = await fetch(`http://localhost:5000/classes/${id}/groups`, {
        credentials: 'include',
      })
      if (groupsResp.ok) {
        const groups = await groupsResp.json()
        const mapping = new Map<number, string>()

        for (const group of groups) {
          const membersResp = await fetch(
            `http://localhost:5000/classes/${id}/groups/${group.id}/members`,
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
  }, [id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleRosterUpload = () => {
    if (isUploadingRoster) return

    setIsUploadingRoster(true)
    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false)
        setRosterResult(result)
        loadMembers()
      },
      (error) => {
        setIsUploadingRoster(false)
        const errorMessage = error instanceof Error ? error.message : String(error)
        setUploadError(errorMessage)
      },
      () => {
        setIsUploadingRoster(false)
      }
    )
  }

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
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <h2 className="text-xl font-semibold">{className}</h2>
        {isTeacher() && (
          <Button onClick={handleRosterUpload} disabled={isUploadingRoster} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
          </Button>
        )}
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Groups', path: `/classes/${id}/groups` },
                { label: 'Student Submissions', path: `/classes/${id}/student-submissions` },
              ]
            : [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
              ]
        }
      />

      {rosterResult && (
        <RosterUploadResult
          enrolledCount={rosterResult.enrolled_count}
          createdCount={rosterResult.created_count}
          existingCount={rosterResult.existing_count}
          newStudents={rosterResult.new_students}
          enrolledExistingStudents={rosterResult.enrolled_existing_students}
          existingStudents={rosterResult.existing_students}
          onClose={() => setRosterResult(null)}
        />
      )}

      <div className="flex-1 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-medium">Class Members</h3>
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

      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
    </div>
  )
}
