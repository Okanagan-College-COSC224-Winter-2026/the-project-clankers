import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, listCourseMembers, getCourseGroups, getGroupMembers } from "../util/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface StudentSubmission {
  id: number;
  filename: string;
  file_path: string;
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
      const submissionsData = await getStudentSubmissions(assignmentId);

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

    // Create a map of student_id -> submission for quick lookup
    const submissionMap = new Map<number, StudentSubmission>();
    submissionsData.forEach((sub: StudentSubmission) => {
      submissionMap.set(sub.student_id, sub);
    });

    // Merge students with their submission status
    const merged: StudentWithSubmission[] = students.map((student) => {
      const submission = submissionMap.get(student.id) || null;

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
  };

  const loadGroupSubmissions = async (
    classId: number,
    submissionsData: StudentSubmission[],
    dueDate: Date | null
  ) => {
    // Fetch all groups in the course
    const groupsData = await getCourseGroups(classId);

    // Create a map of student_id -> submission for quick lookup
    const submissionMap = new Map<number, StudentSubmission>();
    submissionsData.forEach((sub: StudentSubmission) => {
      submissionMap.set(sub.student_id, sub);
    });

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

          // Find if any group member has submitted
          let groupSubmission: StudentSubmission | null = null;
          let submittedBy: string | undefined = undefined;

          for (const member of members) {
            const submission = submissionMap.get(member.id);
            if (submission) {
              groupSubmission = submission;
              submittedBy = member.name;
              break; // Use the first submission found
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

  const handleDownload = async (submissionId: number, filename: string) => {
    try {
      const blob = await downloadStudentSubmission(submissionId);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
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

  return (
    <Card className="w-full my-5">
      <CardHeader>
        <CardTitle>Student Submissions {isGroupAssignment && "(Group Assignment)"}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingSubmissions ? (
          <p className="text-center text-muted-foreground italic py-5">Loading submissions...</p>
        ) : error ? (
          <div className="mt-4 p-3 rounded bg-red-50 text-red-800 border border-red-400">
            {error}
          </div>
        ) : isGroupAssignment ? (
          // Render group submissions accordion
          groupsWithSubmissions.length > 0 ? (
            <div className="mt-5">
              {groupsWithSubmissions.map((groupItem) => {
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
                      {/* Expand/Collapse Icon */}
                      <div className={`mr-3 text-lg transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}>
                        ▶
                      </div>

                      {/* Group Info */}
                      <div className="flex-1 flex items-center gap-5 flex-wrap">
                        <div className="min-w-[200px]">
                          <div className="font-semibold text-base">
                            {groupItem.group.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {groupItem.members.length} member{groupItem.members.length !== 1 ? 's' : ''}
                            {groupItem.submittedBy && (
                              <span> - Submitted by: {groupItem.submittedBy}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-5 items-center">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase mb-0.5">
                              Status
                            </div>
                            <div className={`text-sm ${getStatusClasses(groupItem.status)}`}>
                              {groupItem.status}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground uppercase mb-0.5">
                              Grade
                            </div>
                            <div className="text-sm">
                              {groupItem.grade || '-'}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground uppercase mb-0.5">
                              Last Modified
                            </div>
                            <div className="text-sm">
                              {groupItem.submission ? formatDate(groupItem.submission.submitted_at) : 'N/A'}
                            </div>
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
                      <div>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Name</th>
                              <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Student ID</th>
                              <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Email</th>
                              <th className="px-4 py-3 text-left font-semibold text-xs text-gray-700 whitespace-nowrap">Status</th>
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
                                        <a
                                          href="#"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleViewProfile(member.id);
                                          }}
                                          className="text-blue-600 font-medium cursor-pointer hover:underline"
                                        >
                                          {member.name}
                                        </a>
                                        {isSubmitter && (
                                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded font-semibold">
                                            Submitter
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                                      {member.student_id || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                                      {member.email}
                                    </td>
                                    <td className={`px-4 py-3 text-sm align-middle ${getStatusClasses(groupItem.status)}`}>
                                      {groupItem.status}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                                      {groupItem.grade || '-'}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-5 text-center text-muted-foreground">
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
            <p className="text-center text-muted-foreground italic p-4 bg-white rounded border border-dashed border-gray-300">No groups created for this class</p>
          )
        ) : (
          // Render individual submissions table
          studentsWithSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-5 bg-white shadow-sm rounded-lg overflow-hidden ring-1 ring-foreground/10">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Student ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Grade</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">Last Modified</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap">File Submission</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsWithSubmissions.map((item) => (
                    <tr key={item.student.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewProfile(item.student.id);
                          }}
                          className="text-blue-600 font-medium cursor-pointer hover:underline"
                        >
                          {item.student.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        {item.student.student_id || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        {item.student.email}
                      </td>
                      <td className={`px-4 py-3 text-sm align-middle ${getStatusClasses(item.status)}`}>
                        {item.status}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        {item.grade || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        {item.submission ? formatDate(item.submission.submitted_at) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 align-middle">
                        {item.submission ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">
                              {item.submission.filename}
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDownload(item.submission!.id, item.submission!.filename)}
                            >
                              Download
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
            <p className="text-center text-muted-foreground italic p-4 bg-white rounded border border-dashed border-gray-300">No students enrolled in this class</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
