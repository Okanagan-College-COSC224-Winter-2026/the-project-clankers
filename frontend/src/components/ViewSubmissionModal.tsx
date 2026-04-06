import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { downloadStudentSubmission } from '../util/api'
import { useState } from 'react'

interface StudentSubmission {
  id: number;
  filename?: string;
  submission_text?: string;
  submitted_at: string;
  student_name?: string;
}

interface Props {
  submission: StudentSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  entityName: string; // "Student Name" or "Group Name"
}

export default function ViewSubmissionModal({ submission, isOpen, onClose, entityName }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!submission) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const blob = await downloadStudentSubmission(submission.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = submission.filename || 'submission';
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

  const isTextSubmission = submission && submission.submission_text;
  const isFileSubmission = submission && submission.filename;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission for {entityName}</DialogTitle>
        </DialogHeader>

        {submission ? (
          <div className="space-y-4">
            {/* Submission metadata */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Submission Type</div>
                <div className="font-medium">
                  {isTextSubmission && isFileSubmission ? 'Text & File' : (isTextSubmission ? 'Text' : 'File')}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Submitted At</div>
                <div className="font-medium">{formatSubmissionTime(submission.submitted_at)}</div>
              </div>
              {submission.student_name && (
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Submitted By</div>
                  <div className="font-medium">{submission.student_name}</div>
                </div>
              )}
            </div>

            {/* File submission */}
            {isFileSubmission && (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <div className="text-sm text-muted-foreground">File Name</div>
                    <div className="font-semibold">{submission.filename}</div>
                  </div>
                </div>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full"
                >
                  {isDownloading ? 'Downloading...' : 'Download File'}
                </Button>
              </div>
            )}

            {/* Text submission */}
            {isTextSubmission && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Submission Text</div>
                <div className="p-3 bg-white border border-green-300 rounded max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {submission.submission_text || 'No text content'}
                  </p>
                </div>
              </div>
            )}

            {downloadError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-sm">
                {downloadError}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No submission found</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
