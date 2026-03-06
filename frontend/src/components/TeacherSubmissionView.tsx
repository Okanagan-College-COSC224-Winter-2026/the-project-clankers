import { useState, useEffect } from "react";
import "./AssignmentFileUpload.css"; // Reuse the same styles
import { getStudentSubmissions, downloadStudentSubmission } from "../util/api";

interface StudentSubmission {
  id: number;
  filename: string;
  file_path: string;
  submitted_at: string;
  student_id: number;
  student_name: string;
  assignment_id: number;
}

interface TeacherSubmissionViewProps {
  assignmentId: number;
}

export default function TeacherSubmissionView({ 
  assignmentId
}: TeacherSubmissionViewProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all student submissions
  useEffect(() => {
    loadSubmissions();
  }, [assignmentId]);

  const loadSubmissions = async () => {
    setIsLoadingSubmissions(true);
    setError(null);
    try {
      const submissionsData = await getStudentSubmissions(assignmentId);
      setSubmissions(submissionsData);
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
      ) : submissions.length > 0 ? (
        <div className="files-list">
          {submissions.map((submission) => (
            <div key={submission.id} className="file-item">
              <div className="file-info">
                <span className="file-icon">📄</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className="file-name">{submission.filename}</span>
                  <span style={{ fontSize: "0.9em", color: "#666" }}>
                    Submitted by: {submission.student_name}
                  </span>
                </div>
                <span className="file-date">
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </span>
              </div>
              <div className="file-actions">
                <button 
                  className="download-file-button"
                  onClick={() => handleDownload(submission.id, submission.filename)}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-files-message">No student submissions yet</p>
      )}
    </div>
  );
}
