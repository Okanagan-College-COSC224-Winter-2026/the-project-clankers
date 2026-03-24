import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button";
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
            setGrades(new Array(criteriaData.length).fill(0));
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
                .filter((member: any) => member.id !== currentUserId && member.role === 'student')
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
      loadExistingReview(currentUserId, memberId, 'user');
    }
  };

  const handleExternalSelect = (targetId: number) => {
    const target = externalTargets.find(t => t.id === targetId);
    if (target) {
      setSelectedTarget({ ...target, type: 'external' });
      loadExistingReview(currentUserId, targetId, submissionType === 'group' ? 'group' : 'user');
    }
  };

  const loadExistingReview = async (userId: number | null, targetId: number, revieweeType: 'user' | 'group') => {
    if (!userId) return;
    try {
      let reviewerId = userId;
      let reviewerType: 'user' | 'group' = 'user';

      // For group external reviews, use group ID
      if (revieweeType === 'group' && submissionType === 'group') {
        const groups = await getCourseGroups(courseId);
        for (const group of groups) {
          try {
            const members = await getGroupMembers(courseId, group.id);
            if (members.some((member: any) => member.id === userId)) {
              reviewerId = group.id;
              reviewerType = 'group';
              break;
            }
          } catch (error) {
            // Skip
          }
        }
      }

      const reviewResponse = await getReview(assignmentId, reviewerId, targetId, reviewerType, revieweeType);
      const reviewData = await reviewResponse.json();

      if (reviewData.grades && reviewData.grades.length > 0) {
        // Ensure grades array matches current criteria length
        // If rubric was updated with new criteria, pad with 0s
        const paddedGrades = [...reviewData.grades];
        while (paddedGrades.length < criteria.length) {
          paddedGrades.push(0);
        }
        setGrades(paddedGrades);
      } else {
        setGrades(new Array(criteria.length).fill(0));
      }
    } catch (error) {
      console.warn('No existing review found or error loading:', error);
      setGrades(new Array(criteria.length).fill(0));
    }
  };

  const handleSubmitReview = async () => {
    if (selectedTarget && currentUserId && courseId) {
      try {
        setIsSubmitting(true);

        // Get user's group ID for external group reviews
        let reviewerId = currentUserId;
        let reviewerType = 'user';
        let revieweeType = 'user';

        if (selectedTarget.type === 'external' && submissionType === 'group') {
          try {
            const groups = await getCourseGroups(courseId);
            for (const group of groups) {
              try {
                const members = await getGroupMembers(courseId, group.id);
                if (members.some((member: any) => member.id === currentUserId)) {
                  reviewerId = group.id;
                  reviewerType = 'group';
                  break;
                }
              } catch (error) {
                // Skip if error fetching members
              }
            }
          } catch (error) {
            console.error('Error determining user group:', error);
          }
          // For external group reviews, reviewee is also a group
          revieweeType = 'group';
        }

        // Create the review
        console.log('Creating review:', {
          assignmentId,
          reviewerID: reviewerId,
          revieweeID: selectedTarget.id,
          targetName: selectedTarget.name,
          targetType: selectedTarget.type,
          reviewerType,
          revieweeType
        });
        const reviewResponse = await createReview(assignmentId, reviewerId, selectedTarget.id, reviewerType, revieweeType);
        const reviewData = await reviewResponse.json();
        const reviewId = reviewData.id;

        // Refresh rubric to ensure we have latest criteria (in case teacher added new ones)
        let currentCriteria = criteria;
        let finalGrades = grades.map(g => g === null ? 0 : g);  // Convert nulls to 0s
        try {
          const freshRubric = await getRubric(assignmentId, true);
          const freshCriteria = await getCriteria(freshRubric.id);
          currentCriteria = freshCriteria;

          // Pad grades array if rubric has grown
          while (finalGrades.length < currentCriteria.length) {
            finalGrades.push(0);
          }
          setGrades(finalGrades);
        } catch (error) {
          console.warn('Could not refresh rubric before submission, using cached criteria:', error);
        }

        // Create criterion entries for each criterion with a grade (including 0)
        for (let i = 0; i < currentCriteria.length; i++) {
          if (finalGrades[i] !== null && finalGrades[i] !== undefined && currentCriteria[i].id) {
            await createCriterion(reviewId, currentCriteria[i].id!, finalGrades[i], "");
          }
        }

        console.log('Review submitted successfully');
        // Reset and close
        setSelectedTarget(null);
        setGrades(new Array(criteria.length).fill(0));
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-[85%] max-w-6xl h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="m-0 text-2xl">{assignmentName} - Peer Review</h2>
          <button className="bg-transparent border-none text-3xl cursor-pointer text-gray-400 hover:text-gray-800 p-0 w-8 h-8 flex items-center justify-center transition-colors" onClick={onClose}>&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Selection dropdowns */}
          <div className="w-1/3 border-r p-5 overflow-y-auto">
            <h3 className="mt-0 mb-5 text-gray-800 text-lg">Select Review Target</h3>

            {isLoading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {internalReviewEnabled && submissionType === 'group' && (
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-800 text-base mb-3">Internal Review</label>
                    {groupMembers.length === 0 ? (
                      <p className="text-gray-400">No teammates available</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {groupMembers.map((member) => (
                          <div
                            key={member.id}
                            className={`p-3 border-2 rounded-md cursor-pointer transition-all text-sm ${
                              selectedTarget?.id === member.id && selectedTarget?.type === 'internal'
                                ? 'border-blue-500 bg-blue-50 text-blue-500 font-medium'
                                : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-gray-100'
                            }`}
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
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-800 text-base mb-3">External Review</label>
                    {externalTargets.length === 0 ? (
                      <p className="text-gray-400">
                        {submissionType === 'group' ? 'No other groups available' : 'No other students available'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {externalTargets.map((target) => (
                          <div
                            key={target.id}
                            className={`p-3 border-2 rounded-md cursor-pointer transition-all text-sm ${
                              selectedTarget?.id === target.id && selectedTarget?.type === 'external'
                                ? 'border-blue-500 bg-blue-50 text-blue-500 font-medium'
                                : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-gray-100'
                            }`}
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
          <div className="flex-1 p-5 flex items-center justify-center overflow-y-auto">
            {selectedTarget ? (
              <div className="w-full max-w-md flex flex-col gap-8">
                <h3 className="m-0 text-2xl text-gray-800">Review for: {selectedTarget.name}</h3>
                <p className="text-gray-500 m-0 text-base">
                  {selectedTarget.type === 'internal' ? 'Internal Review' : 'External Review'}
                </p>

                {criteria.length > 0 ? (
                  <>
                    <div className="w-full max-h-[500px] overflow-y-auto border rounded-md p-4 bg-gray-50 mb-5 flex flex-col gap-5">
                      {criteria.map((criterion, index) => {
                        // If no score or scoreMax is 0, default to 100
                        const maxScore = (!criterion.hasScore || criterion.scoreMax === 0) ? 100 : criterion.scoreMax;

                        return (
                          <div key={index} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <label className="font-medium text-gray-800 m-0 text-sm">{criterion.question}</label>
                              <span className="font-semibold text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded">
                                {grades[index] !== null ? grades[index] : 0} / {maxScore}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={maxScore}
                              value={grades[index] !== null ? grades[index] : 0}
                              onChange={(e) => {
                                const newGrades = [...grades];
                                newGrades[index] = Number(e.target.value);
                                setGrades(newGrades);
                              }}
                              className="w-full h-1.5 appearance-none bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </>
                ) : (
                  <p className="text-center text-gray-400 text-base p-5">No rubric available for this assignment</p>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-lg">
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
  reviewId: number;
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
  anonymous_review?: boolean;
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
        // Use 100 as default max if scoreMax is 0 or hasScore is false
        const maxScore = (!criteriaNow[index].hasScore || criteriaNow[index].scoreMax === 0) ? 100 : criteriaNow[index].scoreMax;
        // Convert to percentage (0-100)
        return (grade / maxScore) * 100;
      })
      .filter((g) => g !== null) as number[];

    if (normalizedGrades.length === 0) {
      return undefined;
    }

    const averagePercentage = normalizedGrades.reduce((sum, g) => sum + g, 0) / normalizedGrades.length;
    return averagePercentage;
  };

  const fetchSubmittedReviews = async (userId: number, assignmentId: number, targets: Array<{ id: number; name: string }>, type: 'internal' | 'external', criteriaToUse?: Criterion[], reviewerType: string = 'user') => {
    // Fetch all reviews in parallel
    const reviewPromises = targets.map(target =>
      getReview(assignmentId, userId, target.id, reviewerType, type === 'internal' ? 'user' : 'group')
        .then(response => response.json())
        .then(reviewData => ({
          target,
          reviewData,
          error: null
        }))
        .catch(error => ({
          target,
          reviewData: null,
          error
        }))
    );

    const results = await Promise.all(reviewPromises);

    const reviews: SubmittedReview[] = results
      .filter(result => result.reviewData?.id)
      .map(result => ({
        reviewId: result.reviewData.id,
        revieweeId: result.target.id,
        revieweeName: result.target.name,
        type: type,
        grade: calculateAverageGrade(result.reviewData.grades, criteriaToUse)
      }));

    return reviews;
  };

  const fetchReceivedReviews = async (userId: number, assignmentId: number, assignment: AssignmentDetails, criteriaToUse?: Criterion[]) => {
    const reviews: ReceivedReview[] = [];

    console.log('fetchReceivedReviews called with:', {
      userId,
      assignmentId,
      submissionType: assignment.submission_type,
      internalReview: assignment.internal_review,
      externalReview: assignment.external_review
    });

    if (assignment.submission_type === 'group') {
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

            console.log('Fetching internal reviews. Group members:', groupMembers);

            // For internal reviews: teammates review each other as INDIVIDUALS
            // revieweeID should be the USER ID (not group ID)
            const internalReviewPromises = groupMembers
              .filter((m: any) => m.id !== userId)
              .map((member: any) =>
                getReview(assignmentId, member.id, userId)  // Query with userId as reviewee
                  .then(response => response.json())
                  .then(reviewData => {
                    console.log(`Internal review from teammate ${member.id}:`, reviewData);
                    return {
                      reviewer: member,
                      reviewData,
                      error: null
                    };
                  })
                  .catch(error => {
                    console.log(`Failed to get internal review from ${member.id}:`, error);
                    return {
                      reviewer: member,
                      reviewData: null,
                      error
                    };
                  })
              );

            const internalResults = await Promise.all(internalReviewPromises);

            internalResults.forEach(result => {
              if (result.reviewData?.id) {
                console.log('Adding internal review from teammate:', result.reviewer.name || `User ${result.reviewer.id}`, result.reviewData);
                reviews.push({
                  reviewerId: result.reviewer.id,
                  reviewerName: assignment.anonymous_review ? "Anonymous" : (result.reviewer.name || `User ${result.reviewer.id}`),
                  type: 'internal',
                  grade: calculateAverageGrade(result.reviewData.grades, criteriaToUse)
                });
              }
            });
          } catch (error) {
            console.error('Error fetching received internal reviews:', error);
          }
        }

        // Check if external reviews are enabled (other groups reviewing current user's group)
        if (assignment.external_review) {
          try {
            const otherGroups = groups.filter((group: any) => group.id !== userGroupId);

            console.log('Fetching external reviews. User group ID:', userGroupId, 'Other groups:', otherGroups);

            // Fetch all external reviews in parallel
            // For external reviews: reviewerID is the GROUP ID, revieweeID is the current user's GROUP ID
            const externalReviewPromises = otherGroups.map((group: any) =>
              getReview(assignmentId, group.id, userGroupId, 'group', 'group')
                .then(response => response.json())
                .then(reviewData => {
                  console.log(`External review from group ${group.id}:`, reviewData);
                  return {
                    group,
                    reviewData,
                    error: null
                  };
                })
                .catch(error => {
                  console.log(`Failed to get external review from group ${group.id}:`, error);
                  return {
                    group,
                    reviewData: null,
                    error
                  };
                })
            );

            const externalResults = await Promise.all(externalReviewPromises);

            externalResults.forEach(result => {
              if (result.reviewData?.id) {
                console.log('Adding external review from group:', result.group.name || `Group ${result.group.id}`, result.reviewData);
                reviews.push({
                  reviewerId: result.group.id,
                  reviewerName: assignment.anonymous_review ? "Anonymous" : (result.group.name || `Group ${result.group.id}`),
                  type: 'external',
                  grade: calculateAverageGrade(result.reviewData.grades, criteriaToUse)
                });
              }
            });
          } catch (error) {
            console.error('Error fetching received external reviews:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching received group reviews:', error);
      }
    } else {
      // For individual assignments, fetch all students and check if they reviewed current user
      try {
        const members = await listCourseMembers(String(assignment.courseID));
        const otherMembers = members.filter((member: any) => member.id !== userId && member.role === 'student');

        console.log('Fetching received reviews for individual assignment. Querying reviews from:',
          otherMembers.map((m: any) => ({ id: m.id, name: m.name || m.email }))
        );

        // Fetch all reviews in parallel
        const reviewPromises = otherMembers.map((member: any) =>
          getReview(assignmentId, member.id, userId)
            .then(response => response.json())
            .then(reviewData => {
              console.log(`Review from user ${member.id} (${member.name || member.email}):`, reviewData);
              return {
                member,
                reviewData,
                error: null
              };
            })
            .catch(error => {
              console.log(`Failed to get review from user ${member.id}:`, error);
              return {
                member,
                reviewData: null,
                error
              };
            })
        );

        const results = await Promise.all(reviewPromises);

        results.forEach(result => {
          if (result.reviewData?.id) {
            console.log('Adding received review from:', result.member.name || result.member.email, result.reviewData);
            reviews.push({
              reviewerId: result.member.id,
              reviewerName: assignment.anonymous_review ? "Anonymous" : (result.member.name || result.member.email),
              type: 'external',
              grade: calculateAverageGrade(result.reviewData.grades, criteriaToUse)
            });
          }
        });
      } catch (error) {
        console.error('Error fetching received individual reviews:', error);
      }
    }

    console.log('Total received reviews found:', reviews.length, reviews);
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
            let reviewerId = userId;
            let reviewerType = 'user';

            if (assignmentData.submission_type === 'group') {
              const groups = await getCourseGroups(assignmentData.courseID);

              // Find the current user's group to exclude it
              let userGroupId: number | null = null;
              for (const group of groups) {
                try {
                  const members = await getGroupMembers(assignmentData.courseID, group.id);
                  if (members.some((member: any) => member.id === userId)) {
                    userGroupId = group.id;
                    reviewerId = group.id;
                    reviewerType = 'group';
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
                .filter((member: any) => member.id !== userId && member.role === 'student')
                .map((member: any) => ({
                  id: member.id,
                  name: member.name || member.email
                }));
            }
            const externalReviews = await fetchSubmittedReviews(reviewerId, Number(id), externalTargets, 'external', criteriaData, reviewerType);
            allReviews.push(...externalReviews);
          } catch (error) {
            console.error('Error fetching external reviews:', error);
          }
        }

        // Deduplicate reviews by reviewId (in case user IDs and group IDs overlap)
        const uniqueReviews = allReviews.filter((review, index, self) =>
          index === self.findIndex((r) => r.reviewId === review.reviewId)
        );

        setSubmittedReviews(uniqueReviews);

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
    return <div className="p-5 max-w-6xl mx-auto">Loading...</div>;
  }

  if (!assignment) {
    return <div className="p-5 max-w-6xl mx-auto">Assignment not found</div>;
  }

  const hasReviewsEnabled = assignment.internal_review || assignment.external_review;

  if (!hasReviewsEnabled) {
    return (
      <div className="p-5 max-w-6xl mx-auto">
        <div className="text-center py-10 text-gray-400">
          <p>Peer reviews are not enabled for this assignment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="mb-1">Peer Reviews Dashboard</h2>
        <p className="text-gray-500 m-0">Submit reviews for this assignment</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center p-5 border rounded-lg bg-white hover:shadow-md transition-shadow">
          <div className="flex-1">
            <h3 className="m-0 mb-2.5 text-xl">Submit a Review</h3>
            <div className="flex gap-2.5 mb-2.5">
              {assignment.internal_review && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Internal Review Enabled</span>
              )}
              {assignment.external_review && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">External Review Enabled</span>
              )}
            </div>
            {assignment.due_date && (
              <p className="text-gray-500 text-sm m-0">
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            Start Review
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="mb-4 text-gray-800">Your Submitted Reviews</h3>
        {submittedReviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No reviews submitted yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {submittedReviews.map((review) => (
              <div key={review.reviewId} className="flex justify-between items-center p-4 border rounded-md bg-gray-50 transition-all hover:shadow-md hover:border-gray-400">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-gray-800 text-base">{review.revieweeName}</span>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">{review.type === 'internal' ? 'Internal' : 'External'}</span>
                </div>
                {review.grade !== undefined ? (
                  <div className="text-xl font-semibold text-blue-600 py-2 px-4 bg-green-100 rounded-lg min-w-[60px] text-center">
                    {review.grade.toFixed(1)}
                  </div>
                ) : (
                  <div className="text-xl font-semibold py-2 px-4 rounded-lg min-w-[60px] text-center bg-gray-100 text-gray-400">
                    N/A
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <h3 className="mb-4 text-gray-800">Reviews Received</h3>
        {receivedReviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No reviews received yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {receivedReviews.map((review) => (
              <div key={`${review.type}-${review.reviewerId}`} className="flex justify-between items-center p-4 border rounded-md bg-gray-50 transition-all hover:shadow-md hover:border-gray-400">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-gray-800 text-base">{review.reviewerName}</span>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">{review.type === 'internal' ? 'Internal' : 'External'}</span>
                </div>
                {review.grade !== undefined ? (
                  <div className="text-xl font-semibold text-blue-600 py-2 px-4 bg-green-100 rounded-lg min-w-[60px] text-center">
                    {review.grade.toFixed(1)}
                  </div>
                ) : (
                  <div className="text-xl font-semibold py-2 px-4 rounded-lg min-w-[60px] text-center bg-gray-100 text-gray-400">
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
                    let reviewerId = currentUserId;
                    let reviewerType = 'user';

                    if (assignment.submission_type === 'group') {
                      const groups = await getCourseGroups(assignment.courseID);

                      // Find the current user's group to exclude it
                      let userGroupId: number | null = null;
                      for (const group of groups) {
                        try {
                          const members = await getGroupMembers(assignment.courseID, group.id);
                          if (members.some((member: any) => member.id === currentUserId)) {
                            userGroupId = group.id;
                            reviewerId = group.id;
                            reviewerType = 'group';
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
                        .filter((member: any) => member.id !== currentUserId && member.role === 'student')
                        .map((member: any) => ({
                          id: member.id,
                          name: member.name || member.email
                        }));
                    }
                    const externalReviews = await fetchSubmittedReviews(reviewerId, assignment.id, externalTargets, 'external', criteria, reviewerType);
                    allReviews.push(...externalReviews);
                  } catch (error) {
                    console.error('Error fetching external reviews:', error);
                  }
                }

                // Deduplicate reviews by reviewId (in case user IDs and group IDs overlap)
                const uniqueReviews = allReviews.filter((review, index, self) =>
                  index === self.findIndex((r) => r.reviewId === review.reviewId)
                );

                setSubmittedReviews(uniqueReviews);

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
