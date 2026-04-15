import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAssignmentDetails, editAssignment, deleteAssignment } from "../util/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import StatusMessage from "./StatusMessage";
import ConfirmDialog from "./ConfirmDialog";
import { MessageSquare, BarChart2, Trash2 } from "lucide-react";
import { parseUTC } from "../util/dates";

const toDatetimeLocal = (iso: string): string => {
  const d = parseUTC(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultStartDate = (): string => {
  return toDatetimeLocal(new Date().toISOString());
};

const defaultDueDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return toDatetimeLocal(d.toISOString());
};

const oneWeekAfter = (datetimeLocal: string): string => {
  const d = new Date(datetimeLocal);
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return toDatetimeLocal(d.toISOString());
};

interface AssignmentSettingsProps {
  assignmentId: number;
}

interface AssignmentDetails {
  id: number;
  name: string;
  description?: string;
  start_date: string | null;
  due_date: string | null;
  peer_review_start_date?: string | null;
  peer_review_due_date?: string | null;
  courseID: number;
  submission_type?: string;
  internal_review?: boolean;
  external_review?: boolean;
  anonymous_review?: boolean;
  rubrics: Array<{
    id: number;
    canComment: boolean;
  }>;
  review_count?: number;
  group_count?: number;
}

export default function AssignmentSettings({ assignmentId }: AssignmentSettingsProps) {
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStartDate, setEditedStartDate] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedPeerReviewStartDate, setEditedPeerReviewStartDate] = useState("");
  const [editedPeerReviewDueDate, setEditedPeerReviewDueDate] = useState("");
  const [editedSubmissionType, setEditedSubmissionType] = useState<'individual' | 'group'>('individual');
  const [editedInternalReview, setEditedInternalReview] = useState(false);
  const [editedExternalReview, setEditedExternalReview] = useState(false);
  const [editedAnonymousReview, setEditedAnonymousReview] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const loadAssignmentDetails = useCallback(async () => {
    try {
      const data = await getAssignmentDetails(assignmentId);
      setAssignment(data);
      setEditedName(data.name || "");
      setEditedDescription(data.description || "");
      setEditedStartDate(data.start_date ? toDatetimeLocal(data.start_date) : "");
      setEditedDueDate(data.due_date ? toDatetimeLocal(data.due_date) : "");
      setEditedPeerReviewStartDate(data.peer_review_start_date ? toDatetimeLocal(data.peer_review_start_date) : "");
      setEditedPeerReviewDueDate(data.peer_review_due_date ? toDatetimeLocal(data.peer_review_due_date) : "");
      setEditedSubmissionType((data.submission_type as 'individual' | 'group') || 'individual');
      setEditedInternalReview(data.internal_review || false);
      setEditedExternalReview(data.external_review || false);
      setEditedAnonymousReview(data.anonymous_review || false);
    } catch (error) {
      console.error("Error loading assignment details:", error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : "Failed to load assignment details");
    }
  }, [assignmentId]);

  useEffect(() => {
    loadAssignmentDetails();
  }, [loadAssignmentDetails]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
    setStatusMessage("");
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      setStatusType('error');
      setStatusMessage("Assignment name is required");
      return;
    }

    if ((editedPeerReviewStartDate || editedPeerReviewDueDate) && !editedDueDate) {
      setStatusType('error');
      setStatusMessage("A due date must be set before setting peer review dates");
      return;
    }

    if (editedDueDate && editedPeerReviewStartDate && new Date(editedPeerReviewStartDate) < new Date(editedDueDate)) {
      setStatusType('error');
      setStatusMessage("Peer review start date cannot be before the due date");
      return;
    }

    if (editedDueDate && editedPeerReviewDueDate && new Date(editedPeerReviewDueDate) < new Date(editedDueDate)) {
      setStatusType('error');
      setStatusMessage("Peer review due date cannot be before the due date");
      return;
    }

    if (editedPeerReviewStartDate && editedPeerReviewDueDate && new Date(editedPeerReviewDueDate) < new Date(editedPeerReviewStartDate)) {
      setStatusType('error');
      setStatusMessage("Peer review due date cannot be before the peer review start date");
      return;
    }

    setIsLoading(true);
    setStatusMessage("");

    try {
      const updateData: {
        name?: string,
        description?: string,
        start_date?: string,
        due_date?: string,
        peer_review_start_date?: string,
        peer_review_due_date?: string,
        submission_type?: string,
        internal_review?: boolean,
        external_review?: boolean,
        anonymous_review?: boolean
      } = {
        name: editedName,
        description: editedDescription,
        submission_type: editedSubmissionType,
        internal_review: editedInternalReview,
        external_review: editedExternalReview,
        anonymous_review: editedAnonymousReview,
      };

      if (editedStartDate) {
        updateData.start_date = new Date(editedStartDate).toISOString();
      }

      if (editedDueDate) {
        updateData.due_date = new Date(editedDueDate).toISOString();
      }

      if (editedPeerReviewStartDate) {
        updateData.peer_review_start_date = new Date(editedPeerReviewStartDate).toISOString();
      }

      if (editedPeerReviewDueDate) {
        updateData.peer_review_due_date = new Date(editedPeerReviewDueDate).toISOString();
      }

      const response = await editAssignment(assignmentId, updateData);
      setAssignment(prev => prev ? { ...prev, ...response.assignment } : response.assignment);
      setIsEditDialogOpen(false);
      setStatusType('success');
      setStatusMessage("Assignment updated successfully!");
      setTimeout(() => setStatusMessage(""), 4500);
    } catch (error) {
      console.error("Error updating assignment:", error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : "Failed to update assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditDialogOpen(false);
    setStatusMessage("");
    if (assignment) {
      setEditedName(assignment.name || "");
      setEditedDescription(assignment.description || "");
      setEditedStartDate(assignment.start_date ? toDatetimeLocal(assignment.start_date) : "");
      setEditedDueDate(assignment.due_date ? toDatetimeLocal(assignment.due_date) : "");
      setEditedPeerReviewStartDate(assignment.peer_review_start_date ? toDatetimeLocal(assignment.peer_review_start_date) : "");
      setEditedPeerReviewDueDate(assignment.peer_review_due_date ? toDatetimeLocal(assignment.peer_review_due_date) : "");
      setEditedSubmissionType((assignment.submission_type as 'individual' | 'group') || 'individual');
      setEditedInternalReview(assignment.internal_review || false);
      setEditedExternalReview(assignment.external_review || false);
      setEditedAnonymousReview(assignment.anonymous_review || false);
    }
  };

  const handleSaveReview = async () => {
    setIsLoading(true);
    setStatusMessage("");
    try {
      const response = await editAssignment(assignmentId, {
        internal_review: editedInternalReview,
        external_review: editedExternalReview,
        anonymous_review: editedAnonymousReview,
      });
      setAssignment(prev => prev ? { ...prev, ...response.assignment } : response.assignment);
      setIsEditingReview(false);
      setStatusType('success');
      setStatusMessage("Review settings updated successfully!");
      setTimeout(() => setStatusMessage(""), 4500);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : "Failed to update review settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReview = () => {
    setIsEditingReview(false);
    setStatusMessage("");
    if (assignment) {
      setEditedInternalReview(assignment.internal_review || false);
      setEditedExternalReview(assignment.external_review || false);
      setEditedAnonymousReview(assignment.anonymous_review || false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      await deleteAssignment(assignmentId);
      setStatusType('success');
      setStatusMessage("Assignment deleted successfully! Redirecting...");
      setTimeout(() => {
        if (assignment?.courseID) {
          navigate(`/classes/${assignment.courseID}/home`);
        }
      }, 2000);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete assignment");
      setIsLoading(false);
    }
  };

  if (!assignment) {
    return <div className="text-center py-10 text-lg text-muted-foreground">Loading assignment details...</div>;
  }

  return (
    <div className="space-y-8">
      {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

      {/* General */}
      <section>
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Assignment Details</CardTitle>
            <CardDescription>Manage the assignment name, dates, and submission type.</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditDialogOpen ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">Assignment Name</Label>
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter assignment name"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Enter description"
                    className="resize-y min-h-[80px]"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Start Date</Label>
                    {editedStartDate ? (
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={editedStartDate}
                          onChange={(e) => setEditedStartDate(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditedStartDate("")} className="text-muted-foreground px-2">✕</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Not set</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditedStartDate(defaultStartDate())}>Set</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Due Date</Label>
                    {editedDueDate ? (
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={editedDueDate}
                          onChange={(e) => setEditedDueDate(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setEditedDueDate(""); setEditedPeerReviewStartDate(""); setEditedPeerReviewDueDate(""); }} className="text-muted-foreground px-2">✕</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Not set</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditedDueDate(defaultDueDate())}>Set</Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Peer Review Start Date</Label>
                    {editedPeerReviewStartDate ? (
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={editedPeerReviewStartDate}
                          onChange={(e) => setEditedPeerReviewStartDate(e.target.value)}
                          min={editedDueDate || undefined}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditedPeerReviewStartDate("")} className="text-muted-foreground px-2">✕</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Not set</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditedPeerReviewStartDate(editedDueDate || defaultDueDate())}>Set</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Peer Review Due Date</Label>
                    {editedPeerReviewDueDate ? (
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={editedPeerReviewDueDate}
                          onChange={(e) => setEditedPeerReviewDueDate(e.target.value)}
                          min={editedPeerReviewStartDate || editedDueDate || undefined}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditedPeerReviewDueDate("")} className="text-muted-foreground px-2">✕</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Not set</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditedPeerReviewDueDate(editedPeerReviewStartDate ? oneWeekAfter(editedPeerReviewStartDate) : editedDueDate ? oneWeekAfter(editedDueDate) : defaultDueDate())}>Set</Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Submission Type</Label>
                  <div className="flex gap-5 items-center">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        value="individual"
                        checked={editedSubmissionType === 'individual'}
                        onChange={(e) => {
                          setEditedSubmissionType(e.target.value as 'individual');
                          setEditedInternalReview(false);
                        }}
                      />
                      Individual
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        value="group"
                        checked={editedSubmissionType === 'group'}
                        onChange={(e) => setEditedSubmissionType(e.target.value as 'group')}
                      />
                      Group
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Name</span>
                  <span className="text-sm">{assignment.name || "No name"}</span>
                </div>
                {assignment.description && (
                  <div className="flex items-start justify-between py-2 border-b border-slate-100 gap-4">
                    <span className="text-sm font-medium text-muted-foreground shrink-0">Description</span>
                    <span className="text-sm text-right">{assignment.description}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Start Date</span>
                  <span className="text-sm">
                    {assignment.start_date
                      ? parseUTC(assignment.start_date).toLocaleString()
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Due Date</span>
                  <span className="text-sm">
                    {assignment.due_date
                      ? parseUTC(assignment.due_date).toLocaleString()
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Peer Review Start</span>
                  <span className="text-sm">
                    {assignment.peer_review_start_date
                      ? parseUTC(assignment.peer_review_start_date).toLocaleString()
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Peer Review Due</span>
                  <span className="text-sm">
                    {assignment.peer_review_due_date
                      ? parseUTC(assignment.peer_review_due_date).toLocaleString()
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Submission Type</span>
                  <Badge variant="secondary">
                    {assignment.submission_type === 'group' ? 'Group' : 'Individual'}
                  </Badge>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={handleEdit} disabled={isLoading}>
                    Edit Details
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Peer Review */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-medium">Peer Review</h3>
        </div>
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Review Settings</CardTitle>
            <CardDescription>Configure how peer reviews are conducted for this assignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditingReview ? (
              <div className="flex flex-col gap-4">
                {editedSubmissionType === 'group' && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Internal Review</Label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={editedInternalReview}
                        onChange={(e) => setEditedInternalReview(e.target.checked)}
                      />
                      Teammates review each other
                    </label>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">External Review</Label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={editedExternalReview}
                      onChange={(e) => setEditedExternalReview(e.target.checked)}
                    />
                    Cross-group peer reviews
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">Anonymous Reviews</Label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={editedAnonymousReview}
                      onChange={(e) => setEditedAnonymousReview(e.target.checked)}
                    />
                    Hide reviewer names from students
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveReview} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancelReview} disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {assignment.submission_type === 'group' && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-muted-foreground">Internal Review</span>
                    <Badge variant={assignment.internal_review ? "default" : "secondary"}>
                      {assignment.internal_review ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">External Review</span>
                  <Badge variant={assignment.external_review ? "default" : "secondary"}>
                    {assignment.external_review ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm font-medium text-muted-foreground">Anonymous Reviews</span>
                  <Badge variant={assignment.anonymous_review ? "default" : "secondary"}>
                    {assignment.anonymous_review ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {assignment.rubrics && assignment.rubrics.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-muted-foreground">Rubric Criteria</span>
                    <Badge variant="secondary">{assignment.rubrics.length}</Badge>
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingReview(true)} disabled={isLoading}>
                    Edit Review Settings
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Statistics */}
      {assignment.review_count !== undefined && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            <h3 className="text-lg font-medium">Statistics</h3>
          </div>
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Progress Overview</CardTitle>
              <CardDescription>Current activity data for this assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-muted-foreground">Total Reviews</span>
                <Badge variant="secondary">{assignment.review_count}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-muted-foreground">Total Groups</span>
                <Badge variant="secondary">{assignment.group_count ?? 0}</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Danger Zone */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        </div>
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Assignment</p>
                <p className="text-sm text-muted-foreground">
                  Permanently remove this assignment and all associated submissions, reviews, and data.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Assignment"
          message={`Permanently delete "${assignment.name}" and all associated data? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
