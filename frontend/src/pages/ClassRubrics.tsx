import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback } from "react";
import { listAssignments, listClasses } from "../util/api";
import RubricCreator from "../components/RubricCreator";
import { isTeacher } from "../util/login";
import "./ClassMembers.css";
import "./ClassRubrics.css";

export default function ClassRubrics() {
  const { id } = useParams();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [className, setClassName] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="loading">Loading rubrics...</div>;
  }

  return (
    <>
      <div className="ClassHeader">
        <h2>{className}</h2>
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

      <div className="rubrics-container">
        {assignments.length === 0 ? (
          <p style={{ padding: "1rem", color: "var(--text-secondary)" }}>
            No assignments yet. Create an assignment first to manage its rubric.
          </p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="rubric-assignment-card">
              <div
                className="rubric-assignment-header"
                onClick={() =>
                  setExpandedId(expandedId === assignment.id ? null : assignment.id)
                }
              >
                <span className="rubric-expand-icon">
                  {expandedId === assignment.id ? "▾" : "▸"}
                </span>
                <h3>{assignment.name}</h3>
                {assignment.due_date && (
                  <span className="rubric-due-date">
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {expandedId === assignment.id && (
                <div className="rubric-assignment-body">
                  <RubricCreator id={assignment.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
