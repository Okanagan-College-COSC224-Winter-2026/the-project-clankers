import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard";
import './Browse.css';
import { browseAllClasses, listAssignments, enrollInCourse, listClasses } from "../util/api";
import { isStudent } from "../util/login";

export default function Browse() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null);

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
      await enrollInCourse(courseId);

      // Update the enrolled courses set
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));

      // Show success message
      alert("Successfully enrolled in course!");
    } catch (error) {
      console.error("Error enrolling in course:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to enroll in course.";
      alert(errorMessage);
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

      <div className="Classes">
        {courses.length === 0 ? (
          <div className="empty-state">
            <h2>No courses available</h2>
            <p>There are no courses in the system yet.</p>
          </div>
        ) : (
          courses.map((course) => {
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
                    >
                      {isEnrolling ? "Enrolling..." : isEnrolled ? "Enrolled" : "Join Course"}
                    </button>
                  ) : null
                }
              />
            )
          })
        )}
      </div>
    </div>
  )
}