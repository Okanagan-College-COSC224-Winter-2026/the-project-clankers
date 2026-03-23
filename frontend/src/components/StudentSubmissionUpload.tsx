import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import "./AssignmentFileUpload.css"; // Reuse the same styles
import { uploadStudentSubmission, deleteStudentSubmission, getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, getCurrentUserProfile } from "../util/api";

interface StudentSubmission {
  id: number;
  filename: string;
  file_path: string;
  submitted_at: string;
  student_id: number;
  student_name?: string;
}

interface Assignment {
  id: number;
  name: string;
  submission_type?: string;
  due_date?: string;
}

interface StudentSubmissionUploadProps {
  assignmentId: number;
}

export default function StudentSubmissionUpload({ 
  assignmentId
}: StudentSubmissionUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ["pdf", "docx", "txt", "zip"];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Load assignment details, current user ID, and existing submissions
  useEffect(() => {
    const initialize = async () => {
      try {
        const [assignmentData, userProfile] = await Promise.all([
          getAssignmentDetails(assignmentId),
          getCurrentUserProfile()
        ]);
        setAssignment(assignmentData);
        setCurrentUserId(userProfile.id);
      } catch (err) {
        console.error('Error loading assignment details:', err);
      }
    };
    initialize();
    loadSubmissions();
  }, [assignmentId]);

  const loadSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const submissionsData = await getStudentSubmissions(assignmentId);
      setSubmissions(submissionsData);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds 50MB limit`;
    }

    return null;
  };

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadStudentSubmission(assignmentId, file);
      setUploadSuccess(true);
      setUploadError(null);
      await loadSubmissions(); // Reload the submission list
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFile(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFile(selectedFiles[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (submissionId: number) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) {
      return;
    }

    try {
      await deleteStudentSubmission(submissionId);
      await loadSubmissions(); // Reload the submission list
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
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
      setUploadError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const getSubmissionStatus = (submittedAt: string): { text: string; color: string } => {
    if (!assignment?.due_date) {
      return { text: "Submitted", color: "#2196f3" }; // Blue for no due date
    }

    const dueDate = new Date(assignment.due_date);
    const submissionDate = new Date(submittedAt);

    if (submissionDate <= dueDate) {
      return { text: "On Time", color: "#4caf50" }; // Green
    } else {
      return { text: "Late", color: "#f44336" }; // Red
    }
  };

  const formatSubmissionTime = (submittedAt: string): string => {
    const date = new Date(submittedAt);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="assignment-file-upload-container">
      <h3>My Submissions</h3>
      {assignment?.submission_type === 'group' && (
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
          This is a group assignment. Any group member's submission will appear here.
        </p>
      )}
      
      {/* Existing submissions list */}
      {isLoadingSubmissions ? (
        <p className="loading-message">Loading submissions...</p>
      ) : submissions.length > 0 ? (
        <div className="files-list">
          {submissions.map((submission) => {
            const isOwnSubmission = currentUserId === submission.student_id;
            const isGroupAssignment = assignment?.submission_type === 'group';
            const status = getSubmissionStatus(submission.submitted_at);
            
            return (
              <div key={submission.id} className="file-item" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* File name and icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="file-icon" style={{ fontSize: '1.5em' }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div className="file-name" style={{ fontWeight: 600, fontSize: '1.05em', marginBottom: '4px' }}>
                        {submission.filename}
                      </div>
                    </div>
                  </div>

                  {/* Submission details */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    fontSize: '0.9em'
                  }}>
                    {isGroupAssignment && submission.student_name && (
                      <div>
                        <div style={{ color: '#666', fontSize: '0.85em', marginBottom: '2px' }}>Submitted by</div>
                        <div style={{ fontWeight: 500 }}>{submission.student_name}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: '#666', fontSize: '0.85em', marginBottom: '2px' }}>Submitted at</div>
                      <div style={{ fontWeight: 500 }}>{formatSubmissionTime(submission.submitted_at)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.85em', marginBottom: '2px' }}>Status</div>
                      <div style={{ 
                        fontWeight: 600,
                        color: status.color,
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: `${status.color}15`
                      }}>
                        {status.text}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="file-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="download-file-button"
                      onClick={() => handleDownload(submission.id, submission.filename)}
                    >
                      Download
                    </button>
                    {isOwnSubmission && (
                      <button 
                        className="delete-file-button-small"
                        onClick={() => handleDelete(submission.id)}
                      >
                        Delete
                      </button>
                    )}
                    {isGroupAssignment && !isOwnSubmission && (
                      <span style={{ 
                        fontSize: '0.85em', 
                        color: '#999', 
                        padding: '4px 8px' 
                      }}>
                        (Group submission)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="no-files-message">No submissions yet</p>
      )}

      {/* Upload new submission section */}
      <div className="upload-section">
        <h4>Submit New File</h4>
        <div
          className={`file-drop-zone ${isDragging ? "dragging" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,.docx,.txt,.zip"
            style={{ display: "none" }}
          />
          
          <div className="drop-zone-content">
            <div className="upload-icon">📁</div>
            <p className="drop-zone-text">
              {isDragging ? "Drop file here..." : "Drag and drop a file here"}
            </p>
            <p className="drop-zone-or">or</p>
            <button
              className="browse-button"
              onClick={handleBrowseClick}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Browse Files"}
            </button>
            <p className="file-requirements">
              Allowed types: PDF, DOCX, TXT, ZIP (Max 50MB)
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="upload-message error">
          ❌ {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="upload-message success">
          ✅ File submitted successfully!
        </div>
      )}
    </div>
  );
}
