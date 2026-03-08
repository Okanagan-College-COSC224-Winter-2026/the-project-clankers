import { useState, useEffect } from "react";
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
  name: string;
  email: string;
}

interface StudentWithSubmission {
  student: Student;
  submission: StudentSubmission | null;
  status: "Submitted" | "Submitted Late" | "No Submission";
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
      const students: Student[] = (classMembersData || []).filter((member: any) => member.role === 'student');

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
        <div className="files-list">
          {studentsWithSubmissions.map((item) => (
            <div key={item.student.id} className="file-item">
              <div className="file-info">
                <span className="file-icon">
                  {item.status === "Submitted" ? "✅" : 
                   item.status === "Submitted Late" ? "⚠️" : "❌"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className="file-name">{item.student.name}</span>
                  {item.submission && (
                    <span style={{ fontSize: "0.85em", color: "#666" }}>
                      File: {item.submission.filename}
                    </span>
                  )}
                </div>
                <span 
                  className="file-date" 
                  style={{
                    color: item.status === "Submitted Late" ? "#ff9800" : 
                           item.status === "No Submission" ? "#d32f2f" : "#4caf50",
                    fontWeight: 500
                  }}
                >
                  {item.status}
                </span>
              </div>
              <div className="file-actions">
                {item.submission && (
                  <button 
                    className="download-file-button"
                    onClick={() => handleDownload(item.submission!.id, item.submission!.filename)}
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-files-message">No students enrolled in this class</p>
      )}
    </div>
  );
}
