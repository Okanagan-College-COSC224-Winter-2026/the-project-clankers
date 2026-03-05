import { useState, useRef, DragEvent, ChangeEvent } from "react";
import "./AssignmentFileUpload.css";
import { uploadAssignmentFile, deleteAssignmentFile } from "../util/api";

interface AssignmentFileUploadProps {
  assignmentId: number;
  currentFile?: string | null;
  onUploadSuccess?: () => void;
}

export default function AssignmentFileUpload({ 
  assignmentId, 
  currentFile,
  onUploadSuccess 
}: AssignmentFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ["pdf", "docx", "txt"];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds 5MB limit`;
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
      if (onUploadSuccess) {
        onUploadSuccess();
      }
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await deleteAssignmentFile(assignmentId);
      setUploadSuccess(true);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="assignment-file-upload-container">
      <h3>Assignment File</h3>
      
      {currentFile ? (
        <div className="current-file-display">
          <div className="file-info">
            <span className="file-icon">📄</span>
            <span className="file-name">{currentFile}</span>
          </div>
          <button 
            className="delete-file-button"
            onClick={handleDelete}
            disabled={isUploading}
          >
            {isUploading ? "Deleting..." : "Delete File"}
          </button>
        </div>
      ) : (
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
            accept=".pdf,.docx,.txt"
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
              Allowed types: PDF, DOCX, TXT (Max 5MB)
            </p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="upload-message error">
          ❌ {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="upload-message success">
          ✅ File {currentFile ? "deleted" : "uploaded"} successfully!
        </div>
      )}
    </div>
  );
}
