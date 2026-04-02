import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAssignmentDetails, editAssignment, deleteAssignment } from "../util/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import StatusMessage from "./StatusMessage";

interface AssignmentSettingsProps {
  assignmentId: number;
}

interface AssignmentDetails {
  id: number;
  name: string;
  rubric_text: string;
  start_date: string | null;
  due_date: string | null;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedRubric, setEditedRubric] = useState("");
  const [editedStartDate, setEditedStartDate] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
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
      setEditedRubric(data.rubric_text || "");
      setEditedStartDate(data.start_date ? data.start_date.split('T')[0] : "");
      setEditedDueDate(data.due_date ? data.due_date.split('T')[0] : "");
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
    setIsEditing(true);
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
        rubric?: string,
        start_date?: string,
        due_date?: string,
        submission_type?: string,
        internal_review?: boolean,
        external_review?: boolean,
        anonymous_review?: boolean
      } = {
        name: editedName,
        rubric: editedRubric,
        submission_type: editedSubmissionType,
        internal_review: editedInternalReview,
        external_review: editedExternalReview,
        anonymous_review: editedAnonymousReview,
      };

      if (editedStartDate) {
        updateData.start_date = new Date(editedStartDate).toISOString();
      }

      if (editedDueDate) {
        // Convert to ISO format for backend
        updateData.due_date = new Date(editedDueDate).toISOString();
      }

      console.log("Sending update data:", updateData);
      const response = await editAssignment(assignmentId, updateData);
      console.log("Response from backend:", response);
      setAssignment(response.assignment);
      setIsEditing(false);
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
    setIsEditing(false);
    setStatusMessage("");
    if (assignment) {
      setEditedName(assignment.name || "");
      setEditedRubric(assignment.rubric_text || "");
      setEditedStartDate(assignment.start_date ? assignment.start_date.split('T')[0] : "");
      setEditedDueDate(assignment.due_date ? assignment.due_date.split('T')[0] : "");
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
          {isEditing ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Assignment Name:</Label>
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter assignment name"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Rubric Description:</Label>
                <Textarea
                  value={editedRubric}
                  onChange={(e) => setEditedRubric(e.target.value)}
                  placeholder="Enter rubric description"
                  className="resize-none min-h-[80px] max-h-[200px] overflow-y-auto"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Start Date:</Label>
                <Input
                  type="date"
                  value={editedStartDate}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Due Date:</Label>
                <Input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Submission Type:</Label>
                <div className="flex gap-5 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      value="individual"
                      checked={editedSubmissionType === 'individual'}
                      onChange={(e) => {
                        setEditedSubmissionType(e.target.value as 'individual');
                        setEditedInternalReview(false); // Clear internal review for individual assignments
                      }}
                    />
                    Individual
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
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

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-gray-600 text-sm">Peer Review Settings:</Label>
                <div className="flex flex-col gap-2.5">
                  {editedSubmissionType === 'group' && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedInternalReview}
                        onChange={(e) => setEditedInternalReview(e.target.checked)}
                      />
                      Internal Review (Teammates Review Each Other)
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedExternalReview}
                      onChange={(e) => setEditedExternalReview(e.target.checked)}
                    />
                    External Review
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedAnonymousReview}
                    onChange={(e) => setEditedAnonymousReview(e.target.checked)}
                  />
                  Anonymous Reviews (Hide Reviewer Names from Students)
                </label>
              </div>

              <div className="flex gap-2.5 mt-4">
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2.5 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600 min-w-[120px]">Name:</span>
                <span className="text-gray-800 flex-1">{assignment.name || "No name"}</span>
              </div>

              <div className="flex gap-2.5 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600 min-w-[120px]">Rubric:</span>
                <span className="text-gray-800 flex-1">{assignment.rubric_text || "No rubric description"}</span>
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
          )}
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
    </div>
  );
}
