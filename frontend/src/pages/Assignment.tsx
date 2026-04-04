import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import TabNavigation from "../components/TabNavigation";
import AssignmentSettings from "../components/AssignmentSettings";
import AssignmentFileUpload from "../components/AssignmentFileUpload";
import AssignmentFileDisplay from "../components/AssignmentFileDisplay";
import StudentSubmissionUpload from "../components/StudentSubmissionUpload";
import TeacherSubmissionView from "../components/TeacherSubmissionView";
import ViewSubmissionModal from "../components/ViewSubmissionModal";
import PeerReviews from "./PeerReviews";
import { isTeacher } from "../util/login";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import {
  getAssignmentDetails,
  getStudentSubmissions,
  listStuGroup,
  getCurrentUserProfile,
  downloadStudentSubmission,
  getMyGroup
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
  const [assignmentDescription, setAssignmentDescription] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedTextSubmission, setSelectedTextSubmission] = useState<any>(null);
  const [isViewTextModalOpen, setIsViewTextModalOpen] = useState(false);

  // Determine which tab is active based on URL path
  const isManageTab = location.pathname.includes('/manage');
  const isSubmissionTab = location.pathname.includes('/submission');
  const isStudentSubmissionsTab = location.pathname.includes('/student-submissions');
  const isPeerReviewsTab = location.pathname.includes('/peer-reviews');

  // Fetch assignment details to get the name
  useEffect(() => {
    (async () => {
      try {
        // Get current user info
        const userProfile = await getCurrentUserProfile();
        setCurrentUserId(userProfile.id);

        const assignmentData = await getAssignmentDetails(Number(id));
        if (assignmentData && assignmentData.name) {
          setAssignmentName(assignmentData.name);
        }
        if (assignmentData && assignmentData.description) {
          setAssignmentDescription(assignmentData.description);
        }
        if (assignmentData && assignmentData.start_date) {
          setStartDate(assignmentData.start_date);
        }
        if (assignmentData && assignmentData.due_date) {
          setDueDate(assignmentData.due_date);
        }
        if (assignmentData && assignmentData.courseID) {
          setCourseId(assignmentData.courseID);
          // Fetch the course name
          const { listClasses } = await import("../util/api");
          const classes = await listClasses();
          const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID);
          if (course) setCourseName(course.name);
        }

        // Fetch student submissions and group info if not a teacher
        if (!isTeacher() && userProfile.id) {
          try {
            const submissionsData = await getStudentSubmissions(Number(id));
            setSubmissions(submissionsData);

            // Check if it's a group assignment
            if (assignmentData.submission_type === 'group') {
              setIsGroupAssignment(true);
              const groupData = await getMyGroup(assignmentData.courseID);
              setGroupInfo(groupData);
            }
          } catch (error) {
            console.error('Error fetching submission details:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching assignment details:', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    // Backend sends ISO 8601 format with timezone (e.g., 2026-04-04T00:25:42.609771+00:00)
    const localDate = new Date(dateString);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return localDate.toLocaleString('en-US', options);
  };

  const calculateTimeRemaining = (dueDate: string | null) => {
    if (!dueDate) return "N/A";
    // Backend sends ISO 8601 format with timezone
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();

    if (diff < 0) {
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `Overdue by ${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
      if (hours > 0) return `Overdue by ${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
      return `Overdue by ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  };

  const handleDownload = async (submissionId: number, filename: string) => {
    try {
      setDownloadError(null);
      const blob = await downloadStudentSubmission(submissionId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {courseId && (
        <div className="px-3 py-2">
          <Link
            to={`/classes/${courseId}/home`}
            className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors"
          >
            ← {courseName || "Back to class"}
          </Link>
        </div>
      )}
      <div className="flex flex-row items-center justify-between px-3 pb-3">
        <h2 className="text-xl font-semibold">{assignmentName || "Loading..."}</h2>
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
        <div className="flex-1 space-y-6 p-6">
          {/* Date Information Note - Student Only */}
          {!isTeacher() && (startDate || dueDate) && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="p-4">
                <div className="text-sm space-y-1">
                  {startDate && (
                    <div>
                      <span className="font-semibold">Start date:</span> {formatDate(startDate)}
                    </div>
                  )}
                  {dueDate && (
                    <div>
                      <span className="font-semibold">Due:</span> {formatDate(dueDate)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {assignmentDescription && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">Assignment Details</h3>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      p: ({node, ...props}) => <p className="my-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="my-2 ml-6" {...props} />,
                      ol: ({node, ...props}) => <ol className="my-2 ml-6" {...props} />,
                      li: ({node, ...props}) => <li className="my-1" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-semibold mt-4 mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                    }}
                  >
                    {assignmentDescription}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {downloadError && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <CardContent className="p-4">
                <p className="text-sm text-red-800 dark:text-red-200">❌ Download error: {downloadError}</p>
              </CardContent>
            </Card>
          )}

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

          {/* Submission Details Table - Student Only */}
          {!isTeacher() && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-4">Submission Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {isGroupAssignment && (
                        <tr className="border-b">
                          <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40">Group</td>
                          <td className="py-2 px-2">{groupInfo?.groupName || "Not assigned to a group"}</td>
                        </tr>
                      )}
                      <tr className="border-b">
                        <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40">Submission status</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            {submissions.length > 0 ? "Submitted for grading" : "Not submitted"}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40">Grading status</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {submissions.length > 0 && submissions[0].grade != null ? "Graded" : "Not graded"}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40">Time remaining</td>
                        <td className="py-2 px-2">{calculateTimeRemaining(dueDate)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40">Last modified</td>
                        <td className="py-2 px-2">{submissions.length > 0 ? formatDate(submissions[0].submitted_at) : "-"}</td>
                      </tr>
                      {submissions.length > 0 && (
                        <>
                          {submissions.some(s => s.submission_text) && (
                            <tr className="border-b">
                              <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40 align-top">Text submission</td>
                              <td className="py-2 px-2">
                                <div className="space-y-2">
                                  {submissions
                                    .filter(s => s.submission_text)
                                    .map((submission, idx) => (
                                      <div key={idx} className="flex flex-col gap-2">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 whitespace-pre-wrap break-words">
                                          {submission.submission_text.substring(0, 150)}
                                          {submission.submission_text.length > 150 && '...'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setSelectedTextSubmission(submission);
                                              setIsViewTextModalOpen(true);
                                            }}
                                            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-sm"
                                          >
                                            View full text
                                          </button>
                                          <span className="text-gray-500 text-xs">{formatDate(submission.submitted_at)}</span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          {submissions.some(s => s.filename) && (
                            <tr>
                              <td className="font-medium py-2 px-2 bg-gray-50 dark:bg-gray-900 w-40 align-top">File submission</td>
                              <td className="py-2 px-2">
                                <div className="space-y-2">
                                  {submissions
                                    .filter(s => s.filename)
                                    .map((submission, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleDownload(submission.id, submission.filename)}
                                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                          {submission.filename}
                                        </button>
                                        <span className="text-gray-500 text-xs">{formatDate(submission.submitted_at)}</span>
                                      </div>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {selectedTextSubmission && (
        <ViewSubmissionModal
          isOpen={isViewTextModalOpen}
          onClose={() => {
            setIsViewTextModalOpen(false);
            setSelectedTextSubmission(null);
          }}
          submission={selectedTextSubmission}
          entityName="My Submission"
        />
      )}
    </div>
  );
}
