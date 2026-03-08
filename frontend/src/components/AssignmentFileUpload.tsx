import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import "./AssignmentFileUpload.css";
import { uploadAssignmentFile, deleteAssignmentFile, getAssignmentFiles, downloadAssignmentFile } from "../util/api";

interface AssignmentFile {
  id: number;
  filename: string;
  file_path: string;
  uploaded_at: string;
}

interface AssignmentFileUploadProps {
  assignmentId: number;
}

export default function AssignmentFileUpload({ 
  assignmentId
}: AssignmentFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [files, setFiles] = useState<AssignmentFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ["pdf", "docx", "txt", "zip"];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Load existing files
  useEffect(() => {
    loadFiles();
  }, [assignmentId]);

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const filesData = await getAssignmentFiles(assignmentId);
      setFiles(filesData);
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoadingFiles(false);
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
      await uploadAssignmentFile(assignmentId, file);
      setUploadSuccess(true);
      setUploadError(null);
      await loadFiles(); // Reload the file list
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

  const handleDelete = async (fileId: number) => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      await deleteAssignmentFile(fileId);
      await loadFiles(); // Reload the file list
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const blob = await downloadAssignmentFile(fileId);
      
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
      <h3>Assignment Files</h3>
      
      {/* Existing files list */}
      {isLoadingFiles ? (
        <p className="loading-message">Loading files...</p>
      ) : files.length > 0 ? (
        <div className="files-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.filename}</span>
                <span className="file-date">
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              <div className="file-actions">
                <button 
                  className="download-file-button"
                  onClick={() => handleDownload(file.id, file.filename)}
                >
                  Download
                </button>
                <button 
                  className="delete-file-button-small"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-files-message">No files uploaded yet</p>
      )}

      {/* Upload new file section */}
      <div className="upload-section">
        <h4>Add New File</h4>
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
          ✅ File uploaded successfully!
        </div>
      )}
    </div>
  );
}
