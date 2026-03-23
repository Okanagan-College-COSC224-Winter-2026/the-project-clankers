import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import "./Assignment.css";
import TabNavigation from "../components/TabNavigation";
import AssignmentSettings from "../components/AssignmentSettings";
import AssignmentFileUpload from "../components/AssignmentFileUpload";
import AssignmentFileDisplay from "../components/AssignmentFileDisplay";
import StudentSubmissionUpload from "../components/StudentSubmissionUpload";
import TeacherSubmissionView from "../components/TeacherSubmissionView";
import RubricDisplay from "../components/RubricDisplay";
import PeerReviews from "./PeerReviews";
import { isTeacher } from "../util/login";

import {
  getRubric,
  getAssignmentDetails
} from "../util/api";

interface SelectedCriterion {
  row: number;
  column: number;
}

export default function Assignment() {
  const { id } = useParams();
  const location = useLocation();
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([]);
  const [review, setReview] = useState<number[]>([]);
  // const [criteriaDescriptions, setCriteriaDescriptions] = useState<Criterion[]>([]);
  const [assignmentName, setAssignmentName] = useState<string>("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  // Determine which tab is active based on URL path
  const isManageTab = location.pathname.includes('/manage');
  const isSubmissionTab = location.pathname.includes('/submission');
  const isStudentSubmissionsTab = location.pathname.includes('/student-submissions');
  const isPeerReviewsTab = location.pathname.includes('/peer-reviews');

  // Fetch assignment details to get the name
  useEffect(() => {
    (async () => {
      try {
        const assignmentData = await getAssignmentDetails(Number(id));
        if (assignmentData && assignmentData.name) {
          setAssignmentName(assignmentData.name);
        }
        if (assignmentData && assignmentData.courseID) {
          setCourseId(assignmentData.courseID);
          // Fetch the course name
          const { listClasses } = await import("../util/api");
          const classes = await listClasses();
          const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID);
          if (course) setCourseName(course.name);
        }
      } catch (error) {
        console.error('Error fetching assignment details:', error);
      }
    })();
  }, [id]);

  // Load criteria descriptions for the rubric
  useEffect(() => {
    (async () => {
      try {
        await getRubric(Number(id), true); // true = use as assignmentID
      } catch (error) {
        console.error('Error fetching rubric:', error);
      }
    })();
  }, [id]);

  const handleCriterionSelect = (row: number, column: number) => {
    // Check if this criterion is already selected
    const existingIndex = selectedCriteria.findIndex(
      criterion => criterion.row === row && criterion.column === column
    );
    
    if (existingIndex >= 0) {
      // If already selected, remove it (toggle off)
      setSelectedCriteria(prev => 
        prev.filter((_, index) => index !== existingIndex)
      );
      // Also update the review grades array
      setReview(prev => {
        const newReview = [...prev];
        newReview[row] = 0;
        return newReview;
      });
    } else {
      // Add the new criterion, removing any other selection in the same row
      setSelectedCriteria(prev => {
        // Remove any existing selection for this row
        const filteredCriteria = prev.filter(criterion => criterion.row !== row);
        // Add the new selection
        return [...filteredCriteria, { row, column }];
      });
      // Also update the review grades array
      setReview(prev => {
        const newReview = [...prev];
        newReview[row] = column;
        return newReview;
      });
    }
  };

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
                {
                  label: "Home",
                  path: `/assignments/${id}`,
                },
                {
                  label: "Members",
                  path: `/assignments/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/assignments/${id}/groups`,
                },
                {
                  label: "Rubric",
                  path: `/assignments/${id}/rubric`,
                },
                {
                  label: "Student Submissions",
                  path: `/assignments/${id}/student-submissions`,
                },
                {
                  label: "Manage",
                  path: `/assignments/${id}/manage`,
                }
              ]
            : [
                {
                  label: "Home",
                  path: `/assignments/${id}`,
                },
                {
                  label: "Members",
                  path: `/assignments/${id}/members`,
                },
                {
                  label: "Submission",
                  path: `/assignments/${id}/submission`,
                },
                {
                  label: "Peer Reviews",
                  path: `/assignments/${id}/peer-reviews`,
                },
              ]
        }
      />

      {isManageTab && isTeacher() ? (
        <AssignmentSettings assignmentId={Number(id)} />
      ) : isSubmissionTab && !isTeacher() ? (
        /* Student submission upload tab */
        <StudentSubmissionUpload assignmentId={Number(id)} />
      ) : isStudentSubmissionsTab && isTeacher() ? (
        /* Teacher view of all student submissions */
        <TeacherSubmissionView assignmentId={Number(id)} />
      ) : isPeerReviewsTab && !isTeacher() ? (
        /* Student peer reviews tab */
        <PeerReviews />
      ) : (
        /* Home tab - default view */
        <>
          {/* File upload/display section */}
          {isTeacher() ? (
            <AssignmentFileUpload 
              assignmentId={Number(id)}
            />
          ) : (
            <AssignmentFileDisplay 
              assignmentId={Number(id)}
            />
          )}

          <div className='assignmentRubricDisplay'>
            <RubricDisplay rubricId={Number(id)} onCriterionSelect={handleCriterionSelect} grades={review} />
          </div>
        </>
      )}
    </>
  );
}
