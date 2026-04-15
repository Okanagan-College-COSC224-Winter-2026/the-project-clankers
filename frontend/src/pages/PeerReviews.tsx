import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { parseUTC } from "../util/dates";
import Button from "../components/Button";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RubricViewModal from "../components/RubricViewModal";
import ViewSubmissionModal from "../components/ViewSubmissionModal";
import { Loader2, Paperclip, FileText, Eye, Download, ChevronDown, MessageSquare, AlertCircle, Clock, Users } from "lucide-react";
import {
  getAssignmentDetails,
  getUserId,
  getReviewTargets,
  createReview,
  getReview,
  getRubric,
  getCriteria,
  createCriterion,
  getMyGroup,
  getSubmittedReviews,
  getReceivedReviews,
  SubmittedReviewData,
  ReceivedReviewData,
  getPeerReviewSubmissions,
  downloadStudentSubmission,
  ReviewTarget,
  listClasses,
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
  const [groupMembers, setGroupMembers] = useState<ReviewTarget[]>([]);
  const [externalTargets, setExternalTargets] = useState<ReviewTarget[]>([]);
  const [reviewerEligible, setReviewerEligible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userGroupId, setUserGroupId] = useState<number | null>(null);
  const [targetSubmissions, setTargetSubmissions] = useState<any[]>([]);
  const [submissionsExpanded, setSubmissionsExpanded] = useState(false);
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<any>(null);
  const [isViewSubmissionModalOpen, setIsViewSubmissionModalOpen] = useState(false);

  // Rubric and criteria state
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [grades, setGrades] = useState<number[]>([]);
  const [comments, setComments] = useState<string[]>([]);

  // Helper function to filter criteria based on review type
  const filterCriteriaByType = (allCriteria: Criterion[], reviewType: 'internal' | 'external' | null) => {
    if (!reviewType) return allCriteria;
    return allCriteria.filter(c =>
      !c.criteriaType || c.criteriaType === 'both' || c.criteriaType === reviewType
    );
  };

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          setIsLoading(true);

          // Get current user ID
          const userIdResponse = await getUserId();
          const currentUserId = userIdResponse.id;
          setCurrentUserId(currentUserId);

          // Get user's group ID upfront for group assignments (single API call)
          let fetchedUserGroupId: number | null = null;
          if (submissionType === 'group') {
            const groupData = await getMyGroup(courseId);
            fetchedUserGroupId = groupData.groupId;
            setUserGroupId(fetchedUserGroupId);
          }

          // Fetch rubric for this assignment
          try {
            const rubricData = await getRubric(assignmentId, true);

            // Fetch criteria descriptions
            const criteriaData = await getCriteria(rubricData.id);
            setCriteria(criteriaData);
            setGrades(new Array(criteriaData.length).fill(0));
            setComments(new Array(criteriaData.length).fill(''));
          } catch (error) {
            console.warn('No rubric found for assignment:', error);
            setCriteria([]);
            setGrades([]);
            setComments([]);
          }

          // Fetch review targets with submission status from backend
          const targets = await getReviewTargets(assignmentId);
          setReviewerEligible(targets.reviewer_eligible);

          if (internalReviewEnabled && submissionType === 'group') {
            setGroupMembers(targets.internal_targets);
          }

          if (externalReviewEnabled) {
            setExternalTargets(targets.external_targets);
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
      setSubmissionsExpanded(false);
      loadExistingReview(currentUserId, memberId, 'user', 'internal');
      // Load submissions for this member
      loadTargetSubmissions(memberId, 'user');
    }
  };

  const handleExternalSelect = (targetId: number) => {
    const target = externalTargets.find(t => t.id === targetId);
    if (target) {
      setSelectedTarget({ ...target, type: 'external' });
      setSubmissionsExpanded(false);
      loadExistingReview(currentUserId, targetId, submissionType === 'group' ? 'group' : 'user', 'external');
      // Load submissions for this target
      loadTargetSubmissions(targetId, submissionType === 'group' ? 'group' : 'user');
    }
  };

  const loadExistingReview = async (userId: number | null, targetId: number, revieweeType: 'user' | 'group', reviewType?: 'internal' | 'external') => {
    if (!userId) return;
    try {
      let reviewerId = userId;
      let reviewerType: 'user' | 'group' = 'user';

      // For group external reviews, use cached group ID
      if (revieweeType === 'group' && submissionType === 'group' && userGroupId) {
        reviewerId = userGroupId;
        reviewerType = 'group';
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

      if (reviewData.comments && reviewData.comments.length > 0) {
        // Ensure comments array matches current criteria length
        const paddedComments = [...reviewData.comments];
        while (paddedComments.length < criteria.length) {
          paddedComments.push('');
        }
        setComments(paddedComments);
      } else {
        setComments(new Array(criteria.length).fill(''));
      }
    } catch (error) {
      console.warn('No existing review found or error loading:', error);
      setGrades(new Array(criteria.length).fill(0));
      setComments(new Array(criteria.length).fill(''));
    }
  };

  const loadTargetSubmissions = async (targetId: number, targetType: 'user' | 'group') => {
    try {
      const submissions = await getPeerReviewSubmissions(assignmentId, targetId, targetType);
      setTargetSubmissions(submissions);
    } catch (error) {
      console.error('[ERROR] Error loading target submissions:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      setTargetSubmissions([]);
    }
  };

  const handleSubmitReview = async () => {
    if (selectedTarget && currentUserId && courseId) {
      try {
        setIsSubmitting(true);

        // Get user's group ID for external group reviews (use cached value)
        let reviewerId = currentUserId;
        let reviewerType = 'user';
        let revieweeType = 'user';

        if (selectedTarget.type === 'external' && submissionType === 'group') {
          if (userGroupId) {
            reviewerId = userGroupId;
            reviewerType = 'group';
          }
          // For external group reviews, reviewee is also a group
          revieweeType = 'group';
        }

        // Create the review
        const reviewResponse = await createReview(assignmentId, reviewerId, selectedTarget.id, reviewerType, revieweeType);
        if (!reviewResponse.ok) {
          const errorData = await reviewResponse.json();
          alert(errorData.msg || 'Failed to create review');
          setIsSubmitting(false);
          return;
        }
        const reviewData = await reviewResponse.json();
        const reviewId = reviewData.id;

        // Refresh rubric to ensure we have latest criteria (in case teacher added new ones)
        let currentCriteria = criteria;
        let finalGrades = grades.map(g => g === null ? 0 : g);  // Convert nulls to 0s
        let finalComments = [...comments];
        try {
          const freshRubric = await getRubric(assignmentId, true);
          const freshCriteria = await getCriteria(freshRubric.id);
          currentCriteria = freshCriteria;

          // Pad grades and comments arrays if rubric has grown
          while (finalGrades.length < currentCriteria.length) {
            finalGrades.push(0);
          }
          while (finalComments.length < currentCriteria.length) {
            finalComments.push('');
          }
          setGrades(finalGrades);
          setComments(finalComments);
        } catch (error) {
          console.warn('Could not refresh rubric before submission, using cached criteria:', error);
        }

        // Filter criteria based on review type
        const filteredCriteria = filterCriteriaByType(currentCriteria, selectedTarget.type);

        // Create criterion entries for each visible criterion
        for (let i = 0; i < currentCriteria.length; i++) {
          const criterion = currentCriteria[i];
          // Only submit for criteria that should be visible in this review type
          if (filterCriteriaByType([criterion], selectedTarget.type).length > 0) {
            if (criterion.id) {
              await createCriterion(reviewId, criterion.id!, finalGrades[i] !== null ? finalGrades[i] : 0, finalComments[i] || "");
            }
          }
        }

        // Reset and close
        setSelectedTarget(null);
        setGrades(new Array(criteria.length).fill(0));
        setComments(new Array(criteria.length).fill(''));
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
          <ShadcnButton variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <span className="text-xl">&times;</span>
          </ShadcnButton>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Selection dropdowns */}
          <div className="w-1/3 border-r p-5 overflow-y-auto">
            <h3 className="mt-0 mb-5 text-gray-800 text-lg">Select Review Target</h3>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !reviewerEligible ? (
              <div className="p-4 rounded-md border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  You must submit this assignment before you can review others.
                </div>
              </div>
            ) : (
              <>
                {internalReviewEnabled && submissionType === 'group' && (
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-800 text-base mb-3">Internal Review</label>
                    {groupMembers.length === 0 ? (
                      <p className="text-gray-400">No teammates available</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {groupMembers.filter(m => m.has_submitted).map((member) => (
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
                            {member.is_late && <span className="ml-2 text-xs text-orange-500">(Late)</span>}
                          </div>
                        ))}
                        {groupMembers.filter(m => !m.has_submitted).length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {groupMembers.filter(m => !m.has_submitted).length} teammate(s) have not submitted and cannot be reviewed.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {externalReviewEnabled && (
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-800 text-base mb-3">External Review</label>
                    {externalTargets.filter(t => t.has_submitted).length === 0 ? (
                      <p className="text-gray-400">
                        {submissionType === 'group' ? 'No other groups have submitted' : 'No other students have submitted'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {externalTargets.filter(t => t.has_submitted).map((target) => (
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
                            {target.is_late && <span className="ml-2 text-xs text-orange-500">(Late)</span>}
                          </div>
                        ))}
                        {externalTargets.filter(t => !t.has_submitted).length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {externalTargets.filter(t => !t.has_submitted).length} {submissionType === 'group' ? 'group(s)' : 'student(s)'} have not submitted and cannot be reviewed.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right side - Rubric scoring */}
          <div className="flex-1 p-5 overflow-y-auto flex justify-center">
            {selectedTarget ? (
              <div className="w-full max-w-md flex flex-col gap-8">
                <h3 className="m-0 text-2xl text-gray-800">Review for: {selectedTarget.name}</h3>
                <p className="text-gray-500 m-0 text-base">
                  {selectedTarget.type === 'internal' ? 'Internal Review' : 'External Review'}
                </p>

                {/* Submissions Section */}
                {targetSubmissions.length > 0 && (
                  <div className="w-full border rounded-md bg-blue-50 border-blue-200 overflow-visible">
                    <button
                      onClick={() => setSubmissionsExpanded(!submissionsExpanded)}
                      className="w-full flex items-center justify-between p-3 hover:bg-blue-100 transition-colors text-left min-h-[50px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-sm font-semibold text-blue-700"><Paperclip className="h-4 w-4" /> Submissions</span>
                        <span className="inline-block px-2 py-0.5 bg-blue-200 text-blue-700 rounded text-xs font-medium">
                          {targetSubmissions.length}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${submissionsExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {submissionsExpanded && (
                      <div className="border-t border-blue-200 p-3 flex flex-col gap-2 bg-white">
                        {targetSubmissions.map((submission) => {
                          const hasFile = !!submission.filename;
                          const hasText = !!submission.submission_text;

                          return (
                            <button
                              key={submission.id}
                              onClick={() => {
                                setSelectedSubmissionForView(submission);
                                setIsViewSubmissionModalOpen(true);
                              }}
                              className="flex items-center justify-between p-2 rounded border border-blue-100 hover:bg-blue-50 transition-colors text-sm cursor-pointer text-left"
                            >
                              <span className="text-blue-600 font-medium truncate flex-1">
                                {hasFile
                                  ? <><Paperclip className="mr-1 inline h-4 w-4" />{submission.filename}{hasText && <span className="ml-1 text-xs text-blue-400">+ text</span>}</>
                                  : <><FileText className="mr-1 inline h-4 w-4" />Text Submission</>}
                              </span>
                              <Eye className="ml-2 h-4 w-4 text-blue-500" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {criteria.length > 0 ? (
                  <>
                    {(() => {
                      const filteredCriteria = filterCriteriaByType(criteria, selectedTarget.type);
                      const filteredGrades = grades.slice(0, criteria.length);
                      const commentableCriteria = filteredCriteria.filter(c => c.canComment);

                      return (
                        <>
                          {/* Rubric Scoring Section */}
                          <div className="w-full border rounded-md p-4 bg-gray-50 flex flex-col gap-5">
                            {filteredCriteria.map((criterion, displayIndex) => {
                              // Find the actual index in the full criteria array
                              const actualIndex = criteria.findIndex(c => c.id === criterion.id);
                              const maxScore = (!criterion.hasScore || criterion.scoreMax === 0) ? 100 : criterion.scoreMax;

                              return (
                                <div key={actualIndex} className="flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <label className="font-medium text-gray-800 m-0 text-sm">{criterion.question}</label>
                                    <span className="font-semibold text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded">
                                      {filteredGrades[actualIndex] !== null ? filteredGrades[actualIndex] : 0} / {maxScore}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={maxScore}
                                    value={filteredGrades[actualIndex] !== null ? filteredGrades[actualIndex] : 0}
                                    onChange={(e) => {
                                      const newGrades = [...filteredGrades];
                                      newGrades[actualIndex] = Number(e.target.value);
                                      setGrades(newGrades);
                                    }}
                                    className="w-full h-1.5 appearance-none bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Feedback Section */}
                          {commentableCriteria.length > 0 && (
                            <div className="w-full flex flex-col gap-4">
                              <h4 className="m-0 font-semibold text-gray-800 text-base pb-2 border-b border-gray-300">Feedback</h4>
                              <div className="w-full flex flex-col gap-4">
                                {commentableCriteria.map((criterion) => {
                                  const actualIndex = criteria.findIndex(c => c.id === criterion.id);
                                  return (
                                    <div key={actualIndex} className="flex flex-col gap-2">
                                      <label className="font-medium text-gray-700 text-sm">
                                        {criterion.question}
                                      </label>
                                      <textarea
                                        value={comments[actualIndex] || ''}
                                        onChange={(e) => {
                                          const newComments = [...comments];
                                          newComments[actualIndex] = e.target.value;
                                          setComments(newComments);
                                        }}
                                        placeholder="Enter your feedback..."
                                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:border-blue-500"
                                        rows={3}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Review'}
                          </Button>
                        </>
                      );
                    })()}
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
      {selectedSubmissionForView && (
        <div onClick={(e) => e.stopPropagation()}>
          <ViewSubmissionModal
            isOpen={isViewSubmissionModalOpen}
            onClose={() => {
              setIsViewSubmissionModalOpen(false);
              setSelectedSubmissionForView(null);
            }}
            submission={selectedSubmissionForView}
            entityName={selectedTarget?.name || "Target"}
          />
        </div>
      )}
    </div>
  );
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
  peer_review_start_date?: string;
  peer_review_due_date?: string;
}

export default function PeerReviews() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedReviews, setSubmittedReviews] = useState<SubmittedReviewData[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReviewData[]>([]);
  const [selectedReviewComments, setSelectedReviewComments] = useState<{ reviewId: number; comments: string[] } | null>(null);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [rubricId, setRubricId] = useState<number | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  // Helper function to get color classes based on grade percentage
  const getGradeColorClasses = (grade: number | null | undefined) => {
    if (grade === null || grade === undefined) {
      return 'bg-gray-100 text-gray-400';
    }

    if (grade >= 80) {
      return 'bg-green-100 text-green-600';
    } else if (grade >= 60) {
      return 'bg-blue-100 text-blue-600';
    } else if (grade >= 40) {
      return 'bg-yellow-100 text-yellow-700';
    } else {
      return 'bg-red-100 text-red-600';
    }
  };

  // Helper function to format date/time with user's timezone
  const formatDateWithTime = (dateString: string): string => {
    const date = parseUTC(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to check if peer review is available
  const isPeerReviewAvailable = (): { available: boolean; message?: string } => {
    if (!assignment) return { available: true };

    const now = new Date();
    const startDate = assignment.peer_review_start_date ? parseUTC(assignment.peer_review_start_date) : null;
    const dueDate = assignment.peer_review_due_date ? parseUTC(assignment.peer_review_due_date) : null;

    // If no start date, check if past due date
    if (!startDate && dueDate && now > dueDate) {
      return { available: false, message: `Peer review deadline has passed (was due ${formatDateWithTime(dueDate.toISOString())})` };
    }

    // If start date hasn't arrived yet
    if (startDate && now < startDate) {
      return { available: false, message: `Peer reviews are not yet available. They will start on ${formatDateWithTime(startDate.toISOString())}` };
    }

    // If past due date
    if (dueDate && now > dueDate) {
      return { available: false, message: `Peer review deadline has passed (was due ${formatDateWithTime(dueDate.toISOString())})` };
    }

    return { available: true };
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const assignmentData = await getAssignmentDetails(Number(id));
        setAssignment(assignmentData);

        // Fetch course data to check archived status
        const classes = await listClasses();
        const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID);
        if (course) {
          setIsArchived(course.is_archived || false);
        }

        // Fetch rubric ID for the "View Rubrics" button
        try {
          const rubricData = await getRubric(Number(id), true);
          if (rubricData && rubricData.id) {
            setRubricId(rubricData.id);
          }
        } catch (error) {
          console.warn('No rubric found for assignment:', error);
        }

        // Fetch submitted and received reviews using batch endpoints (2 API calls instead of N)
        const [submitted, received] = await Promise.all([
          getSubmittedReviews(Number(id)),
          getReceivedReviews(Number(id))
        ]);

        setSubmittedReviews(submitted);
        setReceivedReviews(received);
      } catch (error) {
        console.error('Error fetching assignment details:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleViewMyComments = async (review: SubmittedReviewData) => {
    try {
      // Get the full review data with comments
      const userIdResponse = await getUserId();
      const currentUserId = userIdResponse.id;

      let reviewerType: 'user' | 'group' = 'user';
      let reviewerId = currentUserId;

      // For external reviews on group assignments, reviewer is a group
      if (review.type === 'external' && assignment?.submission_type === 'group') {
        reviewerType = 'group';
        const groupData = await getMyGroup(assignment.courseID);
        reviewerId = groupData.groupId;
      }

      const revieweeType = assignment?.submission_type === 'group' && review.type === 'external' ? 'group' : 'user';

      // Fetch review with comments
      const params = new URLSearchParams({
        assignmentID: String(id),
        reviewerID: String(reviewerId),
        revieweeID: String(review.revieweeId),
        revieweeType: revieweeType,
        reviewerType: reviewerType,
        reviewType: review.type
      });

      const reviewResponse = await fetch(`http://localhost:5000/review?${params}`, {
        credentials: 'include'
      });
      const reviewData = await reviewResponse.json();

      setSelectedReviewComments({
        reviewId: reviewerId,
        comments: reviewData.comments || []
      });
    } catch (error) {
      console.error('Error loading my review comments:', error);
      alert('Failed to load comments');
    }
  };

  const handleViewComments = async (review: ReceivedReviewData) => {
    try {
      // Get the full review data with comments
      const userIdResponse = await getUserId();
      const currentUserId = userIdResponse.id;

      let revieweeType: 'user' | 'group' = 'user';
      let revieweeId = currentUserId;

      // For external reviews on group assignments, reviewee is a group
      if (review.type === 'external' && assignment?.submission_type === 'group') {
        revieweeType = 'group';
        const groupData = await getMyGroup(assignment.courseID);
        revieweeId = groupData.groupId;
      }

      const reviewerType = review.type === 'internal' ? 'user' : (assignment?.submission_type === 'group' ? 'group' : 'user');

      // Fetch review with comments
      const params = new URLSearchParams({
        assignmentID: String(id),
        reviewerID: String(review.reviewerId),
        revieweeID: String(revieweeId),
        revieweeType: revieweeType,
        reviewerType: reviewerType,
        reviewType: review.type
      });

      const reviewResponse = await fetch(`http://localhost:5000/review?${params}`, {
        credentials: 'include'
      });
      const reviewData = await reviewResponse.json();

      setSelectedReviewComments({
        reviewId: review.reviewerId,
        comments: reviewData.comments || []
      });
    } catch (error) {
      console.error('Error loading review comments:', error);
      alert('Failed to load comments');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-medium">Peer Reviews</h3>
        </div>
        <p className="py-8 text-center text-muted-foreground">Assignment not found</p>
      </div>
    );
  }

  const hasReviewsEnabled = assignment.internal_review || assignment.external_review;

  if (!hasReviewsEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-medium">Peer Reviews</h3>
        </div>
        <p className="py-8 text-center text-muted-foreground">Peer reviews are not enabled for this assignment</p>
      </div>
    );
  }

  const reviewAvailability = isPeerReviewAvailable();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h3 className="text-lg font-medium">Peer Reviews</h3>
      </div>

      <div className="space-y-6">
        {!reviewAvailability.available && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              {reviewAvailability.message?.includes('deadline') ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              ) : (
                <Clock className="h-5 w-5 shrink-0 text-yellow-600" />
              )}
              <p className={`m-0 text-sm font-medium ${
                reviewAvailability.message?.includes('deadline')
                  ? 'text-destructive'
                  : 'text-yellow-800'
              }`}>
                {reviewAvailability.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Rubric Section */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-medium">View Rubric</h3>
              <p className="text-sm text-muted-foreground">View the scoring rubric for this assignment, split into Internal and External review sections.</p>
            </div>
            <Button onClick={() => setIsRubricModalOpen(true)} disabled={!rubricId}>
              {rubricId ? 'View Rubrics' : 'No Rubric Available'}
            </Button>
          </CardContent>
        </Card>

        {/* Archived Class Message */}
        {isArchived && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-gray-600" />
              <p className="m-0 text-sm font-medium text-gray-700">This class is archived and is in view-only mode. You cannot submit new reviews.</p>
            </CardContent>
          </Card>
        )}

        {/* Submit a Review Section */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-medium">Submit a Review</h3>
              <div className="flex gap-2">
                {assignment.internal_review && (
                  <Badge variant="secondary">Internal Review Enabled</Badge>
                )}
                {assignment.external_review && (
                  <Badge variant="secondary">External Review Enabled</Badge>
                )}
              </div>
              {assignment.due_date && (
                <p className="text-sm text-muted-foreground">
                  Due: {parseUTC(assignment.due_date).toLocaleDateString()}
                </p>
              )}
              {assignment.peer_review_start_date && (
                <p className="text-sm text-muted-foreground">
                  Review starts: {formatDateWithTime(assignment.peer_review_start_date)}
                </p>
              )}
              {assignment.peer_review_due_date && (
                <p className="text-sm text-muted-foreground">
                  Review due: {formatDateWithTime(assignment.peer_review_due_date)}
                </p>
              )}
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={!reviewAvailability.available || isArchived}
            >
              Start Review
            </Button>
          </CardContent>
        </Card>

        {/* Submitted Reviews */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Your Submitted Reviews</h3>
          {submittedReviews.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No reviews submitted yet</p>
          ) : (
            <div className="space-y-3">
              {submittedReviews.map((review) => (
                <Card key={review.reviewId}>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{review.revieweeName}</span>
                      <Badge variant="secondary">{review.type === 'internal' ? 'Internal' : 'External'}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShadcnButton variant="outline" size="sm" onClick={() => handleViewMyComments(review)}>
                        <MessageSquare className="h-4 w-4" />
                        My Comments
                      </ShadcnButton>
                      <div className={`rounded-lg px-4 py-2 text-center text-xl font-semibold min-w-[60px] ${getGradeColorClasses(review.grade)}`}>
                        {review.grade !== undefined && review.grade !== null ? review.grade.toFixed(1) : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Received Reviews */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Reviews Received</h3>
          {receivedReviews.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No reviews received yet</p>
          ) : (
            <div className="space-y-3">
              {receivedReviews.map((review) => (
                <Card key={`${review.type}-${review.reviewerId}`}>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{review.reviewerName}</span>
                      <Badge variant="secondary">{review.type === 'internal' ? 'Internal' : 'External'}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShadcnButton variant="outline" size="sm" onClick={() => handleViewComments(review)}>
                        <MessageSquare className="h-4 w-4" />
                        Comments
                      </ShadcnButton>
                      <div className={`rounded-lg px-4 py-2 text-center text-xl font-semibold min-w-[60px] ${getGradeColorClasses(review.grade)}`}>
                        {review.grade !== undefined && review.grade !== null ? review.grade.toFixed(1) : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={!!selectedReviewComments} onOpenChange={(open) => { if (!open) setSelectedReviewComments(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Comments</DialogTitle>
          </DialogHeader>
          {selectedReviewComments?.comments && selectedReviewComments.comments.length > 0 ? (
            <div className="space-y-4">
              {selectedReviewComments.comments.map((comment, idx) => {
                if (!comment) return null;
                return (
                  <Card key={idx} size="sm">
                    <CardContent>
                      <p className="mb-1 text-sm font-semibold text-muted-foreground">
                        Criterion {idx + 1}
                      </p>
                      <p className="whitespace-pre-wrap">{comment}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No comments provided for this review</p>
          )}
        </DialogContent>
      </Dialog>

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
          onReviewSubmitted={async () => {
            try {
              const [submitted, received] = await Promise.all([
                getSubmittedReviews(assignment.id),
                getReceivedReviews(assignment.id)
              ]);
              setSubmittedReviews(submitted);
              setReceivedReviews(received);
            } catch (error) {
              console.error('Error refreshing reviews:', error);
            }
          }}
        />
      )}

      <RubricViewModal
        isOpen={isRubricModalOpen}
        onClose={() => setIsRubricModalOpen(false)}
        rubricId={rubricId}
        internalReviewEnabled={assignment?.internal_review || false}
        externalReviewEnabled={assignment?.external_review || false}
      />
    </div>
  );
}
