import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import Button from "../components/Button";
import { isTeacher } from "../util/login";
import { importCSV } from "../util/csv";
import { listClasses, getAssignmentsByClass, getStudentSubmissions, downloadStudentSubmission, listCourseMembers, getCourseGroups, getGroupMembers } from "../util/api";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";
import "./ClassMembers.css"; // Reuse similar styling

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
  filename: string;
  file_path: string;
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
    
    const submittedAt = new Date(submission.submitted_at);
    const due = new Date(dueDate);
    
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
        .map((member: any) => ({
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
                const groupSubmission = submissions.find((sub: StudentSubmission) => 
                  groupMemberIds.includes(sub.student_id)
                );
                
                const status = getSubmissionStatus(groupSubmission, assignment.due_date);
                
                return {
                  groupId: group.id,
                  groupName: group.name,
                  status,
                  grade: undefined, // TODO: Add when grade field is available
                  submission: groupSubmission
                };
              });
              
              return {
                assignment,
                rows,
                isGroupAssignment: true
              };
            } else {
              // Build individual student rows
              const submissionMap = new Map<number, StudentSubmission>();
              submissions.forEach((sub: StudentSubmission) => {
                submissionMap.set(sub.student_id, sub);
              });
              
              const rows: IndividualSubmissionRow[] = students.map(student => {
                const submission = submissionMap.get(student.id);
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

  const handleDownload = async (submissionId: number, filename: string) => {
    try {
      const blob = await downloadStudentSubmission(submissionId);
      
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
      <div className="ClassHeader">
        <h2>{className}</h2>
        <div className="ClassHeaderRight">
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
                  label: "Student Submissions",
                  path: `/classes/${id}/student-submissions`,
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
              ]
        }
      /> 

      <div style={{ padding: '20px' }}>
        {isLoading ? (
          <p style={{ color: '#6b7280' }}>Loading submissions...</p>
        ) : error ? (
          <p style={{ color: '#ef4444' }}>{error}</p>
        ) : submissionsByAssignment.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No assignments found.</p>
        ) : (
          <div>
            {submissionsByAssignment.map(({ assignment, rows, isGroupAssignment }) => {
              const submittedCount = rows.filter((row: any) => row.status !== "Not Submitted").length;
              const total = rows.length;
              const entityType = isGroupAssignment ? 'groups' : 'students';
              
              return (
                <div key={assignment.id} style={{
                  marginBottom: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div
                    onClick={() => setExpandedAssignmentId(
                      expandedAssignmentId === assignment.id ? null : assignment.id
                    )}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong>{assignment.name}</strong>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        {submittedCount} of {total} {entityType} submitted
                        {assignment.due_date && (
                          <span> • Due: {formatDate(assignment.due_date)}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '20px' }}>
                      {expandedAssignmentId === assignment.id ? '▼' : '▶'}
                    </span>
                  </div>

                  {expandedAssignmentId === assignment.id && (
                    <div style={{ padding: '16px' }}>
                      {rows.length === 0 ? (
                        <p style={{ color: '#6b7280', margin: 0 }}>
                          No {entityType} found in this class.
                        </p>
                      ) : isGroupAssignment ? (
                        // Group assignment table
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Group Name</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Status</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Grade</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>File</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rows as GroupSubmissionRow[]).map((row) => (
                              <tr key={row.groupId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px' }}>{row.groupName}</td>
                                <td style={{ padding: '8px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    backgroundColor: 
                                      row.status === "Submitted" ? '#d1fae5' :
                                      row.status === "Submitted Late" ? '#fed7aa' :
                                      '#f3f4f6',
                                    color:
                                      row.status === "Submitted" ? '#065f46' :
                                      row.status === "Submitted Late" ? '#9a3412' :
                                      '#6b7280'
                                  }}>
                                    {row.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', color: '#6b7280' }}>
                                  {row.grade || '—'}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {row.submission ? (
                                    <button
                                      onClick={() => handleDownload(row.submission!.id, row.submission!.filename)}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                    >
                                      Download
                                    </button>
                                  ) : (
                                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        // Individual assignment table
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Name</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Student ID</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Email</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Status</th>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>File</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rows as IndividualSubmissionRow[]).map((row) => (
                              <tr key={row.studentId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px' }}>{row.studentName}</td>
                                <td style={{ padding: '8px', fontSize: '14px', color: '#6b7280' }}>
                                  {row.studentIdNumber}
                                </td>
                                <td style={{ padding: '8px', fontSize: '14px', color: '#6b7280' }}>
                                  {row.email}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    backgroundColor: 
                                      row.status === "Submitted" ? '#d1fae5' :
                                      row.status === "Submitted Late" ? '#fed7aa' :
                                      '#f3f4f6',
                                    color:
                                      row.status === "Submitted" ? '#065f46' :
                                      row.status === "Submitted Late" ? '#9a3412' :
                                      '#6b7280'
                                  }}>
                                    {row.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {row.submission ? (
                                    <button
                                      onClick={() => handleDownload(row.submission!.id, row.submission!.filename)}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                    >
                                      Download
                                    </button>
                                  ) : (
                                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
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
    </>
  );
}
