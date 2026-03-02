import { useEffect, useState } from "react";
import ClassCard from "../components/ClassCard";

import './Home.css'
import { listClasses, listAssignments, deleteClass } from "../util/api"; 
import { isTeacher, isAdmin, getUserRole } from "../util/login";

// Interfaces to keep TypeScript happy
interface Course {
  id: number;
  name: string;
}

interface CourseWithAssignments extends Course {
  assignments: any[];
  assignmentCount: number;
}

export default function Home() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ;(async () => {
      try {
        const coursesResp = await listClasses();
        
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

  // US14: Handler for Deleting Classes
  const handleDeleteClass = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await deleteClass(id);
      // Remove from UI state immediately
      setCourses(prev => prev.filter(course => course.id !== id));
      alert("Class deleted successfully.");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete class. Check if you are authorized.");
    }
  };

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
        {courses.map((course) => {
          const assignmentText = `${course.assignmentCount || 0} assignments`;
          
          return (
            <div key={course.id} className="ClassCardWrapper" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px', 
                marginBottom: '20px',
                border: '1px solid #ddd',
                padding: '10px',
                borderRadius: '8px'
            }}>
              
              {/* US14: Delete Button placed ABOVE the card for maximum visibility */}
              {(isTeacher() || getUserRole() === "teacher") && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(course.id, course.name);
                  }}
                  style={{
                    backgroundColor: '#ff4d4f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: '100%',
                    zIndex: 999
                  }}
                >
                  REMOVE CLASS (TEACHER ONLY)
                </button>
              )}

              <ClassCard
                image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                name={course.name}
                subtitle={assignmentText}
                onclick={() => {
                  window.location.href = `/classes/${course.id}/home`
                }}
              />
            </div>
          )
        })}

        {/* Action Buttons for Teachers/Admins */}
        {(isTeacher() || getUserRole() === "teacher") && (
          <div className="ClassCreateButton" onClick={() => window.location.href = '/classes/create'}>
            <h2>+ Create Class</h2>
          </div>
        )}
        
        {(isAdmin() || getUserRole() === "admin") && (
          <div className="ClassCreateButton" onClick={() => window.location.href = '/admin/create-teacher'}>
            <h2>+ Create Teacher Account</h2>
          </div>
        )}
      </div>
    </div>
  )
}