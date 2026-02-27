import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAssignmentDetails, editAssignment, deleteAssignment } from "../util/api";
import Button from "./Button";
import StatusMessage from "./StatusMessage";
import "./AssignmentSettings.css";

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
      const updateData: { name?: string, rubric?: string, start_date?: string, due_date?: string } = {
        name: editedName,
        rubric: editedRubric,
      };

      if (editedStartDate) {
        updateData.start_date = new Date(editedStartDate).toISOString();
      }

      if (editedDueDate) {
        // Convert to ISO format for backend
        updateData.due_date = new Date(editedDueDate).toISOString();
      }

      const response = await editAssignment(assignmentId, updateData);
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
    return <div className="assignment-settings-loading">Loading assignment details...</div>;
  }

  return (
    <div className="assignment-settings">
      <StatusMessage message={statusMessage} type={statusType} />

      <div className="assignment-settings-section">
        <h3>Assignment Information</h3>
        
        {isEditing ? (
          <div className="assignment-settings-form">
            <div className="form-group">
              <label>Assignment Name:</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter assignment name"
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label>Rubric Description:</label>
              <textarea
                value={editedRubric}
                onChange={(e) => setEditedRubric(e.target.value)}
                placeholder="Enter rubric description"
                className="textarea-input"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="form-group">
              <label>Due Date:</label>
              <input
                type="date"
                value={editedDueDate}
                onChange={(e) => setEditedDueDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="form-actions">
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="assignment-settings-display">
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{assignment.name || "No name"}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Rubric:</span>
              <span className="detail-value">{assignment.rubric_text || "No rubric description"}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Start Date:</span>
              <span className="detail-value">
                {assignment.start_date 
                  ? new Date(assignment.start_date).toLocaleDateString() 
                  : "No start date set"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Due Date:</span>
              <span className="detail-value">
                {assignment.due_date 
                  ? new Date(assignment.due_date).toLocaleDateString() 
                  : "No due date set"}
              </span>
            </div>

            <div className="form-actions">
              <Button onClick={handleEdit} disabled={isLoading}>
                Edit Assignment
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="assignment-settings-section">
        <h3>Peer Review Settings</h3>
        <div className="detail-row">
          <span className="detail-label">Rubrics Created:</span>
          <span className="detail-value">{assignment.rubrics?.length || 0}</span>
        </div>
        {assignment.rubrics && assignment.rubrics.length > 0 && (
          <div className="rubric-list">
            {assignment.rubrics.map((rubric) => (
              <div key={rubric.id} className="rubric-item">
                <span>Rubric #{rubric.id}</span>
                <span>{rubric.canComment ? " (Comments enabled)" : " (Comments disabled)"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {assignment.review_count !== undefined && (
        <div className="assignment-settings-section">
          <h3>Progress Statistics</h3>
          <div className="detail-row">
            <span className="detail-label">Total Reviews:</span>
            <span className="detail-value">{assignment.review_count}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Groups:</span>
            <span className="detail-value">{assignment.group_count || 0}</span>
          </div>
        </div>
      )}

      <div className="assignment-settings-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Deleting an assignment will permanently remove it and all associated data.</p>
        <Button onClick={handleDelete} disabled={isLoading}>
          {isLoading ? "Deleting..." : "Delete Assignment"}
        </Button>
      </div>
    </div>
  );
}
