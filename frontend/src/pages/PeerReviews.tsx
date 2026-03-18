import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button";
import "./PeerReviews.css";
import {
  getAssignmentDetails,
  getUserId,
  listStuGroup,
  getCourseGroups,
  listCourseMembers,
  createReview,
  getReview,
  getGroupMembers,
  getRubric,
  getCriteria,
  createCriterion
} from "../util/api";

interface PeerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assignmentName: string;
  submissionType: 'individual' | 'group';
  internalReviewEnabled: boolean;
  externalReviewEnabled: boolean;
  courseId: number;
  onReviewSubmitted?: () => void;
}

function PeerReviewModal({
  isOpen,
  onClose,
  assignmentId,
  assignmentName,
  submissionType,
  internalReviewEnabled,
  externalReviewEnabled,
  courseId,
  onReviewSubmitted
}: PeerReviewModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<{ id: number; name: string; type: 'internal' | 'external' } | null>(null);
  const [groupMembers, setGroupMembers] = useState<Array<{ id: number; name: string }>>([]);
  const [externalTargets, setExternalTargets] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Rubric and criteria state
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [grades, setGrades] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          setIsLoading(true);

          // Get current user ID
          const userIdResponse = await getUserId();
          const currentUserId = userIdResponse.id;
          setCurrentUserId(currentUserId);

          // Fetch rubric for this assignment
          try {
            const rubricData = await getRubric(assignmentId, true);

            // Fetch criteria descriptions
            const criteriaData = await getCriteria(rubricData.id);
            setCriteria(criteriaData);
            setGrades(new Array(criteriaData.length).fill(null));
          } catch (error) {
            console.warn('No rubric found for assignment:', error);
            setCriteria([]);
            setGrades([]);
          }

          // Fetch group members for internal review (if enabled and group assignment)
          if (internalReviewEnabled && submissionType === 'group') {
            const groupData = await listStuGroup(assignmentId, currentUserId);
            const teammates = groupData
              .filter((member: any) => member.id !== currentUserId)
              .map((member: any) => ({
                id: member.id,
                name: member.name || `User ${member.id}`
              }));
            setGroupMembers(teammates);
          }

          // Fetch external targets based on submission type
          if (externalReviewEnabled) {
            if (submissionType === 'group') {
              const groups = await getCourseGroups(courseId);
              let userGroupId: number | null = null;
              for (const group of groups) {
                try {
                  const members = await getGroupMembers(courseId, group.id);
                  if (members.some((member: any) => member.id === currentUserId)) {
                    userGroupId = group.id;
                    break;
                  }
                } catch (error) {
                  // Skip if error fetching members
                }
              }

              const groupList = groups
                .filter((group: any) => group.id !== userGroupId)
                .map((group: any) => ({
                  id: group.id,
                  name: group.name || `Group ${group.id}`
                }));
              setExternalTargets(groupList);
            } else {
              const members = await listCourseMembers(String(courseId));
              const classmates = members
                .filter((member: any) => member.id !== currentUserId)
                .map((member: any) => ({
                  id: member.id,
                  name: member.name || member.email
                }));
              setExternalTargets(classmates);
            }
          }
        } catch (error) {
          console.error('Error fetching review targets:', error);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [isOpen, submissionType, assignmentId, courseId, internalReviewEnabled, externalReviewEnabled]);

  const handleInternalSelect = (memberId: number) => {
    const member = groupMembers.find(m => m.id === memberId);
    if (member) {
      setSelectedTarget({ ...member, type: 'internal' });
      setGrades(new Array(criteria.length).fill(null));
    }
  };

  const handleExternalSelect = (targetId: number) => {
    const target = externalTargets.find(t => t.id === targetId);
    if (target) {
      setSelectedTarget({ ...target, type: 'external' });
      setGrades(new Array(criteria.length).fill(null));
    }
  };

  const handleSubmitReview = async () => {
    if (selectedTarget && currentUserId) {
      try {
        setIsSubmitting(true);

        // Create the review
        const reviewResponse = await createReview(assignmentId, currentUserId, selectedTarget.id);
        const reviewData = await reviewResponse.json();
        const reviewId = reviewData.id;

        // Create criterion entries for each scored criterion
        for (let i = 0; i < criteria.length; i++) {
          if (criteria[i].hasScore && grades[i] !== null && criteria[i].id) {
            await createCriterion(reviewId, criteria[i].id!, grades[i], "");
          }
        }

        console.log('Review submitted successfully');
        // Reset and close
        setSelectedTarget(null);
        setGrades(new Array(criteria.length).fill(null));
        onClose();

        // Trigger refresh of submitted reviews
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{assignmentName} - Peer Review</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-split-container">
          {/* Left side - Selection dropdowns */}
          <div className="modal-left-panel">
            <h3>Select Review Target</h3>

            {isLoading ? (
              <div className="review-loading">Loading...</div>
            ) : (
              <>
                {internalReviewEnabled && submissionType === 'group' && (
                  <div className="review-section">
                    <label>Internal Review</label>
                    {groupMembers.length === 0 ? (
                      <p className="no-targets">No teammates available</p>
                    ) : (
                      <div className="review-list">
                        {groupMembers.map((member) => (
                          <div
                            key={member.id}
                            className={`review-list-item ${selectedTarget?.id === member.id && selectedTarget?.type === 'internal' ? 'active' : ''}`}
                            onClick={() => handleInternalSelect(member.id)}
                          >
                            {member.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {externalReviewEnabled && (
                  <div className="review-section">
                    <label>External Review</label>
                    {externalTargets.length === 0 ? (
                      <p className="no-targets">
                        {submissionType === 'group' ? 'No other groups available' : 'No other students available'}
                      </p>
                    ) : (
                      <div className="review-list">
                        {externalTargets.map((target) => (
                          <div
                            key={target.id}
                            className={`review-list-item ${selectedTarget?.id === target.id && selectedTarget?.type === 'external' ? 'active' : ''}`}
                            onClick={() => handleExternalSelect(target.id)}
                          >
                            {target.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right side - Rubric scoring */}
          <div className="modal-right-panel">
            {selectedTarget ? (
              <div className="review-grade-panel">
                <h3>Review for: {selectedTarget.name}</h3>
                <p className="review-type-label">
                  {selectedTarget.type === 'internal' ? 'Internal Review' : 'External Review'}
                </p>

                {criteria.length > 0 ? (
                  <>
                    <div className="rubric-scoring">
                      {criteria.map((criterion, index) => (
                        <div key={index} className="criterion-slider-group">
                          <div className="criterion-header">
                            <label>{criterion.question}</label>
                            <span className="criterion-score">
                              {grades[index] !== null ? grades[index] : 0} / {criterion.scoreMax}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={criterion.scoreMax}
                            value={grades[index] !== null ? grades[index] : 0}
                            onChange={(e) => {
                              const newGrades = [...grades];
                              newGrades[index] = Number(e.target.value);
                              setGrades(newGrades);
                            }}
                            className="criterion-slider"
                          />
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </>
                ) : (
                  <p className="no-rubric">No rubric available for this assignment</p>
                )}
              </div>
            ) : (
              <div className="review-grade-panel-empty">
                <p>Select a person or group from the left to begin reviewing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SubmittedReview {
  revieweeId: number;
  revieweeName: string;
  type: 'internal' | 'external';
  grade?: number;
}

interface ReceivedReview {
  reviewerId: number;
  reviewerName: string;
  type: 'internal' | 'external';
  grade?: number;
}

interface AssignmentDetails {
  id: number;
  name: string;
  courseID: number;
  submission_type?: 'individual' | 'group';
  internal_review?: boolean;
  external_review?: boolean;
  due_date?: string;
}

export default function PeerReviews() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedReviews, setSubmittedReviews] = useState<SubmittedReview[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  // Helper function to calculate average grade normalized by criterion max scores
  const calculateAverageGrade = (grades: (number | null)[], criteriaToUse?: Criterion[]): number | undefined => {
    const criteriaNow = criteriaToUse || criteria;
    if (!grades || grades.length === 0 || criteriaNow.length === 0) {
      return undefined;
    }

    // Normalize each grade as a percentage, then average the percentages
    const normalizedGrades = grades
      .map((grade, index) => {
        if (grade === null || !criteriaNow[index]) return null;
        // Convert to percentage (0-100)
        return (grade / criteriaNow[index].scoreMax) * 100;
      })
      .filter((g) => g !== null) as number[];

    if (normalizedGrades.length === 0) {
      return undefined;
    }

    const averagePercentage = normalizedGrades.reduce((sum, g) => sum + g, 0) / normalizedGrades.length;
    return averagePercentage;
  };

  const fetchSubmittedReviews = async (userId: number, assignmentId: number, targets: Array<{ id: number; name: string }>, type: 'internal' | 'external', criteriaToUse?: Criterion[]) => {
    const reviews: SubmittedReview[] = [];
    for (const target of targets) {
      try {
        const reviewResponse = await getReview(assignmentId, userId, target.id);
        const reviewData = await reviewResponse.json();
        // Check if a review exists by looking for the id field (which is present on the review object)
        if (reviewData.id) {
          const averageGrade = calculateAverageGrade(reviewData.grades, criteriaToUse);

          reviews.push({
            revieweeId: target.id,
            revieweeName: target.name,
            type: type,
            grade: averageGrade
          });
        }
      } catch (error) {
        // Review doesn't exist, skip
      }
    }
    return reviews;
  };

  const fetchReceivedReviews = async (userId: number, assignmentId: number, assignment: AssignmentDetails, criteriaToUse?: Criterion[]) => {
    const reviews: ReceivedReview[] = [];

    if (assignment.submission_type === 'group') {
      // For group assignments, need to check if users from other groups reviewed current user's group
      try {
        const groups = await getCourseGroups(assignment.courseID);

        // Find current user's group ID
        let userGroupId: number | null = null;
        for (const group of groups) {
          try {
            const members = await getGroupMembers(assignment.courseID, group.id);
            if (members.some((member: any) => member.id === userId)) {
              userGroupId = group.id;
              break;
            }
          } catch (error) {
            // Skip
          }
        }

        if (userGroupId === null) return reviews;

        // Check if internal reviews are enabled (teammates reviewing each other)
        if (assignment.internal_review) {
          try {
            const groupMembers = await listStuGroup(assignmentId, userId);
            for (const member of groupMembers) {
              if (member.id === userId) continue; // Skip self

              try {
                const reviewResponse = await getReview(assignmentId, member.id, userId);
                const reviewData = await reviewResponse.json();
                console.log('Internal review data for member', member.id, ':', reviewData);
                if (reviewData.id) {
                  const averageGrade = calculateAverageGrade(reviewData.grades, criteriaToUse);
                  console.log('Calculated average grade:', averageGrade, 'from grades:', reviewData.grades);

                  reviews.push({
                    reviewerId: member.id,
                    reviewerName: member.name || `User ${member.id}`,
                    type: 'internal',
                    grade: averageGrade
                  });
                }
              } catch (error) {
                // Review doesn't exist, skip
              }
            }
          } catch (error) {
            console.error('Error fetching received internal reviews:', error);
          }
        }

        // Check if external reviews are enabled (other groups reviewing current user's group)
        if (assignment.external_review) {
          // For each group (except current user's), check if any member reviewed the user's group
          for (const group of groups) {
            if (group.id === userGroupId) continue; // Skip own group

            try {
              // Get members of this group
              const groupMembers = await getGroupMembers(assignment.courseID, group.id);

              // Check if any member of this group reviewed the current user's group
              for (const member of groupMembers) {
                try {
                  const reviewResponse = await getReview(assignmentId, member.id, userGroupId);
                  const reviewData = await reviewResponse.json();
                  console.log('External review data from member', member.id, ':', reviewData);
                  if (reviewData.id) {
                    const averageGrade = calculateAverageGrade(reviewData.grades, criteriaToUse);
                    console.log('Calculated average grade:', averageGrade, 'from grades:', reviewData.grades);

                    reviews.push({
                      reviewerId: member.id,
                      reviewerName: member.name || `User ${member.id}`,
                      type: 'external',
                      grade: averageGrade
                    });
                  }
                } catch (error) {
                  // Review doesn't exist, skip
                }
              }
            } catch (error) {
              // Skip if error fetching members
            }
          }
        }
      } catch (error) {
        console.error('Error fetching received group reviews:', error);
      }
    } else {
      // For individual assignments, fetch all students and check if they reviewed current user
      try {
        const members = await listCourseMembers(String(assignment.courseID));

        for (const member of members) {
          if (member.id === userId) continue; // Skip self

          try {
            const reviewResponse = await getReview(assignmentId, member.id, userId);
            const reviewData = await reviewResponse.json();
            console.log('Individual review data from member', member.id, ':', reviewData);
            if (reviewData.id) {
              const averageGrade = calculateAverageGrade(reviewData.grades, criteriaToUse);
              console.log('Calculated average grade:', averageGrade, 'from grades:', reviewData.grades);

              reviews.push({
                reviewerId: member.id,
                reviewerName: member.name || member.email,
                type: 'external',
                grade: averageGrade
              });
            }
          } catch (error) {
            // Review doesn't exist, skip
          }
        }
      } catch (error) {
        console.error('Error fetching received individual reviews:', error);
      }
    }

    return reviews;
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const assignmentData = await getAssignmentDetails(Number(id));
        setAssignment(assignmentData);

        // Get current user ID
        const userIdResponse = await getUserId();
        const userId = userIdResponse.id;
        setCurrentUserId(userId);

        // Fetch rubric and criteria for grade calculation
        let criteriaData: Criterion[] = [];
        try {
          const rubricData = await getRubric(assignmentData.id, true);
          criteriaData = await getCriteria(rubricData.id);
          setCriteria(criteriaData);
        } catch (error) {
          console.warn('Could not load rubric and criteria:', error);
          setCriteria([]);
        }

        // Fetch submitted reviews
        const allReviews: SubmittedReview[] = [];

        // Fetch internal reviews (if enabled and group assignment)
        if (assignmentData.internal_review && assignmentData.submission_type === 'group') {
          try {
            const groupMembers = await listStuGroup(assignmentData.id, userId);
            const teammates = groupMembers.filter((member: any) => member.id !== userId);
            const internalReviews = await fetchSubmittedReviews(userId, Number(id), teammates, 'internal', criteriaData);
            allReviews.push(...internalReviews);
          } catch (error) {
            console.error('Error fetching internal reviews:', error);
          }
        }

        // Fetch external reviews (if enabled)
        if (assignmentData.external_review) {
          try {
            let externalTargets: Array<{ id: number; name: string }> = [];
            if (assignmentData.submission_type === 'group') {
              const groups = await getCourseGroups(assignmentData.courseID);

              // Find the current user's group to exclude it
              let userGroupId: number | null = null;
              for (const group of groups) {
                try {
                  const members = await getGroupMembers(assignmentData.courseID, group.id);
                  if (members.some((member: any) => member.id === userId)) {
                    userGroupId = group.id;
                    break;
                  }
                } catch (error) {
                  // Skip if error fetching members
                }
              }

              // Filter out the user's own group
              externalTargets = groups
                .filter((group: any) => group.id !== userGroupId)
                .map((group: any) => ({
                  id: group.id,
                  name: group.name || `Group ${group.id}`
                }));
            } else {
              const members = await listCourseMembers(String(assignmentData.courseID));
              externalTargets = members
                .filter((member: any) => member.id !== userId)
                .map((member: any) => ({
                  id: member.id,
                  name: member.name || member.email
                }));
            }
            const externalReviews = await fetchSubmittedReviews(userId, Number(id), externalTargets, 'external', criteriaData);
            allReviews.push(...externalReviews);
          } catch (error) {
            console.error('Error fetching external reviews:', error);
          }
        }

        setSubmittedReviews(allReviews);

        // Fetch received reviews
        const receivedReviewsList = await fetchReceivedReviews(userId, Number(id), assignmentData, criteriaData);
        setReceivedReviews(receivedReviewsList);
      } catch (error) {
        console.error('Error fetching assignment details:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return <div className="peer-reviews-container">Loading...</div>;
  }

  if (!assignment) {
    return <div className="peer-reviews-container">Assignment not found</div>;
  }

  const hasReviewsEnabled = assignment.internal_review || assignment.external_review;

  if (!hasReviewsEnabled) {
    return (
      <div className="peer-reviews-container">
        <div className="no-reviews">
          <p>Peer reviews are not enabled for this assignment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="peer-reviews-container">
      <div className="peer-reviews-header">
        <h2>Peer Reviews Dashboard</h2>
        <p>Submit reviews for this assignment</p>
      </div>

      <div className="peer-review-options">
        <div className="peer-review-card">
          <div className="peer-review-info">
            <h3>Submit a Review</h3>
            <div className="peer-review-details">
              {assignment.internal_review && (
                <span className="review-badge">Internal Review Enabled</span>
              )}
              {assignment.external_review && (
                <span className="review-badge">External Review Enabled</span>
              )}
            </div>
            {assignment.due_date && (
              <p className="due-date">
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            Start Review
          </Button>
        </div>
      </div>

      <div className="peer-reviews-list">
        <h3>Your Submitted Reviews</h3>
        {submittedReviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews submitted yet</p>
          </div>
        ) : (
          <div className="reviews-list">
            {submittedReviews.map((review) => (
              <div key={`${review.type}-${review.revieweeId}`} className="review-item">
                <div className="review-item-info">
                  <span className="review-target-name">{review.revieweeName}</span>
                  <span className="review-type-badge">{review.type === 'internal' ? 'Internal' : 'External'}</span>
                </div>
                {review.grade !== undefined ? (
                  <div className="review-grade-display">
                    {review.grade.toFixed(1)}
                  </div>
                ) : (
                  <div className="review-grade-display" style={{ backgroundColor: '#f5f5f5', color: '#999' }}>
                    N/A
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="peer-reviews-list">
        <h3>Reviews Received</h3>
        {receivedReviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews received yet</p>
          </div>
        ) : (
          <div className="reviews-list">
            {receivedReviews.map((review) => (
              <div key={`${review.type}-${review.reviewerId}`} className="review-item">
                <div className="review-item-info">
                  <span className="review-target-name">{review.reviewerName}</span>
                  <span className="review-type-badge">{review.type === 'internal' ? 'Internal' : 'External'}</span>
                </div>
                {review.grade !== undefined ? (
                  <div className="review-grade-display">
                    {review.grade.toFixed(1)}
                  </div>
                ) : (
                  <div className="review-grade-display" style={{ backgroundColor: '#f5f5f5', color: '#999' }}>
                    N/A
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {assignment && (
        <PeerReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          assignmentId={assignment.id}
          assignmentName={assignment.name}
          submissionType={assignment.submission_type || 'individual'}
          internalReviewEnabled={assignment.internal_review || false}
          externalReviewEnabled={assignment.external_review || false}
          courseId={assignment.courseID}
          onReviewSubmitted={() => {
            // Refresh the submitted reviews list
            if (currentUserId) {
              (async () => {
                const allReviews: SubmittedReview[] = [];

                if (assignment.internal_review && assignment.submission_type === 'group') {
                  try {
                    const groupMembers = await listStuGroup(assignment.id, currentUserId);
                    const teammates = groupMembers.filter((member: any) => member.id !== currentUserId);
                    const internalReviews = await fetchSubmittedReviews(currentUserId, assignment.id, teammates, 'internal', criteria);
                    allReviews.push(...internalReviews);
                  } catch (error) {
                    console.error('Error fetching internal reviews:', error);
                  }
                }

                if (assignment.external_review) {
                  try {
                    let externalTargets: Array<{ id: number; name: string }> = [];
                    if (assignment.submission_type === 'group') {
                      const groups = await getCourseGroups(assignment.courseID);

                      // Find the current user's group to exclude it
                      let userGroupId: number | null = null;
                      for (const group of groups) {
                        try {
                          const members = await getGroupMembers(assignment.courseID, group.id);
                          if (members.some((member: any) => member.id === currentUserId)) {
                            userGroupId = group.id;
                            break;
                          }
                        } catch (error) {
                          // Skip if error fetching members
                        }
                      }

                      // Filter out the user's own group
                      externalTargets = groups
                        .filter((group: any) => group.id !== userGroupId)
                        .map((group: any) => ({
                          id: group.id,
                          name: group.name || `Group ${group.id}`
                        }));
                    } else {
                      const members = await listCourseMembers(String(assignment.courseID));
                      externalTargets = members
                        .filter((member: any) => member.id !== currentUserId)
                        .map((member: any) => ({
                          id: member.id,
                          name: member.name || member.email
                        }));
                    }
                    const externalReviews = await fetchSubmittedReviews(currentUserId, assignment.id, externalTargets, 'external', criteria);
                    allReviews.push(...externalReviews);
                  } catch (error) {
                    console.error('Error fetching external reviews:', error);
                  }
                }

                setSubmittedReviews(allReviews);

                // Also refresh received reviews (since others may have submitted reviews after this user submitted)
                const updatedReceivedReviews = await fetchReceivedReviews(currentUserId, assignment.id, assignment, criteria);
                setReceivedReviews(updatedReceivedReviews);
              })();
            }
          }}
        />
      )}
    </div>
  );
}
