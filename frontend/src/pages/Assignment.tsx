import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import "./Assignment.css";
import TabNavigation from "../components/TabNavigation";
import AssignmentSettings from "../components/AssignmentSettings";
import AssignmentFileUpload from "../components/AssignmentFileUpload";
import AssignmentFileDisplay from "../components/AssignmentFileDisplay";
import StudentSubmissionUpload from "../components/StudentSubmissionUpload";
import TeacherSubmissionView from "../components/TeacherSubmissionView";
import RubricDisplay from "../components/RubricDisplay";
import { isTeacher } from "../util/login";

import { 
  listStuGroup,
  getUserId,
  createReview,
  createCriterion,
  getReview,
  getCriteria,
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
  const [stuGroup, setStuGroup] = useState<StudentGroups[]>([]);
  const [revieweeID, setRevieweeID] = useState<number>(0);
  const [stuID, setStuID] = useState<number>(0);
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([]);
  const [review, setReview] = useState<number[]>([]);
  const [criteriaDescriptions, setCriteriaDescriptions] = useState<Criterion[]>([]);
  const [assignmentName, setAssignmentName] = useState<string>("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  // Determine which tab is active based on URL path
  const isManageTab = location.pathname.includes('/manage');
  const isSubmissionTab = location.pathname.includes('/submission');
  const isStudentSubmissionsTab = location.pathname.includes('/student-submissions');

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
        const rubricResp = await getRubric(Number(id), true); // true = use as assignmentID
        if (rubricResp && rubricResp.id) {
          const criteriaResp = await getCriteria(rubricResp.id);
          setCriteriaDescriptions(criteriaResp);
        }
      } catch (error) {
        console.error('Error fetching criteria descriptions:', error);
      }
    })();
  }, [id]);

  useEffect(() => {
      (async () => {
        const stuID = await getUserId();
      setStuID(stuID);
      const stus = await listStuGroup(Number(id), stuID);
      setStuGroup(stus);
        try {
          if (revieweeID === 0) {
            // No reviewee selected yet, clear the review data
            setReview([]);
            setSelectedCriteria([]);
            return;
          }
          
          const reviewResponse = await getReview(Number(id), stuID, revieweeID);
          const reviewData = await reviewResponse.json();
          setReview(reviewData.grades || []);
          
          // Convert grades array to selectedCriteria format
          const loadedCriteria: SelectedCriterion[] = [];
          if (reviewData.grades && Array.isArray(reviewData.grades)) {
            reviewData.grades.forEach((grade: number | null, rowIndex: number) => {
              if (grade !== null && grade !== undefined) {
                loadedCriteria.push({ row: rowIndex, column: grade });
              }
            });
          }
          setSelectedCriteria(loadedCriteria);
          
          console.log("Review data:", reviewData);
          console.log("Loaded criteria:", loadedCriteria);
        } catch (error) {
          console.error('Error fetching review:', error);
          setReview([]);
          setSelectedCriteria([]);
        }
      })();
  }, [revieweeID, id]);

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

  function handleRadioChange(event: ChangeEvent<HTMLInputElement>): void {
    const selectedID = Number(event.target.value);
    setRevieweeID(selectedID);
    console.log(`Selected group member ID: ${selectedID}`);
  }

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

          {
            //List group members as radio buttons to select for given review
            !isTeacher() && <div className='groupMembers'>
              <h3>Select a group member to review</h3>
                {stuGroup.map((stus) => {
                      return (
                        <>
                        <input type='radio' id={stus.userID.toString()} value={stus.userID} name='groupMembers' onChange={handleRadioChange}></input>
                        <label htmlFor={stus.userID.toString()}>{stus.userID}</label>
                        <br></br>
                        </>
                      )
                    }
                  )
                }
                <button className='submitReview' onClick={async () => {
                  console.log("Submitting review with selected criteria:", selectedCriteria);
                  try {
                    const reviewResponse = await createReview(Number(id), stuID, revieweeID);
                    const reviewData = await reviewResponse.json();
                    console.log("Review response:", reviewData);
                    
                    // Submit each criterion using the criteria description ID
                    for (const criterion of selectedCriteria) {
                      // Get the criteria description ID from the row index
                      const criteriaDesc = criteriaDescriptions[criterion.row];
                      if (criteriaDesc && criteriaDesc.id) {
                        await createCriterion(reviewData.id, criteriaDesc.id, criterion.column, "");
                      } else {
                        console.warn(`Could not find criteria description for row ${criterion.row}`);
                      }
                    }
                    
                    console.log('Review submitted successfully');
                    alert('Review submitted successfully!');
                  } catch (error) {
                    console.error('Error submitting review:', error);
                    alert('Error submitting review. Please try again.');
                  }
                }}>Submit Review</button>
            </div>
          }
        </>
      )}
    </>
  );
}
