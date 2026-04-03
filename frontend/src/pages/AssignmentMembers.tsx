import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, LayoutList, UserPlus, Upload, ClipboardList, Search, Check, X, Trash2 } from 'lucide-react'
import TabNavigation from '../components/TabNavigation'
import StatusMessage from '../components/StatusMessage'
import ConfirmDialog from '../components/ConfirmDialog'
import RosterUploadResult from '../components/RosterUploadResult'
import { importCSV } from '../util/csv'
import { listCourseMembers, getAssignmentDetails, listClasses, getProfilePictureUrl, getCourseEnrollmentRequests, approveEnrollmentRequest, rejectEnrollmentRequest, getRegisteredStudentsForCourse, enrollDirectStudents, unenrollStudent } from '../util/api'
import { isTeacher } from '../util/login'

interface User {
  id: number
  name: string
  email: string
  role: string
  student_id?: string
  profile_picture_url?: string
}

interface CourseGroup {
  id: number
  name: string
  courseID: number
  member_count?: number
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

  // Group management state
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [groups, setGroups] = useState<CourseGroup[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([])
  const [groupMembersMap, setGroupMembersMap] = useState<Map<number, User[]>>(new Map())
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [groupStatusMsg, setGroupStatusMsg] = useState('')
  const [groupStatusType, setGroupStatusType] = useState<'success' | 'error'>('success')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [lastOpenedPanel, setLastOpenedPanel] = useState<'group' | 'enroll' | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: () => void
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Enrollment management state
  const [showEnrollPanel, setShowEnrollPanel] = useState(false)
  const [enrollTab, setEnrollTab] = useState<EnrollTab>('csv')
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([])
  const [registeredSearch, setRegisteredSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isLoadingRegistered, setIsLoadingRegistered] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [joinRequests, setJoinRequests] = useState<EnrollmentRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null)
  const [isUploadingRoster, setIsUploadingRoster] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  // ── Group management ──────────────────────────────────────────────────────

  const showGroupStatus = (message: string, type: 'success' | 'error') => {
    setGroupStatusMsg(message)
    setGroupStatusType(type)
    setTimeout(() => setGroupStatusMsg(''), 4100)
  }

  const loadGroups = useCallback(async (cid: number) => {
    try {
      const resp = await fetch(`http://localhost:5000/classes/${cid}/groups`, { credentials: 'include' })
      if (!resp.ok) return
      const data: CourseGroup[] = await resp.json()
      setGroups(data)
      const map = new Map<number, User[]>()
      for (const group of data) {
        const mResp = await fetch(`http://localhost:5000/classes/${cid}/groups/${group.id}/members`, { credentials: 'include' })
        if (mResp.ok) map.set(group.id, await mResp.json())
      }
      setGroupMembersMap(map)
    } catch (e) { console.error(e) }
  }, [])

  const loadUnassigned = useCallback(async (cid: number) => {
    try {
      const resp = await fetch(`http://localhost:5000/classes/${cid}/members/unassigned`, { credentials: 'include' })
      if (resp.ok) setUnassignedStudents(await resp.json())
    } catch (e) { console.error(e) }
  }, [])

  const reloadGroupData = useCallback(async () => {
    if (!courseId) return
    await Promise.all([loadGroups(courseId), loadUnassigned(courseId)])
  }, [courseId, loadGroups, loadUnassigned])

  useEffect(() => {
    if (showGroupPanel && courseId) {
      reloadGroupData()
    }
  }, [showGroupPanel, courseId, reloadGroupData])

  const createGroup = async () => {
    if (isCreatingGroup || !courseId) return
    if (!newGroupName.trim()) { showGroupStatus('Group name cannot be empty', 'error'); return }
    if (groups.some(g => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      showGroupStatus('A group with that name already exists', 'error'); return
    }
    setIsCreatingGroup(true)
    try {
      const resp = await fetch(`http://localhost:5000/classes/${courseId}/groups`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: newGroupName }),
      })
      if (resp.ok) { setNewGroupName(''); await reloadGroupData(); showGroupStatus('Group created', 'success') }
      else { const e = await resp.json(); showGroupStatus(e.msg || 'Failed to create group', 'error') }
    } catch { showGroupStatus('Error creating group', 'error') }
    setIsCreatingGroup(false)
  }

  const renameGroup = async (groupId: number, newName: string) => {
    if (!newName.trim() || !courseId) return
    if (groups.some(g => g.id !== groupId && g.name.toLowerCase() === newName.trim().toLowerCase())) {
      showGroupStatus('A group with that name already exists', 'error'); return
    }
    try {
      const resp = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })
      if (resp.ok) { setEditingGroupId(null); setEditingGroupName(''); await reloadGroupData(); showGroupStatus('Group renamed', 'success') }
      else { const e = await resp.json(); showGroupStatus(e.msg || 'Failed to rename group', 'error') }
    } catch { showGroupStatus('Error renaming group', 'error') }
  }

  const deleteGroup = (groupId: number) => {
    setConfirmDialog({
      title: 'Delete Group', message: 'Delete this group? Members will become unassigned.',
      confirmLabel: 'Delete', variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
        if (!courseId) return
        try {
          const resp = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}`, { method: 'DELETE', credentials: 'include' })
          if (resp.ok) { await reloadGroupData(); showGroupStatus('Group deleted', 'success') }
          else { const e = await resp.json(); showGroupStatus(e.msg || 'Failed to delete group', 'error') }
        } catch { showGroupStatus('Error deleting group', 'error') }
      },
    })
  }

  const addMemberToGroup = async (userId: number, groupId: number) => {
    if (!courseId) return
    try {
      const resp = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userID: userId }),
      })
      if (resp.ok) { await reloadGroupData(); showGroupStatus('Member added to group', 'success') }
      else { const e = await resp.json(); showGroupStatus(e.msg || 'Failed to add member', 'error') }
    } catch { showGroupStatus('Error adding member', 'error') }
  }

  const removeMemberFromGroup = async (userId: number, groupId: number) => {
    if (!courseId) return
    try {
      const resp = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}/members/${userId}`, { method: 'DELETE', credentials: 'include' })
      if (resp.ok) { await reloadGroupData(); showGroupStatus('Member removed', 'success') }
      else { const e = await resp.json(); showGroupStatus(e.msg || 'Failed to remove member', 'error') }
    } catch { showGroupStatus('Error removing member', 'error') }
  }

  const randomizeGroups = () => {
    if (!courseId || groups.length === 0) { showGroupStatus('Create groups first', 'error'); return }
    if (unassignedStudents.length === 0) { showGroupStatus('No unassigned students to distribute', 'error'); return }
    const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5)
    const groupInfo = groups.map(g => ({ group: g, existing: (groupMembersMap.get(g.id) || []).length }))
    groupInfo.sort((a, b) => b.existing - a.existing)
    let available = shuffled.length
    const selected: typeof groupInfo = []
    for (const gi of groupInfo) {
      const needed = Math.max(0, 2 - gi.existing)
      if (available >= needed) { selected.push(gi); available -= needed }
    }
    if (selected.length === 0) { showGroupStatus('Not enough students to form groups of at least 2', 'error'); return }
    const skipped = groups.length - selected.length
    setConfirmDialog({
      title: 'Randomize Groups',
      message: skipped > 0
        ? `Distribute ${shuffled.length} students across ${selected.length} of ${groups.length} groups? (${skipped} group(s) skipped)`
        : `Randomly distribute ${shuffled.length} unassigned students across ${groups.length} groups?`,
      confirmLabel: 'Randomize', variant: 'success',
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
            const r = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}/members`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
              body: JSON.stringify({ userID: studentId }),
            })
            if (r.ok) ok++
          }
          await reloadGroupData()
          showGroupStatus(`Distributed ${ok} students across ${selected.length} groups`, 'success')
        } catch { showGroupStatus('Error randomizing groups', 'error') }
      },
    })
  }

  // ── Enrollment management ──────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setErrorMsg(null)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setSuccessMsg(null)
  }

  const loadJoinRequests = useCallback(async () => {
    if (!courseId) return
    setIsLoadingRequests(true)
    try {
      const data = await getCourseEnrollmentRequests(courseId)
      setJoinRequests(data)
    } catch { /* ignore */ } finally { setIsLoadingRequests(false) }
  }, [courseId])

  const loadRegisteredStudents = useCallback(async (search = '') => {
    if (!courseId) return
    setIsLoadingRegistered(true)
    try {
      const data = await getRegisteredStudentsForCourse(courseId, search)
      setRegisteredStudents(data)
    } catch { /* ignore */ } finally { setIsLoadingRegistered(false) }
  }, [courseId])

  useEffect(() => {
    if (isTeacher() && courseId) loadJoinRequests()
  }, [loadJoinRequests, courseId])

  useEffect(() => {
    if (!showEnrollPanel) return
    if (enrollTab === 'registered') loadRegisteredStudents(registeredSearch)
    else if (enrollTab === 'requests') loadJoinRequests()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollTab, showEnrollPanel])

  const handleRosterUpload = () => {
    if (isUploadingRoster || !courseId) return
    setIsUploadingRoster(true)
    importCSV(
      String(courseId),
      (result) => { setIsUploadingRoster(false); setRosterResult(result); loadMembers() },
      (error) => { setIsUploadingRoster(false); showError(error instanceof Error ? error.message : String(error)) },
      () => setIsUploadingRoster(false)
    )
  }

  const handleEnrollSelected = async () => {
    if (selectedIds.size === 0 || !courseId) return
    setIsEnrolling(true)
    setErrorMsg(null)
    try {
      const result = await enrollDirectStudents(courseId, Array.from(selectedIds))
      setSelectedIds(new Set())
      await loadMembers()
      await loadRegisteredStudents(registeredSearch)
      showSuccess(
        `Enrolled ${result.enrolled_count} student(s)` +
        (result.already_enrolled_count > 0 ? `, ${result.already_enrolled_count} already enrolled` : '')
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to enroll students')
    } finally { setIsEnrolling(false) }
  }

  const handleApprove = async (requestId: number) => {
    try {
      await approveEnrollmentRequest(requestId)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      await loadMembers()
      showSuccess('Enrollment request approved')
    } catch (err) { showError(err instanceof Error ? err.message : 'Failed to approve request') }
  }

  const handleReject = async (requestId: number) => {
    try {
      await rejectEnrollmentRequest(requestId, rejectNotes)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      setRejectingId(null)
      setRejectNotes('')
      showSuccess('Enrollment request declined')
    } catch (err) { showError(err instanceof Error ? err.message : 'Failed to reject request') }
  }

  const handleRemoveStudent = async (member: User) => {
    if (!courseId) return
    setConfirmDialog({
      title: 'Remove Student',
      message: `Remove ${member.name} from this course?`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await unenrollStudent(courseId, member.id)
          await loadMembers()
          showSuccess(`${member.name} has been removed from the course`)
        } catch (err) { showError(err instanceof Error ? err.message : 'Failed to remove student') }
      },
    })
  }

  const toggleSelect = (sid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(sid) ? next.delete(sid) : next.add(sid)
      return next
    })
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

      {successMsg && (
        <div className="mx-6 mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mx-6 mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{errorMsg}</div>
      )}

      <div className="flex-1 p-6">
        {/* ── Sub-header row ── */}
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
        {/* ── Group panel ── */}
        {showGroupPanel && isTeacher() && (
          <div className="mb-6 rounded-lg border bg-card shadow-sm" style={{ order: lastOpenedPanel === 'group' ? 1 : 2 }}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Group Management</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowGroupPanel(false)}>× Close</Button>
            </div>
            <div className="p-4">
            {groupStatusMsg && <StatusMessage message={groupStatusMsg} type={groupStatusType} />}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Unassigned students */}
              <div className="flex flex-col rounded-lg border bg-background p-4 shadow-sm" style={{ maxHeight: '60vh' }}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Unassigned Students ({unassignedStudents.length})</h4>
                  {unassignedStudents.length > 0 && groups.length > 0 && (
                    <button
                      onClick={randomizeGroups}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.97]"
                    >
                      Randomize Groups
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {unassignedStudents.length === 0 ? (
                    <p className="py-8 text-center text-sm italic text-muted-foreground">All students are assigned</p>
                  ) : (
                    unassignedStudents.map((student) => (
                      <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border-b px-3 py-2 last:border-none hover:bg-muted/50">
                        <div className="flex min-w-0 flex-col">
                          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{student.name}</strong>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">{student.email}</span>
                        </div>
                        {groups.length > 0 && (
                          <div className="relative shrink-0" ref={openDropdown === student.id ? dropdownRef : null}>
                            <button
                              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-muted-foreground hover:text-foreground hover:shadow-sm"
                              onClick={() => setOpenDropdown(openDropdown === student.id ? null : student.id)}
                            >
                              Add to group ▾
                            </button>
                            {openDropdown === student.id && (
                              <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] overflow-hidden rounded-lg border bg-background shadow-lg">
                                {groups.map((group) => (
                                  <button
                                    key={group.id}
                                    className="block w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                                    onClick={() => { addMemberToGroup(student.id, group.id); setOpenDropdown(null) }}
                                  >
                                    {group.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Groups */}
              <div className="flex flex-col rounded-lg border bg-background p-4 shadow-sm" style={{ maxHeight: '60vh' }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Groups ({groups.length})</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value.slice(0, 30))}
                      onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                      className="w-[140px] rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      maxLength={30}
                    />
                    <Button size="sm" variant="default" onClick={createGroup} disabled={isCreatingGroup} className="h-8 px-3 text-xs font-medium">Create</Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {groups.length === 0 ? (
                    <p className="py-8 text-center text-sm italic text-muted-foreground">No groups yet</p>
                  ) : (
                    groups.map((group) => {
                      const gMembers = groupMembersMap.get(group.id) || []
                      const isEditing = editingGroupId === group.id
                      return (
                        <div key={group.id} className="mb-2.5 rounded-lg border p-3 transition-all hover:shadow-sm">
                          <div className="mb-2 flex items-center justify-between border-b pb-2">
                            {isEditing ? (
                              <div className="flex flex-1 gap-1.5">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value.slice(0, 30))}
                                  onKeyDown={(e) => e.key === 'Enter' && renameGroup(group.id, editingGroupName)}
                                  className="flex-1 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  maxLength={30}
                                />
                                <Button size="sm" variant="default" className="h-8 px-3 text-xs" onClick={() => renameGroup(group.id, editingGroupName)}>Save</Button>
                                <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setEditingGroupId(null); setEditingGroupName('') }}>Cancel</Button>
                              </div>
                            ) : (
                              <>
                                <h5 className="text-sm font-semibold">{group.name} ({gMembers.length})</h5>
                                <div className="flex gap-1.5">
                                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name) }}>Edit</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteGroup(group.id)}>Delete</Button>
                                </div>
                              </>
                            )}
                          </div>
                          {gMembers.length === 0 ? (
                            <p className="py-4 text-center text-xs italic text-muted-foreground">No members</p>
                          ) : (
                            gMembers.map((member) => (
                              <div key={member.id} className="flex items-center justify-between rounded-md border-b px-2 py-2 last:border-none hover:bg-muted/50">
                                <div className="flex min-w-0 flex-col">
                                  <strong className="text-sm">{member.name}</strong>
                                  <span className="text-xs text-muted-foreground">{member.email}</span>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeMemberFromGroup(member.id, group.id)}>Remove</Button>
                              </div>
                            ))
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            </div>{/* end p-4 */}
          </div>
        )}

        {/* ── Enrollment panel ── */}
        {showEnrollPanel && isTeacher() && (
          <div className="mb-6 rounded-lg border bg-card shadow-sm" style={{ order: lastOpenedPanel === 'enroll' ? 1 : 2 }}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Enrollment Management</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEnrollPanel(false)}>× Close</Button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b">
              {(['csv', 'registered', 'requests'] as EnrollTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    enrollTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setEnrollTab(tab)}
                >
                  {tab === 'csv' && <Upload className="h-4 w-4" />}
                  {tab === 'registered' && <Search className="h-4 w-4" />}
                  {tab === 'requests' && <ClipboardList className="h-4 w-4" />}
                  {tab === 'csv' ? 'Upload CSV' : tab === 'registered' ? 'Add Registered Students' : 'Join Requests'}
                  {tab === 'requests' && joinRequests.length > 0 && (
                    <Badge className="ml-1 bg-orange-500 text-white text-xs">{joinRequests.length}</Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* CSV tab */}
              {enrollTab === 'csv' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with columns <code className="rounded bg-muted px-1">id, name, email</code>. Existing students are enrolled; new students receive a temporary password.
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

              {/* Add Registered Students tab */}
              {enrollTab === 'registered' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or student ID…"
                        className="pl-8"
                        value={registeredSearch}
                        onChange={(e) => { setRegisteredSearch(e.target.value); loadRegisteredStudents(e.target.value) }}
                      />
                    </div>
                    <Button disabled={selectedIds.size === 0 || isEnrolling} onClick={handleEnrollSelected}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isEnrolling ? 'Enrolling…' : `Enroll Selected (${selectedIds.size})`}
                    </Button>
                  </div>
                  {isLoadingRegistered ? (
                    <p className="text-sm text-muted-foreground">Loading students…</p>
                  ) : registeredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {registeredSearch ? 'No students match your search.' : 'All registered students are already enrolled.'}
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {registeredStudents.map((s) => (
                        <div
                          key={s.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                            selectedIds.has(s.id) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                          }`}
                          onClick={() => toggleSelect(s.id)}
                        >
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            selectedIds.has(s.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                          }`}>
                            {selectedIds.has(s.id) && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{s.name}</span>
                            <span className="ml-2 text-muted-foreground">{s.email}</span>
                            {s.student_id && <span className="ml-2 text-muted-foreground">| ID: {s.student_id}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Join Requests tab */}
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
                                <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectNotes('') }}>Cancel</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Confirm Decline</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleApprove(req.id)}>
                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setRejectingId(req.id)}>
                                <X className="mr-1 h-3.5 w-3.5" /> Decline
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

        {/* ── Members list ── */}
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
                        onClick={() => handleRemoveStudent(member)}
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

