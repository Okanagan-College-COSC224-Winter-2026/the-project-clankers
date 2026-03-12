import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import "./AssignmentFileUpload.css"; // Reuse the same styles
import { uploadStudentSubmission, deleteStudentSubmission, getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, getUserId } from "../util/api";

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
        const [assignmentData, userId] = await Promise.all([
          getAssignmentDetails(assignmentId),
          getUserId()
        ]);
        setAssignment(assignmentData);
        setCurrentUserId(userId);
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
            
            return (
              <div key={submission.id} className="file-item">
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="file-name">{submission.filename}</span>
                    {isGroupAssignment && submission.student_name && (
                      <span style={{ fontSize: '0.85em', color: '#666' }}>
                        Submitted by: {submission.student_name}
                      </span>
                    )}
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
