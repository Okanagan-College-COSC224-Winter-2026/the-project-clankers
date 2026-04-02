import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import TabNavigation from "../components/TabNavigation";
import AssignmentSettings from "../components/AssignmentSettings";
import AssignmentFileUpload from "../components/AssignmentFileUpload";
import AssignmentFileDisplay from "../components/AssignmentFileDisplay";
import StudentSubmissionUpload from "../components/StudentSubmissionUpload";
import TeacherSubmissionView from "../components/TeacherSubmissionView";
import PeerReviews from "./PeerReviews";
import { isTeacher } from "../util/login";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import {
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
  const [assignmentDescription, setAssignmentDescription] = useState<string | null>(null);
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
        if (assignmentData && assignmentData.description) {
          setAssignmentDescription(assignmentData.description);
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
        </div>
      )}
    </div>
  );
}
