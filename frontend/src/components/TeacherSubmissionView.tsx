import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, listCourseMembers, getCourseGroups, getGroupMembers, getAssignmentGradebook } from "../util/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Search, Users, LayoutList } from "lucide-react";
import ViewSubmissionModal from "./ViewSubmissionModal";
import StudentReviewSummaryModal from "./StudentReviewSummaryModal";

interface StudentSubmission {
  id: number;
  filename?: string;
  file_path?: string;
  submission_text?: string;
  submitted_at: string;
  student_id: number;
  student_name: string;
  assignment_id: number;
}

interface Student {
  id: number;
  student_id?: string; // The school's student identifier
  name: string;
  email: string;
}

interface StudentWithSubmission {
  student: Student;
  submission: StudentSubmission | null;
  status: "Submitted" | "Submitted Late" | "No Submission";
  grade?: string; // Placeholder for future grade feature
}

interface CourseGroup {
  id: number;
  name: string;
  courseID: number;
  member_count?: number;
}

interface GroupWithSubmission {
  group: CourseGroup;
  submission: StudentSubmission | null;
  status: "Submitted" | "Submitted Late" | "No Submission";
  grade?: string;
  submittedBy?: string; // Name of student who submitted for the group
  members: Student[]; // All members of the group
}

interface TeacherSubmissionViewProps {
  assignmentId: number;
}

export default function TeacherSubmissionView({
  assignmentId
}: TeacherSubmissionViewProps) {
  const [studentsWithSubmissions, setStudentsWithSubmissions] = useState<StudentWithSubmission[]>([]);
  const [groupsWithSubmissions, setGroupsWithSubmissions] = useState<GroupWithSubmission[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewModalEntityName, setViewModalEntityName] = useState("");
  // Map of student_id -> { completed, expected } peer evaluation counts
  const [evalMap, setEvalMap] = useState<Map<number, { completed: number; expected: number }>>(new Map());
  const [reviewModalStudent, setReviewModalStudent] = useState<{ id: number; name: string } | null>(null);
  const [studentSearch, setStudentSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [studentGroupMap, setStudentGroupMap] = useState<Map<number, string>>(new Map())
  const navigate = useNavigate();

  // Load all student submissions and class roster
  useEffect(() => {
    loadSubmissionsAndStudents();
  }, [assignmentId]);

  const loadSubmissionsAndStudents = async () => {
    setIsLoadingSubmissions(true);
    setError(null);
    try {
      // Fetch assignment details to get class ID, due date, and submission type
      const assignmentData = await getAssignmentDetails(assignmentId);
      const classId = assignmentData.courseID || assignmentData.course?.id;
      const dueDate = assignmentData.due_date ? new Date(assignmentData.due_date) : null;
      const submissionType = assignmentData.submission_type || 'individual';

      if (!classId) {
        throw new Error("Could not determine class ID for this assignment");
      }

      // Fetch all submissions for this assignment
      const [submissionsData] = await Promise.all([
        getStudentSubmissions(assignmentId),
        getAssignmentGradebook(assignmentId).then((gb) => {
          const map = new Map<number, { completed: number; expected: number }>();
          gb.students.forEach((s) => {
            map.set(s.student_id, {
              completed: s.entry.peer_evaluation.completed,
              expected: s.entry.peer_evaluation.expected,
            });
          });
          setEvalMap(map);
        }).catch(() => { /* gradebook may not exist yet */ }),
      ]);

      if (submissionType === 'group') {
        // Handle group assignments
        setIsGroupAssignment(true);
        await loadGroupSubmissions(classId, submissionsData, dueDate);
      } else {
        // Handle individual assignments
        setIsGroupAssignment(false);
        await loadIndividualSubmissions(classId, submissionsData, dueDate);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const loadIndividualSubmissions = async (
    classId: number,
    submissionsData: StudentSubmission[],
    dueDate: Date | null
  ) => {
    // Fetch all students in the class
    const classMembersData = await listCourseMembers(String(classId));
    // Filter to only include students (not the teacher)
    const students: Student[] = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');

    // Consolidate multiple submissions per student (text + file)
    const consolidatedMap = new Map<number, StudentSubmission>();
    submissionsData.forEach((sub: StudentSubmission) => {
      if (consolidatedMap.has(sub.student_id)) {
        const existing = consolidatedMap.get(sub.student_id)!;
        // Use the later timestamp
        if (new Date(sub.submitted_at) > new Date(existing.submitted_at)) {
          existing.submitted_at = sub.submitted_at;
        }
        // Add text or file if missing
        if (sub.submission_text && !existing.submission_text) {
          existing.submission_text = sub.submission_text;
        }
        if (sub.filename && !existing.filename) {
          existing.filename = sub.filename;
          existing.file_path = sub.file_path;
        }
      } else {
        consolidatedMap.set(sub.student_id, { ...sub });
      }
    });

    // Merge students with their submission status
    const merged: StudentWithSubmission[] = students.map((student) => {
      const submission = consolidatedMap.get(student.id) || null;

      let status: "Submitted" | "Submitted Late" | "No Submission" = "No Submission";

      if (submission) {
        if (dueDate) {
          const submittedAt = new Date(submission.submitted_at);
          status = submittedAt > dueDate ? "Submitted Late" : "Submitted";
        } else {
          status = "Submitted";
        }
      }

      return {
        student,
        submission,
        status
      };
    });

    setStudentsWithSubmissions(merged);

    // Fetch group memberships so we can show group badges + filter
    try {
      const groupsData = await getCourseGroups(classId);
      const gMap = new Map<number, string>();
      await Promise.all(
        groupsData.map(async (group: CourseGroup) => {
          try {
            const membersData = await getGroupMembers(classId, group.id);
            membersData.forEach((m: { id: number }) => gMap.set(m.id, group.name));
          } catch { /* ignore */ }
        })
      );
      setStudentGroupMap(gMap);
    } catch { /* groups are best-effort */ }
  };

  const loadGroupSubmissions = async (
    classId: number,
    submissionsData: StudentSubmission[],
    dueDate: Date | null
  ) => {
    // Fetch all groups in the course
    const groupsData = await getCourseGroups(classId);

    // Consolidate submissions by group
    const groupSubmissionMap = new Map<number, StudentSubmission[]>();

    for (const group of groupsData) {
      const groupMemberIds = (await getGroupMembers(classId, group.id)).map((m: any) => m.id);
      const groupSubs = submissionsData.filter((sub: StudentSubmission) =>
        groupMemberIds.includes(sub.student_id)
      );
      if (groupSubs.length > 0) {
        groupSubmissionMap.set(group.id, groupSubs);
      }
    }

    // For each group, fetch members and check for submissions
    const merged: GroupWithSubmission[] = await Promise.all(
      groupsData.map(async (group: CourseGroup) => {
        try {
          // Fetch group members with full student data
          const membersData = await getGroupMembers(classId, group.id);

          // Convert to Student type
          const members: Student[] = membersData.map((member: any) => ({
            id: member.id,
            student_id: member.student_id,
            name: member.name,
            email: member.email
          }));

          // Get all submissions from group members and consolidate
          let groupSubmission: StudentSubmission | undefined = undefined;
          let submittedBy: string | undefined = undefined;

          const groupSubs = groupSubmissionMap.get(group.id);
          if (groupSubs && groupSubs.length > 0) {
            // Find who submitted
            const firstSubmitter = members.find(m =>
              groupSubs.some(sub => sub.student_id === m.id)
            );
            submittedBy = firstSubmitter?.name;

            // Consolidate all submissions (text + file)
            groupSubmission = { ...groupSubs[0] };
            for (let i = 1; i < groupSubs.length; i++) {
              const sub = groupSubs[i];
              if (sub.submission_text && !groupSubmission.submission_text) {
                groupSubmission.submission_text = sub.submission_text;
              }
              if (sub.filename && !groupSubmission.filename) {
                groupSubmission.filename = sub.filename;
                groupSubmission.file_path = sub.file_path;
              }
              if (new Date(sub.submitted_at) > new Date(groupSubmission.submitted_at)) {
                groupSubmission.submitted_at = sub.submitted_at;
              }
            }
          }

          // Sort members so submitter appears first
          if (groupSubmission) {
            const submitterId = groupSubmission.student_id;
            members.sort((a, b) => {
              if (a.id === submitterId) return -1;
              if (b.id === submitterId) return 1;
              return 0;
            });
          }

          // Calculate status
          let status: "Submitted" | "Submitted Late" | "No Submission" = "No Submission";

          if (groupSubmission && dueDate) {
            const submittedAt = new Date(groupSubmission.submitted_at);
            status = submittedAt > dueDate ? "Submitted Late" : "Submitted";
          } else if (groupSubmission) {
            status = "Submitted";
          }

          return {
            group,
            submission: groupSubmission,
            status,
            submittedBy,
            members
          };
        } catch (error) {
          console.error(`Error loading members for group ${group.id}:`, error);
          // Return group with no submission if there's an error
          return {
            group,
            submission: null,
            status: "No Submission" as const,
            submittedBy: undefined,
            members: []
          };
        }
      })
    );

    setGroupsWithSubmissions(merged);
  };

  const handleDownload = async (submissionId: number, filename?: string) => {
    try {
      const blob = await downloadStudentSubmission(submissionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `submission_${submissionId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleViewSubmission = (submission: StudentSubmission, entityName: string) => {
    setSelectedSubmission(submission);
    setViewModalEntityName(entityName);
    setIsViewModalOpen(true);
  };

  const handleViewProfile = (studentId: number) => {
    navigate(`/profile/${studentId}`);
  };

  const toggleGroupExpanded = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Submitted":
        return "text-green-500 font-medium";
      case "Submitted Late":
        return "text-orange-500 font-medium";
      case "No Submission":
        return "text-red-600 font-medium";
      default:
        return "";
    }
  };

  // ── Derived filtered data ─────────────────────────────────────────────────
  const groupNames = useMemo(
    () => Array.from(new Set(Array.from(studentGroupMap.values()))).sort(),
    [studentGroupMap]
  )

  const filteredIndividual = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    return studentsWithSubmissions.filter((item) => {
      const matchesSearch =
        !q ||
        item.student.name.toLowerCase().includes(q) ||
        item.student.email.toLowerCase().includes(q) ||
        (item.student.student_id || '').toLowerCase().includes(q)
      const gName = studentGroupMap.get(item.student.id)
      const matchesGroup =
        groupFilter === 'all' ||
        (groupFilter === 'unassigned' && !gName) ||
        gName === groupFilter
      return matchesSearch && matchesGroup
    })
  }, [studentsWithSubmissions, studentSearch, groupFilter, studentGroupMap])

  const filteredGroups = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return groupsWithSubmissions
    return groupsWithSubmissions.filter(
      (g) =>
        g.group.name.toLowerCase().includes(q) ||
        g.members.some((m) => m.name.toLowerCase().includes(q))
    )
  }, [groupsWithSubmissions, studentSearch])

  return (
    <div className="w-full">
      {isLoadingSubmissions ? (
        <p className="text-center text-muted-foreground italic py-5">Loading submissions...</p>
      ) : error ? (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-800 border border-red-400">
          {error}
        </div>
      ) : (
        <>
          {/* ── Search + filter toolbar ── */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isGroupAssignment ? 'Search groups or members…' : 'Search by name, email, or student ID…'}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {!isGroupAssignment && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                  <LayoutList className="h-4 w-4" />
                  {groupFilter === 'all'
                    ? 'All Students'
                    : groupFilter === 'unassigned'
                    ? 'No Group'
                    : `Group: ${groupFilter}`}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupFilter('all')}>All Students</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupFilter('unassigned')}>No Group</DropdownMenuItem>
                  {groupNames.map((g) => (
                    <DropdownMenuItem key={g} onClick={() => setGroupFilter(g)}>
                      Group: {g}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isGroupAssignment ? (
            filteredGroups.length > 0 ? (
              <div>
                {filteredGroups.map((groupItem) => {
                  const isExpanded = expandedGroups.has(groupItem.group.id);
                  return (
                    <div key={groupItem.group.id} className="mb-3 bg-white rounded-lg shadow-sm overflow-hidden ring-1 ring-foreground/10">
                      {/* Group Summary Row */}
                      <div
                        onClick={() => toggleGroupExpanded(groupItem.group.id)}
                        className={`flex items-center p-4 cursor-pointer transition-colors ${
                          isExpanded ? "bg-gray-50 border-b border-gray-200" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className={`mr-3 text-lg transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}>
                          ▶
                        </div>
                        <div className="flex-1 flex items-center gap-5 flex-wrap">
                          <div className="min-w-[200px]">
                            <div className="font-semibold text-base">{groupItem.group.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {groupItem.members.length} member{groupItem.members.length !== 1 ? 's' : ''}
                              {groupItem.submittedBy && <span> - Submitted by: {groupItem.submittedBy}</span>}
                            </div>
                          </div>
                          <div className="flex gap-5 items-center">
                            <div>
                              <div className="text-xs text-muted-foreground uppercase mb-0.5">Status</div>
                              <div className={`text-sm ${getStatusClasses(groupItem.status)}`}>{groupItem.status}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground uppercase mb-0.5">Grade</div>
                              <div className="text-sm">{groupItem.grade || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground uppercase mb-0.5">Last Modified</div>
                              <div className="text-sm">{groupItem.submission ? formatDate(groupItem.submission.submitted_at) : 'N/A'}</div>
                            </div>
                            {groupItem.submission && (
                              <div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(groupItem.submission!.id, groupItem.submission!.filename);
                                  }}
                                >
                                  Download
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Member Details */}
                      {isExpanded && (
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Student ID</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Email</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Evaluations</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupItem.members.length > 0 ? (
                                groupItem.members.map((member) => {
                                  const isSubmitter = groupItem.submission && groupItem.submission.student_id === member.id;
                                  return (
                                    <tr key={member.id} className={`border-b border-gray-100 ${isSubmitter ? "bg-blue-50" : "bg-white"}`}>
                                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => setReviewModalStudent({ id: member.id, name: member.name })}
                                            className="text-blue-600 font-medium cursor-pointer hover:underline text-left"
                                          >
                                            {member.name}
                                          </button>
                                          {isSubmitter && (
                                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded font-semibold">
                                              Submitter
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">{member.student_id || 'N/A'}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">{member.email}</td>
                                      <td className={`px-4 py-3 text-sm align-middle ${getStatusClasses(groupItem.status)}`}>{groupItem.status}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                                        {(() => {
                                          const ev = evalMap.get(member.id);
                                          if (!ev || ev.expected === 0) return <span className="text-muted-foreground">—</span>;
                                          const color = ev.completed >= ev.expected ? 'text-green-600' : 'text-orange-500';
                                          return <span className={`font-medium ${color}`}>{ev.completed}/{ev.expected}</span>;
                                        })()}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">{groupItem.grade || '-'}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-5 text-center text-muted-foreground">
                                    No members in this group
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground italic p-4 rounded border border-dashed border-gray-300">
                {groupsWithSubmissions.length === 0 ? 'No groups created for this class' : 'No groups match your search'}
              </p>
            )
          ) : (
            filteredIndividual.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Student ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Group</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Evaluations</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Grade</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Last Modified</th>
                      <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">File Submission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndividual.map((item) => (
                      <tr key={item.student.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                          <button
                            onClick={() => setReviewModalStudent({ id: item.student.id, name: item.student.name })}
                            className="text-blue-600 font-medium cursor-pointer hover:underline text-left"
                          >
                            {item.student.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">{item.student.student_id || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">{item.student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                          {(() => {
                            const gName = studentGroupMap.get(item.student.id);
                            return gName
                              ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700"><Users className="h-3 w-3" />{gName}</span>
                              : <span className="text-muted-foreground text-xs">—</span>;
                          })()}
                        </td>
                        <td className={`px-4 py-3 text-sm align-middle ${getStatusClasses(item.status)}`}>{item.status}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                          {(() => {
                            const ev = evalMap.get(item.student.id);
                            if (!ev || ev.expected === 0) return <span className="text-muted-foreground">—</span>;
                            const color = ev.completed >= ev.expected ? 'text-green-600' : 'text-orange-500';
                            return <span className={`font-medium ${color}`}>{ev.completed}/{ev.expected}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">{item.grade || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                          {item.submission ? formatDate(item.submission.submitted_at) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                          {item.submission ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{item.submission.filename}</span>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownload(item.submission!.id, item.submission!.filename)}
                              >
                                View
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No file</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground italic p-4 rounded border border-dashed border-gray-300">
                {studentsWithSubmissions.length === 0 ? 'No students enrolled in this class' : 'No students match your search or filter'}
              </p>
            )
          )}

          {reviewModalStudent && (
            <StudentReviewSummaryModal
              assignmentId={assignmentId}
              studentId={reviewModalStudent.id}
              studentName={reviewModalStudent.name}
              onClose={() => setReviewModalStudent(null)}
            />
          )}
        </>
      )}
      {selectedSubmission && (
        <ViewSubmissionModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedSubmission(null);
          }}
          submission={selectedSubmission}
          entityName={viewModalEntityName}
        />
      )}
    </div>
  );
}
