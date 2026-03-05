import { useState } from "react";
import "./AssignmentFileDisplay.css";
import { downloadAssignmentFile } from "../util/api";

interface AssignmentFileDisplayProps {
  assignmentId: number;
  filename: string | null;
}

export default function AssignmentFileDisplay({ 
  assignmentId, 
  filename 
}: AssignmentFileDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const blob = await downloadAssignmentFile(assignmentId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "assignment-file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!filename) {
    return (
      <div className="assignment-file-display">
        <p className="no-file-message">No file attached to this assignment</p>
      </div>
    );
  }

  return (
    <div className="assignment-file-display">
      <h3>Assignment File</h3>
      <div className="file-card">
        <div className="file-info">
          <span className="file-icon">📄</span>
          <span className="file-name">{filename}</span>
        </div>
        <button 
          className="download-button"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? "Downloading..." : "Download"}
        </button>
      </div>
      
      {downloadError && (
        <div className="download-error">
          ❌ {downloadError}
        </div>
      )}
    </div>
  );
}
