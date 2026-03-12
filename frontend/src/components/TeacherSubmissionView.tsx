import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AssignmentFileUpload.css"; // Reuse the same styles
import { getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, listCourseMembers } from "../util/api";

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

interface TeacherSubmissionViewProps {
  assignmentId: number;
}

export default function TeacherSubmissionView({ 
  assignmentId
}: TeacherSubmissionViewProps) {
  const [studentsWithSubmissions, setStudentsWithSubmissions] = useState<StudentWithSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load all student submissions and class roster
  useEffect(() => {
    loadSubmissionsAndStudents();
  }, [assignmentId]);

  const loadSubmissionsAndStudents = async () => {
    setIsLoadingSubmissions(true);
    setError(null);
    try {
      // Fetch assignment details to get class ID and due date
      const assignmentData = await getAssignmentDetails(assignmentId);
      const classId = assignmentData.courseID || assignmentData.course?.id;
      const dueDate = assignmentData.due_date ? new Date(assignmentData.due_date) : null;

      if (!classId) {
        throw new Error("Could not determine class ID for this assignment");
      }

      // Fetch all students in the class
      const classMembersData = await listCourseMembers(String(classId));
      // Filter to only include students (not the teacher)
      const students: Student[] = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');

      // Fetch all submissions for this assignment
      const submissionsData = await getStudentSubmissions(assignmentId);

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
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setIsLoadingSubmissions(false);
    }
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Submitted":
        return { color: "#4caf50", fontWeight: 500 };
      case "Submitted Late":
        return { color: "#ff9800", fontWeight: 500 };
      case "No Submission":
        return { color: "#d32f2f", fontWeight: 500 };
      default:
        return {};
    }
  };

  return (
    <div className="assignment-file-upload-container">
      <h3>Student Submissions</h3>
      
      {isLoadingSubmissions ? (
        <p className="loading-message">Loading submissions...</p>
      ) : error ? (
        <div className="upload-message error">
          ❌ {error}
        </div>
      ) : studentsWithSubmissions.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '20px',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #ddd'
              }}>
                <th style={tableHeaderStyle}>Name</th>
                <th style={tableHeaderStyle}>Student ID</th>
                <th style={tableHeaderStyle}>Email</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Grade</th>
                <th style={tableHeaderStyle}>Last Modified</th>
                <th style={tableHeaderStyle}>File Submission</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithSubmissions.map((item) => (
                <tr key={item.student.id} style={{
                  borderBottom: '1px solid #eee',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={tableCellStyle}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewProfile(item.student.id);
                      }}
                      style={{
                        color: '#1976d2',
                        textDecoration: 'none',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {item.student.name}
                    </a>
                  </td>
                  <td style={tableCellStyle}>
                    {item.student.student_id || 'N/A'}
                  </td>
                  <td style={tableCellStyle}>
                    {item.student.email}
                  </td>
                  <td style={{...tableCellStyle, ...getStatusStyle(item.status)}}>
                    {item.status}
                  </td>
                  <td style={tableCellStyle}>
                    {item.grade || '-'}
                  </td>
                  <td style={tableCellStyle}>
                    {item.submission ? formatDate(item.submission.submitted_at) : 'N/A'}
                  </td>
                  <td style={tableCellStyle}>
                    {item.submission ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.9em' }}>
                          {item.submission.filename}
                        </span>
                        <button 
                          onClick={() => handleDownload(item.submission!.id, item.submission!.filename)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85em',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                        >
                          Download
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>No file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-files-message">No students enrolled in this class</p>
      )}
    </div>
  );
}

// Table styles
const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.9em',
  color: '#333',
  whiteSpace: 'nowrap'
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '0.9em',
  color: '#555',
  verticalAlign: 'middle'
};
