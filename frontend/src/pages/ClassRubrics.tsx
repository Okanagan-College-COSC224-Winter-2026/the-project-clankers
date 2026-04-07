import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback } from "react";
import { listAssignments, listClasses } from "../util/api";
import RubricCreator from "../components/RubricCreator";
import Button from "../components/Button";
import { isTeacher } from "../util/login";
import { importCSV } from "../util/csv";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface Assignment {
  id: number;
  name: string;
  due_date?: string;
}

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

export default function ClassRubrics() {
  const { id } = useParams();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [className, setClassName] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentList, classes] = await Promise.all([
        listAssignments(String(id)),
        listClasses(),
      ]);
      setAssignments(assignmentList);
      const currentClass = classes.find(
        (c: { id: number }) => c.id === Number(id)
      );
      setClassName(currentClass?.name || "");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="p-6 text-center">Loading rubrics...</div>;
  }

  const handleRosterUpload = () => {
    if (isUploadingRoster) return;
    setIsUploadingRoster(true);
    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false);
        setRosterResult(result);
      },
      (error) => {
        setIsUploadingRoster(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setUploadError(errorMessage);
      },
      () => {
        setIsUploadingRoster(false);
      }
    );
  };

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b bg-background px-6">
        <h2 className="text-xl font-semibold">{className}</h2>
        <div>
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
                { label: "Home", path: `/classes/${id}/home` },
                { label: "Members", path: `/classes/${id}/members` },
                { label: "Groups", path: `/classes/${id}/groups` },
                { label: "Rubrics", path: `/classes/${id}/rubrics` },
              ]
            : [
                { label: "Home", path: `/classes/${id}/home` },
                { label: "Members", path: `/classes/${id}/members` },
              ]
        }
      />

      <div className="p-3 md:p-4">
        {assignments.length === 0 ? (
          <p className="p-4 text-muted-foreground">
            No assignments yet. Create an assignment first to manage its rubric.
          </p>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.id} className="mb-3 overflow-hidden">
              <div
                className="flex cursor-pointer items-center gap-2 px-4 py-3 transition-colors hover:bg-secondary"
                onClick={() =>
                  setExpandedId(expandedId === assignment.id ? null : assignment.id)
                }
              >
                <span className="w-4 flex-shrink-0 text-sm text-muted-foreground">
                  {expandedId === assignment.id ? "▾" : "▸"}
                </span>
                <h3 className="flex-1 text-sm text-foreground">{assignment.name}</h3>
                {assignment.due_date && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {expandedId === assignment.id && (
                <div className="border-t px-4 py-3">
                  <RubricCreator id={assignment.id} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>

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
