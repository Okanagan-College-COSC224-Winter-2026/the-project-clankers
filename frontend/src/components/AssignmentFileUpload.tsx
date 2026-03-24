import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
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
    <div className="w-full my-5 p-5 bg-gray-50 rounded-lg">
      <h3>Assignment Files</h3>

      {/* Existing files list */}
      {isLoadingFiles ? (
        <p className="text-center text-gray-500 italic p-5">Loading files...</p>
      ) : files.length > 0 ? (
        <div className="flex flex-col gap-2.5 mb-5">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-4 bg-white border-2 border-green-500 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">📄</span>
                <span className="text-base font-medium text-gray-800 flex-1">{file.filename}</span>
                <span>
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  onClick={() => handleDownload(file.id, file.filename)}
                >
                  Download
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 italic p-4 bg-white rounded border border-dashed border-gray-300">No files uploaded yet</p>
      )}

      {/* Upload new file section */}
      <div className="mt-5 pt-5 border-t-2 border-gray-300">
        <h4>Add New File</h4>
        <div
          className={`w-full min-h-[200px] border-[3px] rounded-lg flex items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? "border-green-500 bg-green-50 border-solid"
              : "border-dashed border-gray-300 bg-white hover:border-green-500 hover:bg-blue-50"
          }`}
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
            className="hidden"
          />

          <div className="text-center p-5">
            <div className="text-5xl mb-4">📁</div>
            <p className="text-lg text-gray-600 my-2.5">
              {isDragging ? "Drop file here..." : "Drag and drop a file here"}
            </p>
            <p className="text-sm text-gray-400 my-4">or</p>
            <button
              className="px-8 py-3 text-base bg-green-500 text-white rounded font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={handleBrowseClick}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Browse Files"}
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Allowed types: PDF, DOCX, TXT, ZIP (Max 50MB)
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-800 border border-red-400">
          {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-4 p-3 rounded bg-green-50 text-green-800 border border-green-400">
          File uploaded successfully!
        </div>
      )}
    </div>
  );
}
