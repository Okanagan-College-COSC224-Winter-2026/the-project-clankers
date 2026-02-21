import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useLocation } from "react-router-dom";
import "./Assignment.css";
import RubricCreator from "../components/RubricCreator";
import RubricDisplay from "../components/RubricDisplay";
import TabNavigation from "../components/TabNavigation";
import AssignmentSettings from "../components/AssignmentSettings";
import { isTeacher } from "../util/login";

import { 
  listStuGroup,
  getUserId,
  createReview,
  createCriterion,
  getReview
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

  // Determine which tab is active based on URL path
  const isManageTab = location.pathname.includes('/manage');

  useEffect(() => {
      (async () => {
        const stuID = await getUserId();
      setStuID(stuID);
      const stus = await listStuGroup(Number(id), stuID);
      setStuGroup(stus);
        try {
          const reviewResponse = await getReview(Number(id), stuID, revieweeID);
          const reviewData = await reviewResponse.json();
          setReview(reviewData.grades);
          console.log("Review data:", reviewData);
        } catch (error) {
          console.error('Error fetching review:', error);
        }
      })();
  }, [revieweeID, id, stuID]);

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
    } else {
      // Add the new criterion, removing any other selection in the same row
      setSelectedCriteria(prev => {
        // Remove any existing selection for this row
        const filteredCriteria = prev.filter(criterion => criterion.row !== row);
        // Add the new selection
        return [...filteredCriteria, { row, column }];
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
      <div className="AssignmentHeader">
        <h2>Assignment {id}</h2>
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
                  label: "Group",
                  path: `/assignments/${id}/group`,
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
                  label: "Group",
                  path: `/assignments/${id}/group`,
                }
              ]
        }
      />

      {isManageTab && isTeacher() ? (
        <AssignmentSettings assignmentId={Number(id)} />
      ) : (
        <>
          <div className='assignmentRubricDisplay'>
            <RubricDisplay rubricId={Number(id)} onCriterionSelect={handleCriterionSelect} grades={review} />
          </div>
          {
            isTeacher() && 
              <div className='assignmentRubric'>
                <RubricCreator id={Number(id)}/>
              </div>
          }

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
                    for (const criterion of selectedCriteria) {
                      await createCriterion(reviewData.id, criterion.row, criterion.column, "");
                    }
                    console.log('Review submitted successfully');
                  } catch (error) {
                    console.error('Error submitting review:', error);
                  }
                }}>Submit Review</button>
            </div>
          }
        </>
      )}
    </>
  );
}
