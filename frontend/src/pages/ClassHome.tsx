import AssignmentCard from "../components/AssignmentCard";
import Button from "../components/Button";
import "./ClassHome.css";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { listAssignments, listClasses, createAssignment, updateClass, deleteClass } from "../util/api";
import TabNavigation from "../components/TabNavigation";
import { importCSV } from "../util/csv";
import Textbox from "../components/Textbox";
import StatusMessage from "../components/StatusMessage";
import { isTeacher } from "../util/login";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";

interface RosterUploadResultData {
  message: string;
  enrolled_count: number;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{
    email: string;
    student_id: string;
    temp_password: string;
  }>;
  enrolled_existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
  existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
}

export default function ClassHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const idNew = Number(id)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [className, setClassName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [editedClassName, setEditedClassName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const resp = await listAssignments(String(id));
      const classes = await listClasses();
      const currentClass = classes.find((c: { id: number }) => c.id === Number(id));
      setAssignments(resp);
      setClassName(currentClass?.name || null);
    })();
  }, [id]);
    
    const tryCreateAssingment = async () => {
      try {
        setStatusMessage('');
        const response = await createAssignment(idNew, newAssignmentName);
        const createdAssignment = response?.assignment;

        if (!createdAssignment?.id) {
          throw new Error('Failed to create assignment');
        }

        setAssignments((prev) => [...prev, createdAssignment]);
        setNewAssignmentName("");
        setStatusType('success');
        setStatusMessage('Assignment created successfully!');
      } catch (error) {
        console.error('Error creating assignment:', error);
        setStatusType('error');
        setStatusMessage('Error creating assignment.');
      }
    };

    const handleRosterUpload = () => {
      if (isUploadingRoster) return; // Prevent multiple clicks
      
      setIsUploadingRoster(true);
      setStatusMessage('Opening file picker...');
      setStatusType('success');
      
      importCSV(
        id as string,
        (result) => {
          setIsUploadingRoster(false);
          setStatusMessage('');
          setRosterResult(result);
        },
        (error) => {
          setIsUploadingRoster(false);
          setStatusMessage('');
          const errorMessage = error instanceof Error ? error.message : String(error);
          setUploadError(errorMessage);
        },
        () => {
          // onCancel callback - user closed file picker without selecting
          setIsUploadingRoster(false);
          setStatusMessage('');
        }
      );
    };

    const handleEditClassName = () => {
      setEditedClassName(className || "");
      setIsEditingClassName(true);
    };

    const handleSaveClassName = async () => {
      if (!editedClassName.trim()) {
        setStatusType('error');
        setStatusMessage('Class name cannot be empty');
        return;
      }

      try {
        await updateClass(idNew, editedClassName.trim());
        setClassName(editedClassName.trim());
        setIsEditingClassName(false);
        setStatusType('success');
        setStatusMessage('Class name updated successfully!');
      } catch (error) {
        console.error('Error updating class name:', error);
        setStatusType('error');
        setStatusMessage(error instanceof Error ? error.message : 'Error updating class name');
      }
    };

    const handleCancelEdit = () => {
      setIsEditingClassName(false);
      setEditedClassName("");
    };

    const handleDeleteClass = async () => {
      try {
        await deleteClass(idNew);
        setStatusType('success');
        setStatusMessage('Class deleted successfully!');
        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (error) {
        console.error('Error deleting class:', error);
        setStatusType('error');
        setStatusMessage(error instanceof Error ? error.message : 'Error deleting class');
        setShowDeleteConfirm(false);
      }
    };
    
    return (
      <>
        <div className="ClassHeader">
          <div className="ClassHeaderLeft">
            {isEditingClassName ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Textbox
                  placeholder="Class name"
                  onInput={setEditedClassName}
                  value={editedClassName}
                  style={{ fontSize: '1.5rem', padding: '5px 10px' }}
                />
                <Button onClick={handleSaveClassName}>Save</Button>
                <Button onClick={handleCancelEdit}>Cancel</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <h2>{className}</h2>
                {isTeacher() && (
                  <button
                    onClick={handleEditClassName}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '5px'
                    }}
                    title="Edit class name"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>

        <div className="ClassHeaderRight">
          {isTeacher() ? (
            <>
              <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
                {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ backgroundColor: '#dc3545', marginLeft: '10px' }}
              >
                Delete Class
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={[
          {
            label: "Home",
            path: `/classes/${id}/home`,
          },
          {
            label: "Members",
            path: `/classes/${id}/members`,
          },
        ]}
      />

      <StatusMessage message={statusMessage} type={statusType} />

      {rosterResult && (
        <RosterUploadResult
          enrolledCount={rosterResult.enrolled_count}
          createdCount={rosterResult.created_count}
          existingCount={rosterResult.existing_count}
          newStudents={rosterResult.new_students}
          enrolledExistingStudents={rosterResult.enrolled_existing_students}
          existingStudents={rosterResult.existing_students}
          onClose={() => setRosterResult(null)}
        />
      )}

      <div className="Class">
        <div className="Assignments">
          <ul className="Assignment">
            {assignments.map((assignment) => {
              return (
                <li key={assignment.id}>
                  <AssignmentCard id={assignment.id} dueDate={assignment.due_date}>
                    {assignment.name}
                  </AssignmentCard>
                </li>
              );
            })}
          </ul>
        </div>

        {isTeacher() ? (
          <div className="AssInputChunk">
            <span>New Assignment Name:</span>
            <Textbox
              placeholder="New Assignment..."
              onInput={setNewAssignmentName}
              className="AssignmentInput"
            />
            <Button
              onClick={() =>
                tryCreateAssingment()
              }
            >
              Add
            </Button>
          </div>
        ) : null}
      </div>

      {uploadError && (
        <ErrorModal
          title="Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}

      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <h2>Delete Class</h2>
            <p>Are you sure you want to delete "{className}"? This action cannot be undone.</p>
            {assignments.length > 0 && (
              <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                ⚠️ This class has {assignments.length} assignment(s). You may not be able to delete it unless you're an admin.
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                onClick={handleDeleteClass}
                style={{ backgroundColor: '#dc3545' }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}