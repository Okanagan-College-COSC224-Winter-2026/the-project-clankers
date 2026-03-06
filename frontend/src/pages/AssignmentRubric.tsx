import { useParams, Link } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState } from "react";
import { getAssignmentDetails, listClasses } from "../util/api";
import RubricCreator from "../components/RubricCreator";
import RubricDisplay from "../components/RubricDisplay";
import { isTeacher } from "../util/login";
import "./Assignment.css";

export default function AssignmentRubric() {
  const { id } = useParams();
  const [assignmentName, setAssignmentName] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getAssignmentDetails(Number(id));
        setAssignmentName(data.name);

        if (data.courseID) {
          setCourseId(data.courseID);
          const classes = await listClasses();
          const cls = classes.find((c: { id: number }) => c.id === data.courseID);
          if (cls) setCourseName(cls.name);
        }
      } catch (error) {
        console.error("Error loading assignment:", error);
      }
    })();
  }, [id]);

  return (
    <>
      {courseId && (
        <div className="assignment-breadcrumb">
          <Link to={`/classes/${courseId}/home`}>← {courseName || "Back to class"}</Link>
        </div>
      )}

      <div className="AssignmentHeader">
        <h2>{assignmentName || "Loading..."}</h2>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: "Home", path: `/assignments/${id}` },
                { label: "Members", path: `/assignments/${id}/members` },
                { label: "Groups", path: `/assignments/${id}/groups` },
                { label: "Rubric", path: `/assignments/${id}/rubric` },
                { label: "Manage", path: `/assignments/${id}/manage` },
              ]
            : [
                { label: "Home", path: `/assignments/${id}` },
                { label: "Members", path: `/assignments/${id}/members` },
                { label: "Groups", path: `/assignments/${id}/groups` },
                { label: "Rubric", path: `/assignments/${id}/rubric` },
              ]
        }
      />

      <div style={{ padding: "0.75rem 1rem" }}>
        <RubricDisplay rubricId={Number(id)} onCriterionSelect={() => {}} grades={[]} />
        {isTeacher() && <RubricCreator id={Number(id)} />}
      </div>
    </>
  );
}
