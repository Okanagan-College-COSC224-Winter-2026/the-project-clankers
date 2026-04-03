import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Upload, Users, UserPlus, ClipboardList, Search, Trash2, Check, X, LayoutList, ChevronRight } from 'lucide-react'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import ConfirmDialog from '../components/ConfirmDialog'
import RosterUploadResult from '../components/RosterUploadResult'
import ErrorModal from '../components/ErrorModal'
import { importCSV } from '../util/csv'
import {
  listCourseMembers,
  listClasses,
  getProfilePictureUrl,
  getRegisteredStudentsForCourse,
  enrollDirectStudents,
  unenrollStudent,
  getCourseEnrollmentRequests,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
} from '../util/api'
import { isTeacher } from '../util/login'

interface Member {
  id: number
  name: string
  email: string
  role: string
  student_id?: string
  profile_picture_url?: string
}

interface RegisteredStudent {
  id: number
  name: string
  email: string
  student_id?: string
}

interface EnrollmentRequest {
  id: number
  studentID: number
  courseID: number
  status: string
  created_at: string
  teacher_notes?: string
  student?: { id: number; name: string; email: string; student_id?: string }
}

interface RosterUploadResultData {
  message: string
  enrolled_count: number
  created_count: number
  existing_count?: number
  new_students?: Array<{ email: string; student_id: string; temp_password: string }>
  enrolled_existing_students?: Array<{ email: string; student_id: string; name: string }>
  existing_students?: Array<{ email: string; student_id: string; name: string }>
}

type EnrollTab = 'csv' | 'registered' | 'requests'

interface CourseGroup {
  id: number
  name: string
  courseID: number
  member_count?: number
}

const roleColors = {
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  student: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function ClassMembers() {
  const { id } = useParams()

  // — Members list state —
  const [members, setMembers] = useState<Member[]>([])
  const [className, setClassName] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<Map<number, string>>(new Map())

  // — CSV upload state —
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null)
  const [isUploadingRoster, setIsUploadingRoster] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // — Enrollment management panel —
  const [showEnrollPanel, setShowEnrollPanel] = useState(false)
  const [enrollTab, setEnrollTab] = useState<EnrollTab>('csv')

  // — Add registered students state —
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([])
  const [registeredSearch, setRegisteredSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isLoadingRegistered, setIsLoadingRegistered] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)

  // — Join requests state —
  const [joinRequests, setJoinRequests] = useState<EnrollmentRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  // — Remove student state —
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // — Panel order tracking —
  const [lastOpenedPanel, setLastOpenedPanel] = useState<'group' | 'enroll' | null>(null)

  // — Group management panel —
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<Member[]>([])
  const [groupMembersMap, setGroupMembersMap] = useState<Map<number, Member[]>>(new Map())
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [groupStatusMsg, setGroupStatusMsg] = useState('')
  const [groupStatusType, setGroupStatusType] = useState<'success' | 'error'>('success')
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const isCreatingGroup = useRef(false)
  const groupStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: () => void
  } | null>(null)

  // — Status messages —
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setErrorMsg(null)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setSuccessMsg(null)
  }

  // — Load members + groups —
  const loadMembers = useCallback(async () => {
    const membersData = await listCourseMembers(id as string)
    const classes = await listClasses()
    const currentClass = classes.find((c: { id: number }) => c.id === Number(id))
    setMembers(membersData)
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
            groupMembers.forEach((m: Member) => mapping.set(m.id, group.name))
          }
        }
        setUserGroups(mapping)
      }
    } catch {
      // groups are best-effort
    }
  }, [id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // — Load join requests for this course —
  const loadJoinRequests = useCallback(async () => {
    if (!id) return
    setIsLoadingRequests(true)
    try {
      const data = await getCourseEnrollmentRequests(id)
      setJoinRequests(data)
    } catch {
      // silently ignore
    } finally {
      setIsLoadingRequests(false)
    }
  }, [id])

  // — Load registered students not in this course —
  const loadRegisteredStudents = useCallback(async (search = '') => {
    if (!id) return
    setIsLoadingRegistered(true)
    try {
      const data = await getRegisteredStudentsForCourse(id, search)
      setRegisteredStudents(data)
    } catch {
      // silently ignore
    } finally {
      setIsLoadingRegistered(false)
    }
  }, [id])

  // When the panel opens, fetch join requests count for badge
  useEffect(() => {
    if (isTeacher()) {
      loadJoinRequests()
    }
  }, [loadJoinRequests])

  // When tab changes, load the relevant data
  useEffect(() => {
    if (!showEnrollPanel) return
    if (enrollTab === 'registered') {
      loadRegisteredStudents(registeredSearch)
    } else if (enrollTab === 'requests') {
      loadJoinRequests()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollTab, showEnrollPanel])

  // CSV upload
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
        setUploadError(error instanceof Error ? error.message : String(error))
      },
      () => setIsUploadingRoster(false)
    )
  }

  // Direct-enroll selected registered students
  const handleEnrollSelected = async () => {
    if (selectedIds.size === 0) return
    setIsEnrolling(true)
    setErrorMsg(null)
    try {
      const result = await enrollDirectStudents(id as string, Array.from(selectedIds))
      setSelectedIds(new Set())
      await loadMembers()
      await loadRegisteredStudents(registeredSearch)
      showSuccess(
        `Enrolled ${result.enrolled_count} student(s)` +
        (result.already_enrolled_count > 0
          ? `, ${result.already_enrolled_count} already enrolled`
          : '')
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to enroll students')
    } finally {
      setIsEnrolling(false)
    }
  }

  // Approve join request
  const handleApprove = async (requestId: number) => {
    try {
      await approveEnrollmentRequest(requestId)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      await loadMembers()
      showSuccess('Enrollment request approved')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to approve request')
    }
  }

  // Reject join request
  const handleReject = async (requestId: number) => {
    try {
      await rejectEnrollmentRequest(requestId, rejectNotes)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      setRejectingId(null)
      setRejectNotes('')
      showSuccess('Enrollment request declined')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  // Remove (unenroll) student
  const handleRemoveStudent = async () => {
    if (!removeTarget) return
    setIsRemoving(true)
    try {
      await unenrollStudent(id as string, removeTarget.id)
      setRemoveTarget(null)
      await loadMembers()
      showSuccess(`${removeTarget.name} has been removed from the course`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove student')
    } finally {
      setIsRemoving(false)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const toggleSelect = (sid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(sid) ? next.delete(sid) : next.add(sid)
      return next
    })
  }

  // ── Group management ───────────────────────────────────────────────────────

  const showGroupStatus = (msg: string, type: 'success' | 'error') => {
    if (groupStatusTimerRef.current) clearTimeout(groupStatusTimerRef.current)
    setGroupStatusMsg('')
    setTimeout(() => { setGroupStatusMsg(msg); setGroupStatusType(type) }, 0)
    groupStatusTimerRef.current = setTimeout(() => setGroupStatusMsg(''), 4100)
  }

  const loadGroupData = useCallback(async () => {
    if (!id) return
    setIsLoadingGroups(true)
    try {
      const [groupsResp, membersData] = await Promise.all([
        fetch(`http://localhost:5000/classes/${id}/groups`, { credentials: 'include' }),
        listCourseMembers(id),
      ])
      if (!groupsResp.ok) return
      const groupsData: CourseGroup[] = await groupsResp.json()
      setCourseGroups(groupsData)

      const newMap = new Map<number, Member[]>()
      const assignedIds = new Set<number>()
      for (const group of groupsData) {
        const r = await fetch(`http://localhost:5000/classes/${id}/groups/${group.id}/members`, {
          credentials: 'include',
        })
        if (r.ok) {
          const gm: Member[] = await r.json()
          newMap.set(group.id, gm)
          gm.forEach((m) => assignedIds.add(m.id))
        }
      }
      setGroupMembersMap(newMap)
      const students = membersData.filter(
        (m: Member) => m.role === 'student' && !assignedIds.has(m.id)
      )
      setUnassignedStudents(students)
    } catch {
      showGroupStatus('Error loading groups', 'error')
    } finally {
      setIsLoadingGroups(false)
    }
  }, [id])

  // Load group data when panel opens
  useEffect(() => {
    if (showGroupPanel) loadGroupData()
  }, [showGroupPanel, loadGroupData])

  const createGroup = async () => {
    if (isCreatingGroup.current) return
    if (!newGroupName.trim()) { showGroupStatus('Group name cannot be empty', 'error'); return }
    if (courseGroups.some((g) => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      showGroupStatus('A group with that name already exists', 'error'); return
    }
    isCreatingGroup.current = true
    try {
      const r = await fetch(`http://localhost:5000/classes/${id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newGroupName }),
      })
      if (r.ok) {
        setNewGroupName('')
        await loadGroupData()
        showGroupStatus('Group created successfully', 'success')
      } else {
        const err = await r.json()
        showGroupStatus(err.msg || 'Failed to create group', 'error')
      }
    } catch { showGroupStatus('Error creating group', 'error') }
    finally { isCreatingGroup.current = false }
  }

  const renameGroup = async (groupId: number, newName: string) => {
    if (!newName.trim()) { showGroupStatus('Group name cannot be empty', 'error'); return }
    if (courseGroups.some((g) => g.id !== groupId && g.name.toLowerCase() === newName.trim().toLowerCase())) {
      showGroupStatus('A group with that name already exists', 'error'); return
    }
    try {
      const r = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })
      if (r.ok) {
        setEditingGroupId(null); setEditingGroupName('')
        await loadGroupData()
        showGroupStatus('Group renamed successfully', 'success')
      } else {
        const err = await r.json()
        showGroupStatus(err.msg || 'Failed to rename group', 'error')
      }
    } catch { showGroupStatus('Error renaming group', 'error') }
  }

  const deleteGroup = (groupId: number) => {
    setConfirmDialog({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? Members will become unassigned.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const r = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}`, {
            method: 'DELETE', credentials: 'include',
          })
          if (r.ok) { await loadGroupData(); showGroupStatus('Group deleted successfully', 'success') }
          else { const err = await r.json(); showGroupStatus(err.msg || 'Failed to delete group', 'error') }
        } catch { showGroupStatus('Error deleting group', 'error') }
      },
    })
  }

  const addStudentToGroup = async (studentId: number, groupId: number) => {
    try {
      const r = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userID: studentId }),
      })
      if (r.ok) { await loadGroupData(); loadMembers(); showGroupStatus('Student added to group', 'success') }
      else { const err = await r.json(); showGroupStatus(err.msg || 'Failed to add student to group', 'error') }
    } catch { showGroupStatus('Error adding student to group', 'error') }
  }

  const removeStudentFromGroup = async (studentId: number, groupId: number) => {
    try {
      const r = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}/members/${studentId}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (r.ok) { await loadGroupData(); loadMembers(); showGroupStatus('Student removed from group', 'success') }
      else { const err = await r.json(); showGroupStatus(err.msg || 'Failed to remove student from group', 'error') }
    } catch { showGroupStatus('Error removing student from group', 'error') }
  }

  const randomizeGroups = () => {
    if (courseGroups.length === 0) { showGroupStatus('Create groups first before randomizing', 'error'); return }
    if (unassignedStudents.length === 0) { showGroupStatus('No unassigned students to distribute', 'error'); return }
    const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5)
    const groupInfo = courseGroups.map((g) => ({ group: g, existing: (groupMembersMap.get(g.id) || []).length }))
    groupInfo.sort((a, b) => b.existing - a.existing)
    let available = shuffled.length
    const selected: typeof groupInfo = []
    for (const gi of groupInfo) {
      const needed = Math.max(0, 2 - gi.existing)
      if (available >= needed) { selected.push(gi); available -= needed }
    }
    if (selected.length === 0) { showGroupStatus('Not enough unassigned students to form groups of at least 2', 'error'); return }
    const unused = courseGroups.length - selected.length
    const msg = unused > 0
      ? `Distribute ${shuffled.length} students across ${selected.length} of ${courseGroups.length} groups? (${unused} group(s) skipped)`
      : `Randomly distribute ${shuffled.length} unassigned students across ${courseGroups.length} groups?`
    setConfirmDialog({
      title: 'Randomize Groups', message: msg, confirmLabel: 'Randomize', variant: 'success',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const assignments: { studentId: number; groupId: number }[] = []
          let idx = 0
          for (const gi of selected) {
            const needed = Math.max(0, 2 - gi.existing)
            for (let j = 0; j < needed; j++) { assignments.push({ studentId: shuffled[idx].id, groupId: gi.group.id }); idx++ }
          }
          while (idx < shuffled.length) {
            for (const gi of selected) {
              if (idx >= shuffled.length) break
              assignments.push({ studentId: shuffled[idx].id, groupId: gi.group.id }); idx++
            }
          }
          let ok = 0
          for (const { studentId, groupId } of assignments) {
            const r = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ userID: studentId }),
            })
            if (r.ok) ok++
          }
          await loadGroupData(); loadMembers()
          showGroupStatus(`Distributed ${ok} students across ${selected.length} groups`, 'success')
        } catch { showGroupStatus('Error randomizing groups', 'error') }
      },
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 items-center border-b bg-background px-6">
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <Link to={`/classes/${id}/home`} className="text-muted-foreground hover:text-foreground transition-colors">{className}</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">Members</span>
        </nav>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Grades', path: `/classes/${id}/grades` },
                { label: 'Settings', path: `/classes/${id}/settings` },
              ]
            : [
                { label: 'Home', path: `/classes/${id}/home` },
                { label: 'Members', path: `/classes/${id}/members` },
                { label: 'Grades', path: `/classes/${id}/grades` },
              ]
        }
      />

      {/* Status messages */}
      {successMsg && (
        <div className="mx-6 mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mx-6 mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-medium">Class Members</h3>
          <Badge variant="secondary">{members.length}</Badge>
          {isTeacher() && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant={showGroupPanel ? 'default' : 'outline'}
                onClick={() => { setShowGroupPanel((v) => !v); if (!showGroupPanel) setLastOpenedPanel('group') }}
              >
                <LayoutList className="mr-2 h-4 w-4" />
                Manage Groups
              </Button>
              <Button
                size="sm"
                variant={showEnrollPanel ? 'default' : 'outline'}
                onClick={() => { setShowEnrollPanel((v) => !v); if (!showEnrollPanel) setLastOpenedPanel('enroll') }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Enrollment
                {joinRequests.length > 0 && (
                  <Badge className="ml-2 bg-orange-500 text-white text-xs">{joinRequests.length}</Badge>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Panels (ordered so the last-opened appears first) ── */}
        <div className="flex flex-col">
        {/* Group management panel */}
        {isTeacher() && showGroupPanel && (
          <div className="mb-6 rounded-lg border bg-card shadow-sm" style={{ order: lastOpenedPanel === 'group' ? 1 : 2 }}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Group Management</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowGroupPanel(false)}>
                × Close
              </Button>
            </div>
            {groupStatusMsg && <StatusMessage message={groupStatusMsg} type={groupStatusType} />}
            {isLoadingGroups ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading groups…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4">
                {/* Left: Unassigned Students */}
                <Card className="flex flex-col max-h-[60vh]">
                  <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Unassigned Students ({unassignedStudents.length})</CardTitle>
                      {unassignedStudents.length > 0 && courseGroups.length > 0 && (
                        <Button onClick={randomizeGroups} size="sm">Randomize Groups</Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto pt-2">
                    {unassignedStudents.length === 0 ? (
                      <p className="py-6 text-center text-sm italic text-muted-foreground">
                        All students are assigned to groups
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {unassignedStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between gap-4 rounded-md border-b px-3 py-2 hover:bg-muted/50">
                            <div className="flex min-w-0 flex-col">
                              <strong className="truncate text-sm">{student.name}</strong>
                              <span className="truncate text-xs text-muted-foreground">{student.email}</span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Add to group</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {courseGroups.map((group) => (
                                  <DropdownMenuItem key={group.id} onClick={() => addStudentToGroup(student.id, group.id)}>
                                    {group.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right: Groups */}
                <Card className="flex flex-col max-h-[60vh]">
                  <CardHeader className="border-b pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">Groups ({courseGroups.length})</CardTitle>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="New group name"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value.slice(0, 30))}
                          onKeyPress={(e) => e.key === 'Enter' && createGroup()}
                          className="w-36"
                          maxLength={30}
                        />
                        <Button size="sm" onClick={createGroup}>Create</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto pt-2">
                    {courseGroups.length === 0 ? (
                      <p className="py-6 text-center text-sm italic text-muted-foreground">No groups created yet</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {courseGroups.map((group) => {
                          const gMembers = groupMembersMap.get(group.id) || []
                          const isEditing = editingGroupId === group.id
                          return (
                            <Card key={group.id} className="p-0">
                              <CardHeader className="border-b px-3 py-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingGroupName}
                                      onChange={(e) => setEditingGroupName(e.target.value.slice(0, 30))}
                                      onKeyPress={(e) => e.key === 'Enter' && renameGroup(group.id, editingGroupName)}
                                      autoFocus
                                      className="flex-1"
                                      maxLength={30}
                                    />
                                    <Button size="sm" variant="default" className="h-8 px-3 text-xs" onClick={() => renameGroup(group.id, editingGroupName)}>Save</Button>
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setEditingGroupId(null); setEditingGroupName('') }}>Cancel</Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">{group.name} ({gMembers.length})</CardTitle>
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name) }}>Edit</Button>
                                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteGroup(group.id)}>Delete</Button>
                                    </div>
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="px-3 py-2">
                                {gMembers.length === 0 ? (
                                  <p className="py-3 text-center text-xs italic text-muted-foreground">No members</p>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {gMembers.map((m) => (
                                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border-b px-2 py-1.5 hover:bg-muted/50">
                                        <div className="flex min-w-0 flex-col">
                                          <strong className="truncate text-xs">{m.name}</strong>
                                          <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeStudentFromGroup(m.id, group.id)}>Remove</Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}


        {isTeacher() && showEnrollPanel && (
          <div className="mb-6 rounded-lg border bg-card shadow-sm" style={{ order: lastOpenedPanel === 'enroll' ? 1 : 2 }}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Enrollment Management</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEnrollPanel(false)}>
                × Close
              </Button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b">
              <button
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  enrollTab === 'csv'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setEnrollTab('csv')}
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </button>
              <button
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  enrollTab === 'registered'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setEnrollTab('registered')}
              >
                <Search className="h-4 w-4" />
                Add Registered Students
              </button>
              <button
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  enrollTab === 'requests'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setEnrollTab('requests')}
              >
                <ClipboardList className="h-4 w-4" />
                Join Requests
                {joinRequests.length > 0 && (
                  <Badge className="ml-1 bg-orange-500 text-white text-xs">{joinRequests.length}</Badge>
                )}
              </button>
            </div>

            <div className="p-4">
              {/* === CSV Tab === */}
              {enrollTab === 'csv' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with columns <code className="rounded bg-muted px-1">id, name, email</code>. Existing
                    system students are enrolled; new students receive a temporary password.
                  </p>
                  <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingRoster ? 'Opening file picker...' : 'Choose CSV file'}
                  </Button>
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
                </div>
              )}

              {/* === Add Registered Students Tab === */}
              {enrollTab === 'registered' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or student ID…"
                        className="pl-8"
                        value={registeredSearch}
                        onChange={(e) => {
                          setRegisteredSearch(e.target.value)
                          loadRegisteredStudents(e.target.value)
                        }}
                      />
                    </div>
                    <Button
                      disabled={selectedIds.size === 0 || isEnrolling}
                      onClick={handleEnrollSelected}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isEnrolling
                        ? 'Enrolling…'
                        : `Enroll Selected (${selectedIds.size})`}
                    </Button>
                  </div>

                  {isLoadingRegistered ? (
                    <p className="text-sm text-muted-foreground">Loading students…</p>
                  ) : registeredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {registeredSearch
                        ? 'No students match your search.'
                        : 'All registered students are already enrolled in this course.'}
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {registeredStudents.map((s) => (
                        <div
                          key={s.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                            selectedIds.has(s.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-muted'
                          }`}
                          onClick={() => toggleSelect(s.id)}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              selectedIds.has(s.id)
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input'
                            }`}
                          >
                            {selectedIds.has(s.id) && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground ml-2">{s.email}</span>
                            {s.student_id && (
                              <span className="text-muted-foreground ml-2">| ID: {s.student_id}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === Join Requests Tab === */}
              {enrollTab === 'requests' && (
                <div className="space-y-2">
                  {isLoadingRequests ? (
                    <p className="text-sm text-muted-foreground">Loading requests…</p>
                  ) : joinRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending join requests.</p>
                  ) : (
                    joinRequests.map((req) => (
                      <div key={req.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{req.student?.name ?? `Student #${req.studentID}`}</p>
                            <p className="text-sm text-muted-foreground">
                              {req.student?.email}
                              {req.student?.student_id && ` | ID: ${req.student.student_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Requested {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {rejectingId === req.id ? (
                            <div className="flex flex-col gap-2 min-w-48">
                              <Textarea
                                placeholder="Optional reason for declining…"
                                className="text-sm"
                                rows={2}
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setRejectingId(null); setRejectNotes('') }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(req.id)}
                                >
                                  Confirm Decline
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleApprove(req.id)}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => setRejectingId(req.id)}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>{/* end flex-col panels wrapper */}

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
                    {isTeacher() && member.role === 'student' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Remove student confirmation modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-lg font-bold">Remove Student</h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to remove <strong>{removeTarget.name}</strong> from this course?{' '}
              This does not delete their account or submission data.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={isRemoving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveStudent} disabled={isRemoving}>
                {isRemoving ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
