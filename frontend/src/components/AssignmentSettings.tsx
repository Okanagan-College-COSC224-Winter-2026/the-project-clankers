import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAssignmentDetails, editAssignment, deleteAssignment } from "../util/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import StatusMessage from "./StatusMessage";

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

  const loadAssignmentDetails = useCallback(async () => {
    try {
      const data = await getAssignmentDetails(assignmentId);
      setAssignment(data);
      setEditedName(data.name || "");
      setEditedDescription(data.description || "");
      setEditedStartDate(data.start_date ? data.start_date.slice(0, 16) : "");
      setEditedDueDate(data.due_date ? data.due_date.slice(0, 16) : "");
      setEditedPeerReviewStartDate(data.peer_review_start_date ? data.peer_review_start_date.slice(0, 16) : "");
      setEditedPeerReviewDueDate(data.peer_review_due_date ? data.peer_review_due_date.slice(0, 16) : "");
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

      console.log("Sending update data:", updateData);
      const response = await editAssignment(assignmentId, updateData);
      console.log("Response from backend:", response);
      setAssignment(response.assignment);
      setIsEditDialogOpen(false);
      setStatusType('success');
      setStatusMessage("Assignment updated successfully!");
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
      setEditedStartDate(assignment.start_date ? assignment.start_date.slice(0, 16) : "");
      setEditedDueDate(assignment.due_date ? assignment.due_date.slice(0, 16) : "");
      setEditedPeerReviewStartDate(assignment.peer_review_start_date ? assignment.peer_review_start_date.slice(0, 16) : "");
      setEditedPeerReviewDueDate(assignment.peer_review_due_date ? assignment.peer_review_due_date.slice(0, 16) : "");
      setEditedSubmissionType((assignment.submission_type as 'individual' | 'group') || 'individual');
      setEditedInternalReview(assignment.internal_review || false);
      setEditedExternalReview(assignment.external_review || false);
      setEditedAnonymousReview(assignment.anonymous_review || false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
      return;
    }

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
    return <div className="text-center py-10 text-lg text-gray-500">Loading assignment details...</div>;
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <StatusMessage message={statusMessage} type={statusType} />

      <Card className="bg-gray-50 border border-gray-300 rounded-lg p-5 mb-5">
        <CardHeader>
          <CardTitle>Assignment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Name:</span>
              <span className="text-gray-800 flex-1">{assignment.name || "No name"}</span>
            </div>

            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Description:</span>
              <span className="text-gray-800 flex-1">
                {assignment.description ? (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Enabled</span>
                ) : (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm font-medium">Disabled</span>
                )}
              </span>
            </div>

            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Start Date:</span>
              <span className="text-gray-800 flex-1">
                {assignment.start_date
                  ? new Date(assignment.start_date).toLocaleDateString()
                  : "No start date set"}
              </span>
            </div>

            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Due Date:</span>
              <span className="text-gray-800 flex-1">
                {assignment.due_date
                  ? new Date(assignment.due_date).toLocaleDateString()
                  : "No due date set"}
              </span>
            </div>

            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Assignment Type:</span>
              <span className="text-gray-800 flex-1">
                {assignment.submission_type === 'group' ? 'Group' : 'Individual'}
              </span>
            </div>

            <div className="flex gap-2.5 mt-4">
              <Button onClick={handleEdit} disabled={isLoading}>
                Edit Assignment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border border-gray-300 rounded-lg p-5 mb-5">
        <CardHeader>
          <CardTitle>Peer Review Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {assignment.submission_type === 'group' && (
              <div className="flex gap-2.5 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600 min-w-[120px]">Internal Review:</span>
                <span className="text-gray-800 flex-1">
                  {assignment.internal_review ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )}
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">External Review:</span>
              <span className="text-gray-800 flex-1">
                {assignment.external_review ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Anonymous Reviews:</span>
              <span className="text-gray-800 flex-1">
                {assignment.anonymous_review ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Rubrics Created:</span>
              <span className="text-gray-800 flex-1">{assignment.rubrics?.length || 0}</span>
            </div>
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Peer Review Start:</span>
              <span className="text-gray-800 flex-1">
                {assignment.peer_review_start_date
                  ? new Date(assignment.peer_review_start_date).toLocaleDateString()
                  : "Not Set"}
              </span>
            </div>
            <div className="flex gap-2.5 py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-600 min-w-[120px]">Peer Review Due:</span>
              <span className="text-gray-800 flex-1">
                {assignment.peer_review_due_date
                  ? new Date(assignment.peer_review_due_date).toLocaleDateString()
                  : "Not Set"}
              </span>
            </div>
            {assignment.rubrics && assignment.rubrics.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-2">
                {assignment.rubrics.map((rubric) => (
                  <div key={rubric.id} className="p-2 px-3 bg-white border border-gray-300 rounded text-sm">
                    <span>Rubric #{rubric.id}</span>
                    <span>{rubric.canComment ? " (Comments enabled)" : " (Comments disabled)"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {assignment.review_count !== undefined && (
        <Card className="bg-gray-50 border border-gray-300 rounded-lg p-5 mb-5">
          <CardHeader>
            <CardTitle>Progress Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2.5 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600 min-w-[120px]">Total Reviews:</span>
                <span className="text-gray-800 flex-1">{assignment.review_count}</span>
              </div>
              <div className="flex gap-2.5 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600 min-w-[120px]">Total Groups:</span>
                <span className="text-gray-800 flex-1">{assignment.group_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-500 bg-red-50 rounded-lg p-5 mb-5">
        <CardHeader>
          <CardTitle className="text-red-500">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Deleting an assignment will permanently remove it and all associated data.</p>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete Assignment"}
          </Button>
        </CardContent>
      </Card>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent showCloseButton={true} className="!max-w-6xl !max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editAssignmentName">Assignment Name</Label>
              <Input
                id="editAssignmentName"
                placeholder="Enter assignment name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Assignment Details (Optional)</Label>
              <Textarea
                id="editDescription"
                placeholder="Enter assignment description (supports markdown formatting)"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="resize-none min-h-40 max-h-96 overflow-y-auto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStartDate">Start Date (Optional)</Label>
              <Input
                id="editStartDate"
                type="datetime-local"
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDueDate">Due Date (Optional)</Label>
              <Input
                id="editDueDate"
                type="datetime-local"
                value={editedDueDate}
                onChange={(e) => setEditedDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPeerReviewStartDate">Peer Review Start Date (Optional)</Label>
              <Input
                id="editPeerReviewStartDate"
                type="datetime-local"
                value={editedPeerReviewStartDate}
                onChange={(e) => setEditedPeerReviewStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPeerReviewDueDate">Peer Review Due Date (Optional)</Label>
              <Input
                id="editPeerReviewDueDate"
                type="datetime-local"
                value={editedPeerReviewDueDate}
                onChange={(e) => setEditedPeerReviewDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Submission Type</Label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="individual"
                    checked={editedSubmissionType === 'individual'}
                    onChange={(e) => {
                      setEditedSubmissionType(e.target.value as 'individual');
                      setEditedInternalReview(false);
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="group"
                    checked={editedSubmissionType === 'group'}
                    onChange={(e) => setEditedSubmissionType(e.target.value as 'group')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Group</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Peer Review Options</Label>
              <div className="flex flex-col gap-3">
                {editedSubmissionType === 'group' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="editInternalReview"
                      checked={editedInternalReview}
                      onCheckedChange={(checked) => setEditedInternalReview(!!checked)}
                    />
                    <Label htmlFor="editInternalReview" className="cursor-pointer text-sm font-normal">
                      Internal Review
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editExternalReview"
                    checked={editedExternalReview}
                    onCheckedChange={(checked) => setEditedExternalReview(!!checked)}
                  />
                  <Label htmlFor="editExternalReview" className="cursor-pointer text-sm font-normal">
                    External Review
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editAnonymousReview"
                    checked={editedAnonymousReview}
                    onCheckedChange={(checked) => setEditedAnonymousReview(!!checked)}
                  />
                  <Label htmlFor="editAnonymousReview" className="cursor-pointer text-sm font-normal">
                    Anonymous Reviews
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
