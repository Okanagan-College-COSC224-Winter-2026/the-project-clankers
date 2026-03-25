import { useState, useEffect, useCallback } from "react";
import "./AssignmentFileDisplay.css";
import { getAssignmentFiles, downloadAssignmentFile } from "../util/api";

interface AssignmentFile {
  id: number;
  filename: string;
  uploaded_at: string;
  uploaded_by: number;
}

interface AssignmentFileDisplayProps {
  assignmentId: number;
}

export default function AssignmentFileDisplay({
  assignmentId
}: AssignmentFileDisplayProps) {
  const [files, setFiles] = useState<AssignmentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const filesData = await getAssignmentFiles(assignmentId);
      setFiles(filesData);
    } catch (err) {
      console.error("Failed to load files:", err);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDownload = async (fileId: number, filename: string) => {
    setDownloadingFileId(fileId);
    setDownloadError(null);

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
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="assignment-file-display">
        <p className="loading-message">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="assignment-file-display">
        <p className="no-file-message">No files attached to this assignment</p>
      </div>
    );
  }

  return (
    <div className="assignment-file-display">
      <h3>Assignment Files</h3>
      <div className="files-list">
        {files.map((file) => (
          <div key={file.id} className="file-card">
            <div className="file-info">
              <span className="file-icon">📄</span>
              <span className="file-name">{file.filename}</span>
              <span className="file-date">
                {new Date(file.uploaded_at).toLocaleDateString()}
              </span>
            </div>
            <button 
              className="download-button"
              onClick={() => handleDownload(file.id, file.filename)}
              disabled={downloadingFileId === file.id}
            >
              {downloadingFileId === file.id ? "Downloading..." : "Download"}
            </button>
          </div>
        ))}
      </div>
      
      {downloadError && (
        <div className="download-error">
          ❌ {downloadError}
        </div>
      )}
    </div>
  );
}
