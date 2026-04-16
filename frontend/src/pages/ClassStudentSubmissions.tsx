import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { parseUTC } from "../util/dates";
import TabNavigation from "../components/TabNavigation";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { isTeacher } from "../util/login";
import { importCSV } from "../util/csv";
import { listClasses, getAssignmentsByClass, getStudentSubmissions, listCourseMembers, getCourseGroups, getGroupMembers } from "../util/api";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";
import ViewSubmissionModal from "../components/ViewSubmissionModal";

interface RosterUploadResultData {
  message: string;
  enrolled_count: number;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{
    email: string;
    student_id: string;
    temp_password: string;
  }>;
  enrolled_existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
  existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
}

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

interface Assignment {
  id: number;
  name: string;
  due_date?: string;
  submission_type?: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  student_id: string;
}

interface Group {
  id: number;
  name: string;
  members?: Student[];
}

interface GroupSubmissionRow {
  groupId: number;
  groupName: string;
  status: string;
  grade?: string;
  submission?: StudentSubmission;
}

interface IndividualSubmissionRow {
  studentId: number;
  studentName: string;
  studentIdNumber: string;
  email: string;
  status: string;
  submission?: StudentSubmission;
}

interface SubmissionByAssignment {
  assignment: Assignment;
  rows: GroupSubmissionRow[] | IndividualSubmissionRow[];
  isGroupAssignment: boolean;
}

const getStatusBadgeClasses = (status: string): string => {
  switch (status) {
    case "Submitted":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "Submitted Late":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
};

export default function ClassStudentSubmissions() {
  const { id } = useParams();
  const [className, setClassName] = useState<string | null>(null);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<SubmissionByAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<number | null>(null);
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewModalEntityName, setViewModalEntityName] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const getSubmissionStatus = (submission: StudentSubmission | undefined, dueDate?: string): string => {
    if (!submission) {
      return "Not Submitted";
    }

    if (!dueDate) {
      return "Submitted";
    }

    const submittedAt = parseUTC(submission.submitted_at);
    const due = parseUTC(dueDate);

    if (submittedAt <= due) {
      return "Submitted";
    } else {
      return "Submitted Late";
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get class name
      const classes = await listClasses();
      const currentClass = classes.find((c: { id: number }) => c.id === Number(id));
      setClassName(currentClass?.name || null);

      // Get all students in the class
      const classMembersData = await listCourseMembers(id as string);
      const students: Student[] = (classMembersData || [])
        .filter((member: { role: string }) => member.role === 'student')
        .map((member: { id: number; name: string; email: string; student_id?: string }) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          student_id: member.student_id || 'N/A'
        }));

      // Get all groups in the class
      const courseGroups: Group[] = await getCourseGroups(Number(id));

      // Load members for each group
      const groupsWithMembers = await Promise.all(
        courseGroups.map(async (group) => {
          try {
            const members = await getGroupMembers(Number(id), group.id);
            return { ...group, members };
          } catch (err) {
            console.error(`Error loading members for group ${group.id}:`, err);
            return { ...group, members: [] };
          }
        })
      );

      // Get all assignments for the class
      const assignments = await getAssignmentsByClass(Number(id));

      // For each assignment, build rows based on submission type
      const submissionsData: SubmissionByAssignment[] = await Promise.all(
        assignments.map(async (assignment: Assignment) => {
          try {
            const submissions = await getStudentSubmissions(assignment.id);
            const isGroupAssignment = assignment.submission_type === 'group';

            if (isGroupAssignment) {
              // Build group rows
              const rows: GroupSubmissionRow[] = groupsWithMembers.map(group => {
                // Check if any member of this group has submitted
                const groupMemberIds = (group.members || []).map((m: Student) => m.id);

                // Consolidate submissions by group
                const groupSubmissions = submissions.filter((sub: StudentSubmission) =>
                  groupMemberIds.includes(sub.student_id)
                );

                // Merge all submissions from group members into one
                let consolidatedSubmission: StudentSubmission | undefined = undefined;
                if (groupSubmissions.length > 0) {
                  consolidatedSubmission = groupSubmissions[0];
                  // Merge additional submissions (text + file)
                  for (let i = 1; i < groupSubmissions.length; i++) {
                    const sub = groupSubmissions[i];
                    if (sub.submission_text && !consolidatedSubmission.submission_text) {
                      consolidatedSubmission.submission_text = sub.submission_text;
                    }
                    if (sub.filename && !consolidatedSubmission.filename) {
                      consolidatedSubmission.filename = sub.filename;
                      consolidatedSubmission.file_path = sub.file_path;
                    }
                    // Use the later timestamp
                    if (new Date(sub.submitted_at) > new Date(consolidatedSubmission.submitted_at)) {
                      consolidatedSubmission.submitted_at = sub.submitted_at;
                    }
                  }
                }

                const status = getSubmissionStatus(consolidatedSubmission, assignment.due_date);

                return {
                  groupId: group.id,
                  groupName: group.name,
                  status,
                  grade: undefined,
                  submission: consolidatedSubmission
                };
              });

              return {
                assignment,
                rows,
                isGroupAssignment: true
              };
            } else {
              // Build individual student rows
              const consolidatedMap = new Map<number, StudentSubmission>();

              // Consolidate multiple submissions per student (text + file)
              submissions.forEach((sub: StudentSubmission) => {
                if (consolidatedMap.has(sub.student_id)) {
                  // Merge with existing submission
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

              const rows: IndividualSubmissionRow[] = students.map(student => {
                const submission = consolidatedMap.get(student.id);
                const status = getSubmissionStatus(submission, assignment.due_date);

                return {
                  studentId: student.id,
                  studentName: student.name,
                  studentIdNumber: student.student_id,
                  email: student.email,
                  status,
                  submission
                };
              });

              return {
                assignment,
                rows,
                isGroupAssignment: false
              };
            }
          } catch (err) {
            console.error(`Error loading submissions for assignment ${assignment.id}:`, err);
            return {
              assignment,
              rows: [],
              isGroupAssignment: assignment.submission_type === 'group'
            };
          }
        })
      );

      setSubmissionsByAssignment(submissionsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSubmission = (submission: StudentSubmission, entityName: string) => {
    setSelectedSubmission(submission);
    setViewModalEntityName(entityName);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return parseUTC(dateString).toLocaleString();
  };

  const handleRosterUpload = () => {
    if (isUploadingRoster) return;
    setIsUploadingRoster(true);
    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false);
        setRosterResult(result);
        loadData();
      },
      (error) => {
        setIsUploadingRoster(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setUploadError(errorMessage);
      },
      () => {
        setIsUploadingRoster(false);
      }
    );
  };

  return (
    <>
      <div className="flex flex-row justify-between items-center p-3">
        <h2 className="text-xl font-semibold">{className}</h2>
        <div className="flex items-center gap-2">
          {isTeacher() ? (
            <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
              {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
            </Button>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/classes/${id}/groups`,
                },
                {
                  label: "Grades",
                  path: `/classes/${id}/grades`,
                },
              ]
            : [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
                {
                  label: "Grades",
                  path: `/classes/${id}/grades`,
                },
              ]
        }
      />

      <div className="p-5">
        {isLoading ? (
          <p className="text-muted-foreground">Loading submissions...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : submissionsByAssignment.length === 0 ? (
          <p className="text-muted-foreground">No assignments found.</p>
        ) : (
          <div className="space-y-5">
            {submissionsByAssignment.map(({ assignment, rows, isGroupAssignment }) => {
              const submittedCount = rows.filter((row: { status: string }) => row.status !== "Not Submitted").length;
              const total = rows.length;
              const entityType = isGroupAssignment ? 'groups' : 'students';
              const isExpanded = expandedAssignmentId === assignment.id;

              return (
                <Card key={assignment.id} className="overflow-hidden">
                  <CardHeader
                    onClick={() => setExpandedAssignmentId(isExpanded ? null : assignment.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors flex-row justify-between items-center"
                  >
                    <div>
                      <CardTitle>{assignment.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {submittedCount} of {total} {entityType} submitted
                        {assignment.due_date && (
                          <span> - Due: {formatDate(assignment.due_date)}</span>
                        )}
                      </CardDescription>
                    </div>
                    <span className="text-xl text-muted-foreground">
                      {isExpanded ? '\u25BC' : '\u25B6'}
                    </span>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      {rows.length === 0 ? (
                        <p className="text-muted-foreground m-0">
                          No {entityType} found in this class.
                        </p>
                      ) : isGroupAssignment ? (
                        // Group assignment table
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-2 text-foreground font-medium">Group Name</th>
                                <th className="text-left p-2 text-foreground font-medium">Status</th>
                                <th className="text-left p-2 text-foreground font-medium">Grade</th>
                                <th className="text-left p-2 text-foreground font-medium">File</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(rows as GroupSubmissionRow[]).map((row) => (
                                <tr key={row.groupId} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="p-2">{row.groupName}</td>
                                  <td className="p-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-sm ${getStatusBadgeClasses(row.status)}`}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="p-2 text-muted-foreground">
                                    {row.grade || '\u2014'}
                                  </td>
                                  <td className="p-2">
                                    {row.submission ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleViewSubmission(row.submission!, row.groupName)}
                                      >
                                        View
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">{'\u2014'}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        // Individual assignment table
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-2 text-foreground font-medium">Name</th>
                                <th className="text-left p-2 text-foreground font-medium">Student ID</th>
                                <th className="text-left p-2 text-foreground font-medium">Email</th>
                                <th className="text-left p-2 text-foreground font-medium">Status</th>
                                <th className="text-left p-2 text-foreground font-medium">File</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(rows as IndividualSubmissionRow[]).map((row) => (
                                <tr key={row.studentId} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="p-2">{row.studentName}</td>
                                  <td className="p-2 text-sm text-muted-foreground">
                                    {row.studentIdNumber}
                                  </td>
                                  <td className="p-2 text-sm text-muted-foreground">
                                    {row.email}
                                  </td>
                                  <td className="p-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-sm ${getStatusBadgeClasses(row.status)}`}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    {row.submission ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleViewSubmission(row.submission!, row.studentName)}
                                      >
                                        View
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">{'\u2014'}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

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

      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}

      <ViewSubmissionModal
        submission={selectedSubmission}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        entityName={viewModalEntityName}
      />
    </>
  );
}
