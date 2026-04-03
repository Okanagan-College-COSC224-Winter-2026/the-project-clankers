import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard";
import './Browse.css';
import { browseAllClasses, listAssignments, requestEnrollment, listClasses } from "../util/api";
import { isStudent } from "../util/login";

export default function Browse() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null);
  const [enrollMsg, setEnrollMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    ;(async () => {
      try {
        // Fetch all courses
        const coursesResp = await browseAllClasses();

        // Fetch user's enrolled courses if they're a student
        let enrolledIds = new Set<number>();
        if (isStudent()) {
          const enrolledCourses = await listClasses();
          enrolledIds = new Set(enrolledCourses.map((c: Course) => c.id));
        }
        setEnrolledCourseIds(enrolledIds);

        // Fetch assignments for each course
        const coursesWithAssignments = await Promise.all(
          coursesResp.map(async (course: Course) => {
            try {
              const assignments = await listAssignments(String(course.id));
              return {
                ...course,
                assignments: assignments || [],
                assignmentCount: assignments?.length || 0
              };
            } catch (error) {
              console.error(`Error fetching assignments for course ${course.id}:`, error);
              return {
                ...course,
                assignments: [],
                assignmentCount: 0
              };
            }
          })
        );

        setCourses(coursesWithAssignments);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleEnroll = async (courseId: number) => {
    try {
      setEnrollingCourseId(courseId);
      await requestEnrollment(courseId);

      // Update the enrolled courses set
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));

      setEnrollMsg({ type: 'success', text: 'Enrollment request submitted! Waiting for teacher approval.' });
      setTimeout(() => setEnrollMsg(null), 5000);
    } catch (error) {
      console.error("Error requesting enrollment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to request enrollment in course.";
      setEnrollMsg({ type: 'error', text: errorMessage });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (loading) {
    return (
      <div className="Browse">
        <h1>Browse All Courses</h1>
        <p>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="Browse">
        <h1>Browse All Courses</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="Browse">
      <h1>Browse All Courses</h1>
      <p className="subtitle">Explore all available courses in the system</p>

      {enrollMsg && (
        <div
          className={`mb-4 rounded-md border px-4 py-2 text-sm ${
            enrollMsg.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {enrollMsg.text}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="empty-state">
          <h2>No courses available</h2>
          <p>There are no courses in the system yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => {
            const assignmentText = `${course.assignmentCount || 0} assignments`;
            const isEnrolled = enrolledCourseIds.has(course.id);
            const isEnrolling = enrollingCourseId === course.id;

            return (
              <ClassCard
                key={course.id}
                image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                name={course.name}
                subtitle={assignmentText}
                onclick={isEnrolled ? () => {
                  window.location.href = `/classes/${course.id}/home`
                } : undefined}
                action={
                  isStudent() ? (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={isEnrolled || isEnrolling}
                      className="border border-green-600 text-green-600 px-3 py-2 rounded hover:bg-green-50 disabled:opacity-50"
                    >
                      {isEnrolling ? "Requesting..." : isEnrolled ? "Enrolled" : "Request to Join"}
                    </button>
                  ) : null
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}