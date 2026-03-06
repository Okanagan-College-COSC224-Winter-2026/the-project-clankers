import AssignmentCard from "../components/AssignmentCard";
import Button from "../components/Button";
import "./ClassHome.css";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { listAssignments, listClasses, createAssignment } from "../util/api";
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
  const idNew = Number(id)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [className, setClassName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    
    return (
      <>
        <div className="ClassHeader">
          <h2>{className}</h2>

        <div className="ClassHeaderRight">
          {isTeacher() ? (
            <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
              {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
            </Button>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/classes/${id}/groups`,
                },
              ]
            : [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
              ]
        }
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
    </>
  );
}
