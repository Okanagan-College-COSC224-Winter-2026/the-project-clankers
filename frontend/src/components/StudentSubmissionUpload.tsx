import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { uploadStudentSubmission, editStudentSubmission, deleteStudentSubmission, getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, getCurrentUserProfile } from "../util/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface StudentSubmission {
  id: number;
  filename?: string;
  file_path?: string;
  submission_text?: string;
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
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<StudentSubmission | null>(null);
  const [editTextInput, setEditTextInput] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editRemoveFile, setEditRemoveFile] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile && !textInput.trim()) {
      setUploadError("Please provide a file and/or text");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadStudentSubmission(assignmentId, {
        file: selectedFile || undefined,
        text: textInput.trim() || undefined,
      });
      setUploadSuccess(true);
      setUploadError(null);
      setTextInput('');
      setSelectedFile(null);
      await loadSubmissions();
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

  const handleEditSave = async () => {
    if (!editingSubmission) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      await editStudentSubmission(editingSubmission.id, {
        text: editTextInput,
        file: editFile || undefined,
        removeFile: editRemoveFile && !editFile,
      });
      setEditingSubmission(null);
      setEditTextInput('');
      setEditFile(null);
      setEditRemoveFile(false);
      setUploadSuccess(true);
      await loadSubmissions();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const error = validateFile(selectedFiles[0]);
      if (error) {
        setUploadError(error);
        return;
      }
      setEditFile(selectedFiles[0]);
      setEditRemoveFile(false);
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const startEditing = (submission: StudentSubmission) => {
    setEditingSubmission(submission);
    setEditTextInput(submission.submission_text || '');
    setEditFile(null);
    setEditRemoveFile(false);
    setIsEditDragging(false);
    setUploadError(null);
  };

  const cancelEditing = () => {
    setEditingSubmission(null);
    setEditTextInput('');
    setEditFile(null);
    setEditRemoveFile(false);
    setIsEditDragging(false);
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
              const hasFile = !!submission.filename;
              const hasText = !!submission.submission_text;
              const status = getSubmissionStatus(submission.submitted_at);

              return (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-white border-2 border-green-500 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-3 w-full">
                    {/* File name and icon */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{hasFile ? '📄' : '📝'}</span>
                      <div className="flex-1">
                        <div className="text-base font-semibold mb-1">
                          {hasFile ? submission.filename : 'Text Submission'}
                        </div>
                        {hasFile && hasText && (
                          <div className="text-xs text-muted-foreground">Includes text submission</div>
                        )}
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

                    {/* Text submission display */}
                    {hasText && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md max-h-40 overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.submission_text}</p>
                      </div>
                    )}

                    {/* Edit form (inline) */}
                    {editingSubmission?.id === submission.id && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-3">
                        {/* Text editor */}
                        <div>
                          <label className="text-sm font-medium">Text (optional):</label>
                          <textarea
                            value={editTextInput}
                            onChange={(e) => setEditTextInput(e.target.value)}
                            placeholder="Add or edit your text submission..."
                            className="w-full min-h-[120px] p-2 border border-gray-300 rounded resize-vertical focus:border-green-500 focus:outline-none text-sm mt-1"
                          />
                        </div>

                        {/* File section */}
                        <div>
                          <label className="text-sm font-medium">File (optional):</label>
                          {submission.filename && !editRemoveFile && !editFile && (
                            <div className="flex items-center gap-2 mt-1 p-2 bg-white rounded border text-sm">
                              <span>📄 {submission.filename}</span>
                              <Button size="sm" variant="destructive" className="h-6 text-xs"
                                onClick={() => setEditRemoveFile(true)}>Remove</Button>
                            </div>
                          )}
                          {(editRemoveFile || !submission.filename) && !editFile && (
                            <div
                              className={`mt-1 min-h-[100px] border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                                isEditDragging
                                  ? "border-green-500 bg-green-50 border-solid"
                                  : "border-gray-300 hover:border-green-500 hover:bg-blue-50"
                              }`}
                              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditDragging(true); }}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditDragging(false); }}
                              onDrop={(e) => {
                                e.preventDefault(); e.stopPropagation(); setIsEditDragging(false);
                                const files = e.dataTransfer.files;
                                if (files && files.length > 0) {
                                  const error = validateFile(files[0]);
                                  if (error) { setUploadError(error); return; }
                                  setEditFile(files[0]);
                                  setEditRemoveFile(false);
                                }
                              }}
                            >
                              <input
                                type="file"
                                ref={editFileInputRef}
                                onChange={handleEditFileInput}
                                accept=".pdf,.docx,.txt,.zip"
                                className="hidden"
                              />
                              <div className="text-center p-3">
                                <div className="text-3xl mb-1">📁</div>
                                <p className="text-sm text-muted-foreground">
                                  {isEditDragging ? "Drop file here..." : "Drag and drop or"}
                                </p>
                                {!isEditDragging && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="mt-1 bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => editFileInputRef.current?.click()}
                                  >
                                    Browse Files
                                  </Button>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, ZIP (Max 50MB)</p>
                              </div>
                            </div>
                          )}
                          {editFile && (
                            <div className="flex items-center gap-2 mt-1 p-2 bg-green-50 rounded border border-green-200 text-sm">
                              <span>📄 {editFile.name} (new)</span>
                              <Button size="sm" variant="outline" className="h-6 text-xs"
                                onClick={() => { setEditFile(null); if (editFileInputRef.current) editFileInputRef.current.value = ''; }}>Remove</Button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditSave} disabled={isUploading || (!editTextInput.trim() && !editFile && !(submission.filename && !editRemoveFile))}
                            className="bg-green-500 hover:bg-green-600 text-white">
                            {isUploading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 items-center">
                      {hasFile && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(submission.id, submission.filename)}
                        >
                          Download
                        </Button>
                      )}
                      {isOwnSubmission && editingSubmission?.id !== submission.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(submission)}
                        >
                          Edit
                        </Button>
                      )}
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
          <h4 className="text-lg font-semibold mb-4">Submit New</h4>

          {/* Text submission */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Text (optional)</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text submission here..."
              className="w-full min-h-[120px] p-3 border-2 border-gray-300 rounded-lg resize-vertical focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* File upload */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">File (optional)</label>
            {selectedFile ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-2xl">📄</span>
                <span className="flex-1 text-sm font-medium">{selectedFile.name}</span>
                <Button size="sm" variant="outline" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  Remove
                </Button>
              </div>
            ) : (
              <div
                className={`w-full min-h-[150px] border-3 border-dashed rounded-lg flex items-center justify-center bg-white cursor-pointer transition-all ${
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
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-base text-muted-foreground my-1">
                    {isDragging ? "Drop file here..." : "Drag and drop a file here"}
                  </p>
                  <p className="text-sm text-muted-foreground my-2">or</p>
                  <Button
                    variant="default"
                    size="default"
                    onClick={handleBrowseClick}
                    disabled={isUploading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Allowed: PDF, DOCX, TXT, ZIP (Max 50MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="default"
            size="lg"
            onClick={handleSubmit}
            disabled={isUploading || (!textInput.trim() && !selectedFile)}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isUploading ? "Submitting..." : "Submit"}
          </Button>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 rounded bg-red-50 text-red-800 border border-red-400">
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 rounded bg-green-50 text-green-800 border border-green-400">
            Submission saved successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
