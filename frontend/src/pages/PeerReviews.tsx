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
  getGroupMembers
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
  const [grade, setGrade] = useState<number>(0);
  const [groupMembers, setGroupMembers] = useState<Array<{ id: number; name: string }>>([]);
  const [externalTargets, setExternalTargets] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          setIsLoading(true);

          // Get current user ID
          const userIdResponse = await getUserId();
          const currentUserId = userIdResponse.id;
          setCurrentUserId(currentUserId);

          // Fetch group members for internal review (if enabled and group assignment)
          if (internalReviewEnabled && submissionType === 'group') {
            const groupData = await listStuGroup(assignmentId, currentUserId);
            // Filter out the current user from the list
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
              // Fetch all groups in the course
              const groups = await getCourseGroups(courseId);

              // Find the current user's group to exclude it
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

              // Filter out the user's own group
              const groupList = groups
                .filter((group: any) => group.id !== userGroupId)
                .map((group: any) => ({
                  id: group.id,
                  name: group.name || `Group ${group.id}`
                }));
              setExternalTargets(groupList);
            } else {
              // Fetch all students in the course
              const members = await listCourseMembers(String(courseId));
              // Filter out the current user
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
      setGrade(0);
    }
  };

  const handleExternalSelect = (targetId: number) => {
    const target = externalTargets.find(t => t.id === targetId);
    if (target) {
      setSelectedTarget({ ...target, type: 'external' });
      setGrade(0);
    }
  };

  const handleSubmitReview = async () => {
    if (selectedTarget && currentUserId) {
      try {
        setIsSubmitting(true);
        // Submit review to backend
        await createReview(assignmentId, currentUserId, selectedTarget.id);
        console.log('Review submitted successfully');
        // Reset and close
        setSelectedTarget(null);
        setGrade(0);
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

          {/* Right side - Grade submission */}
          <div className="modal-right-panel">
            {selectedTarget ? (
              <div className="review-grade-panel">
                <h3>Review for: {selectedTarget.name}</h3>
                <p className="review-type-label">
                  {selectedTarget.type === 'internal' ? 'Internal Review' : 'External Review'}
                </p>

                <div className="grade-section">
                  <label htmlFor="grade-slider">Grade: {grade}</label>
                  <input
                    id="grade-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="grade-slider"
                  />
                  <div className="grade-labels">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>

                <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
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
}

interface ReceivedReview {
  reviewerId: number;
  reviewerName: string;
  type: 'internal' | 'external';
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

  const fetchSubmittedReviews = async (userId: number, assignmentId: number, targets: Array<{ id: number; name: string }>, type: 'internal' | 'external') => {
    const reviews: SubmittedReview[] = [];
    for (const target of targets) {
      try {
        const reviewResponse = await getReview(assignmentId, userId, target.id);
        const reviewData = await reviewResponse.json();
        if (reviewData.review) {
          reviews.push({
            revieweeId: target.id,
            revieweeName: target.name,
            type: type
          });
        }
      } catch (error) {
        // Review doesn't exist, skip
      }
    }
    return reviews;
  };

  const fetchReceivedReviews = async (userId: number, assignmentId: number, assignment: AssignmentDetails) => {
    const reviews: ReceivedReview[] = [];

    if (assignment.submission_type === 'group') {
      // For group assignments, fetch all groups and check if they reviewed current user's group
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

        // Check each group (except current user's) for reviews
        for (const group of groups) {
          if (group.id === userGroupId) continue; // Skip own group

          try {
            const reviewResponse = await getReview(assignmentId, group.id, userGroupId);
            const reviewData = await reviewResponse.json();
            if (reviewData.review) {
              reviews.push({
                reviewerId: group.id,
                reviewerName: group.name || `Group ${group.id}`,
                type: 'external'
              });
            }
          } catch (error) {
            // Review doesn't exist, skip
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
            if (reviewData.review) {
              reviews.push({
                reviewerId: member.id,
                reviewerName: member.name || member.email,
                type: 'external'
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

        // Fetch submitted reviews
        const allReviews: SubmittedReview[] = [];

        // Fetch internal reviews (if enabled and group assignment)
        if (assignmentData.internal_review && assignmentData.submission_type === 'group') {
          try {
            const groupMembers = await listStuGroup(assignmentData.id, userId);
            const teammates = groupMembers.filter((member: any) => member.id !== userId);
            const internalReviews = await fetchSubmittedReviews(userId, Number(id), teammates, 'internal');
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
            const externalReviews = await fetchSubmittedReviews(userId, Number(id), externalTargets, 'external');
            allReviews.push(...externalReviews);
          } catch (error) {
            console.error('Error fetching external reviews:', error);
          }
        }

        setSubmittedReviews(allReviews);

        // Fetch received reviews
        const receivedReviewsList = await fetchReceivedReviews(userId, Number(id), assignmentData);
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
                    const internalReviews = await fetchSubmittedReviews(currentUserId, assignment.id, teammates, 'internal');
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
                    const externalReviews = await fetchSubmittedReviews(currentUserId, assignment.id, externalTargets, 'external');
                    allReviews.push(...externalReviews);
                  } catch (error) {
                    console.error('Error fetching external reviews:', error);
                  }
                }

                setSubmittedReviews(allReviews);

                // Also refresh received reviews (since others may have submitted reviews after this user submitted)
                const updatedReceivedReviews = await fetchReceivedReviews(currentUserId, assignment.id, assignment);
                setReceivedReviews(updatedReceivedReviews);
              })();
            }
          }}
        />
      )}
    </div>
  );
}
