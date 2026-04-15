import { useState, useEffect } from "react";
import { getAssignmentFiles, downloadAssignmentFile } from "../util/api";
import { parseUTC } from "../util/dates";

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

  useEffect(() => {
    loadFiles();
  }, [assignmentId]);

  const loadFiles = async () => {
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
  };

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
      <div className="w-full my-5 p-5 bg-gray-50 rounded-lg">
        <p className="text-center text-gray-500 italic p-5">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full my-5 p-5 bg-gray-50 rounded-lg">
        <p className="text-center text-gray-400 italic p-5 bg-white rounded border border-dashed border-gray-300">
          No files attached to this assignment
        </p>
      </div>
    );
  }

  return (
    <div className="w-full my-5 p-5 bg-gray-50 rounded-lg">
      <h3 className="m-0 mb-4 text-xl text-gray-800">Assignment Files</h3>
      <div className="flex flex-col gap-2.5">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-white border-2 border-blue-500 rounded-lg transition-colors hover:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">📄</span>
              <span className="text-base text-gray-800 font-medium flex-1">{file.filename}</span>
              <span className="text-sm text-gray-500 ml-auto pr-4">
                {parseUTC(file.uploaded_at).toLocaleDateString()}
              </span>
            </div>
            <button
              className="px-6 py-2.5 bg-blue-500 text-white rounded cursor-pointer transition-colors text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              onClick={() => handleDownload(file.id, file.filename)}
              disabled={downloadingFileId === file.id}
            >
              {downloadingFileId === file.id ? "Downloading..." : "Download"}
            </button>
          </div>
        ))}
      </div>

      {downloadError && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-400 rounded text-sm">
          ❌ {downloadError}
        </div>
      )}
    </div>
  );
}
