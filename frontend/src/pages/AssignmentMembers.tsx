import { useParams, Link } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback } from "react";
import { listCourseMembers, getAssignmentDetails, listClasses } from "../util/api";
import { isTeacher } from "../util/login";
import './ClassMembers.css';
import './Assignment.css';

export default function AssignmentMembers() {
  const { id } = useParams();
  const [members, setMembers] = useState<User[]>([]);
  const [assignmentName, setAssignmentName] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<Map<number, string>>(new Map());
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  const loadMembers = useCallback(async () => {
    try {
      // Get assignment details to find the courseID
      const assignmentData = await getAssignmentDetails(Number(id));
      if (assignmentData) {
        setAssignmentName(assignmentData.name || null);
        
        // Load members from the course
        if (assignmentData.courseID) {
          setCourseId(assignmentData.courseID);
          // Fetch course name
          try {
            const classes = await listClasses();
            const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID);
            if (course) setCourseName(course.name);
          } catch (e) { console.error(e); }
          const courseMembers = await listCourseMembers(String(assignmentData.courseID));
          setMembers(courseMembers);

          // Load groups and create user -> group mapping
          try {
            const groupsResp = await fetch(`http://localhost:5000/classes/${assignmentData.courseID}/groups`, {
              credentials: "include",
            });
            if (groupsResp.ok) {
              const groups = await groupsResp.json();
              const mapping = new Map<number, string>();
              
              for (const group of groups) {
                const membersResp = await fetch(
                  `http://localhost:5000/classes/${assignmentData.courseID}/groups/${group.id}/members`,
                  { credentials: "include" }
                );
                if (membersResp.ok) {
                  const groupMembers = await membersResp.json();
                  groupMembers.forEach((member: User) => {
                    mapping.set(member.id, group.name);
                  });
                }
              }
              setUserGroups(mapping);
            }
          } catch (error) {
            console.error("Error loading groups:", error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, [id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return (
    <>
      {courseId && (
        <div className="assignment-breadcrumb">
          <Link to={`/classes/${courseId}/home`}>← {courseName || "Back to class"}</Link>
        </div>
      )}
      <div className="AssignmentHeader">
        <h2>{assignmentName || "Loading..."}</h2>
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
                  label: "Groups",
                  path: `/assignments/${id}/groups`,
                },
                {
                  label: "Rubric",
                  path: `/assignments/${id}/rubric`,
                }
              ]
        }
      />

      <div className="ClassMemberList">
        {members.length === 0 ? (
          <p style={{ padding: '20px', color: '#6b7280' }}>No members found.</p>
        ) : (
          members.map(member => {
            const getRoleBadge = (role: string) => {
              const styles = {
                teacher: { backgroundColor: '#3b82f6', color: 'white' },
                student: { backgroundColor: '#10b981', color: 'white' },
                admin: { backgroundColor: '#ef4444', color: 'white' }
              };
              return (
                <span style={{
                  ...styles[role as keyof typeof styles],
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginLeft: '8px',
                  textTransform: 'uppercase'
                }}>
                  {role}
                </span>
              );
            };

            const groupName = userGroups.get(member.id);
            return (
              <div key={member.id} className="Member">
                <strong>{member.name}</strong>
                {getRoleBadge(member.role)}
                {groupName && (
                  <span style={{ 
                    marginLeft: '8px',
                    padding: '2px 8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#374151'
                  }}>
                    Group: {groupName}
                  </span>
                )}
                <br />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {member.email}
                  {member.student_id && <span> | Student ID: {member.student_id}</span>}
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
