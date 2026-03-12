import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard";
import './Browse.css';
import { browseAllClasses, listAssignments } from "../util/api";

export default function Browse() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ;(async () => {
      try {
        const coursesResp = await browseAllClasses();
        
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
            
            return (
              <ClassCard
                key={course.id}
                image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                name={course.name}
                subtitle={assignmentText}
                onclick={() => {
                  window.location.href = `/classes/${course.id}/home`
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}