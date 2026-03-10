import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import Button from "../components/Button";
import { isTeacher } from "../util/login";
import { importCSV } from "../util/csv";
import { listClasses, getAssignmentsByClass, getStudentSubmissions, downloadStudentSubmission, listCourseMembers } from "../util/api";
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
}

interface SubmissionByAssignment {
  assignment: Assignment;
  submissions: StudentSubmission[];
  totalStudents: number;
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
      const students = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');
      const totalStudents = students.length;

      // Get all assignments for the class
      const assignments = await getAssignmentsByClass(Number(id));

      // For each assignment, get all submissions
      const submissionsData: SubmissionByAssignment[] = await Promise.all(
        assignments.map(async (assignment: Assignment) => {
          try {
            const submissions = await getStudentSubmissions(assignment.id);
            return {
              assignment,
              submissions,
              totalStudents
            };
          } catch (err) {
            console.error(`Error loading submissions for assignment ${assignment.id}:`, err);
            return {
              assignment,
              submissions: [],
              totalStudents
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
            {submissionsByAssignment.map(({ assignment, submissions, totalStudents }) => (
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
                      {submissions.length} of {totalStudents} students submitted
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
                    {submissions.length === 0 ? (
                      <p style={{ color: '#6b7280', margin: 0 }}>No submissions yet.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Student</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>File</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Submitted At</th>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#374151' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((submission) => (
                            <tr key={submission.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px' }}>{submission.student_name}</td>
                              <td style={{ padding: '8px' }}>{submission.filename}</td>
                              <td style={{ padding: '8px', fontSize: '14px', color: '#6b7280' }}>
                                {formatDate(submission.submitted_at)}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <button
                                  onClick={() => handleDownload(submission.id, submission.filename)}
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
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
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
