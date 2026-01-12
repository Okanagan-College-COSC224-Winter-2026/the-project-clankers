import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard";

import './Home.css'
import { listClasses, listAssignments } from "../util/api";
import { isTeacher, isAdmin } from "../util/login";

export default function Home() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ;(async () => {
      try {
        const coursesResp = await listClasses();
        
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="Home">
        <h1>Peer Review Dashboard</h1>
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="Home">
      <h1>Peer Review Dashboard</h1>

      <div className="Classes">
        {
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
        }

        {isTeacher() && <div className="ClassCreateButton" onClick={() => window.location.href = '/classes/create'}>
          <h2>Create Class</h2>
        </div>}
        
        {isAdmin() && <div className="ClassCreateButton" onClick={() => window.location.href = '/admin/create-teacher'}>
          <h2>Create Teacher</h2>
        </div>}
      </div>
    </div>
  )
}