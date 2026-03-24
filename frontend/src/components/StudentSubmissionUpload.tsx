import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { uploadStudentSubmission, deleteStudentSubmission, getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, getCurrentUserProfile } from "../util/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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

  const getSubmissionStatus = (submittedAt: string): { text: string; colorClass: string; bgClass: string } => {
    if (!assignment?.due_date) {
      return { text: "Submitted", colorClass: "text-blue-500", bgClass: "bg-blue-500/10" };
    }

    const dueDate = new Date(assignment.due_date);
    const submissionDate = new Date(submittedAt);

    if (submissionDate <= dueDate) {
      return { text: "On Time", colorClass: "text-green-500", bgClass: "bg-green-500/10" };
    } else {
      return { text: "Late", colorClass: "text-red-500", bgClass: "bg-red-500/10" };
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
    <Card className="w-full my-5">
      <CardHeader>
        <CardTitle>My Submissions</CardTitle>
        {assignment?.submission_type === 'group' && (
          <p className="text-sm text-muted-foreground">
            This is a group assignment. Any group member's submission will appear here.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Existing submissions list */}
        {isLoadingSubmissions ? (
          <p className="text-center text-muted-foreground italic py-5">Loading submissions...</p>
        ) : submissions.length > 0 ? (
          <div className="flex flex-col gap-2.5 mb-5">
            {submissions.map((submission) => {
              const isOwnSubmission = currentUserId === submission.student_id;
              const isGroupAssignment = assignment?.submission_type === 'group';
              const status = getSubmissionStatus(submission.submitted_at);

              return (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-white border-2 border-green-500 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-3">
                    {/* File name and icon */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1">
                        <div className="text-base font-semibold mb-1">
                          {submission.filename}
                        </div>
                      </div>
                    </div>

                    {/* Submission details */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 p-3 bg-gray-100 rounded-md text-sm">
                      {isGroupAssignment && submission.student_name && (
                        <div>
                          <div className="text-muted-foreground text-xs mb-0.5">Submitted by</div>
                          <div className="font-medium">{submission.student_name}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground text-xs mb-0.5">Submitted at</div>
                        <div className="font-medium">{formatSubmissionTime(submission.submitted_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-0.5">Status</div>
                        <div className={`font-semibold inline-block px-2 py-0.5 rounded ${status.colorClass} ${status.bgClass}`}>
                          {status.text}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(submission.id, submission.filename)}
                      >
                        Download
                      </Button>
                      {isOwnSubmission && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(submission.id)}
                        >
                          Delete
                        </Button>
                      )}
                      {isGroupAssignment && !isOwnSubmission && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
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
          <p className="text-center text-muted-foreground italic p-4 bg-white rounded border border-dashed border-gray-300">No submissions yet</p>
        )}

        {/* Upload new submission section */}
        <div className="mt-5 pt-5 border-t-2 border-gray-300">
          <h4 className="text-lg font-semibold mb-4">Submit New File</h4>
          <div
            className={`w-full min-h-[200px] border-3 border-dashed rounded-lg flex items-center justify-center bg-white cursor-pointer transition-all ${
              isDragging
                ? "border-green-500 bg-green-50 border-solid"
                : "border-gray-300 hover:border-green-500 hover:bg-blue-50"
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
              <p className="text-lg text-muted-foreground my-2.5">
                {isDragging ? "Drop file here..." : "Drag and drop a file here"}
              </p>
              <p className="text-sm text-muted-foreground my-4">or</p>
              <Button
                variant="default"
                size="lg"
                onClick={handleBrowseClick}
                disabled={isUploading}
                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white"
              >
                {isUploading ? "Uploading..." : "Browse Files"}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
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
            File submitted successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
