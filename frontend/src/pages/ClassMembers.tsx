import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback } from "react";
import Button from "../components/Button";
import { importCSV } from "../util/csv";
import { listCourseMembers, listClasses, getProfilePictureUrl } from "../util/api";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";

import './ClassMembers.css'
import { isTeacher } from "../util/login";

interface RosterUploadResultData {
  message: string;
  enrolled_count: number;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{
    email: string;
    student_id: string;
    temp_password: string;
  }>;
  enrolled_existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
  existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
}

export default function ClassMembers() {
  const { id } = useParams()
  const [members, setMembers] = useState<User[]>([])
  const [className, setClassName] = useState<string | null>(null);
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<Map<number, string>>(new Map());

  const loadMembers = useCallback(async () => {
    const members = await listCourseMembers(id as string)
    const classes = await listClasses();
    const currentClass = classes.find((c: { id: number }) => c.id === Number(id));
    setMembers(members)
    setClassName(currentClass?.name || null);

    // Load groups and create user -> group mapping
    try {
      const groupsResp = await fetch(`http://localhost:5000/classes/${id}/groups`, {
        credentials: "include",
      });
      if (groupsResp.ok) {
        const groups = await groupsResp.json();
        const mapping = new Map<number, string>();
        
        for (const group of groups) {
          const membersResp = await fetch(
            `http://localhost:5000/classes/${id}/groups/${group.id}/members`,
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
  }, [id]);

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleRosterUpload = () => {
    if (isUploadingRoster) return;
    
    setIsUploadingRoster(true);
    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false);
        // Show the result modal with passwords
        setRosterResult(result);
        // Reload members list to show newly added students
        loadMembers();
      },
      (error) => {
        setIsUploadingRoster(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setUploadError(errorMessage);
      },
      () => {
        setIsUploadingRoster(false);
      }
    );
  };

  return (
    <>
      <div className="ClassHeader">
        <h2>{className}</h2>

        <div className="ClassHeaderRight">
          {isTeacher() ? (
            <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
              {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
            </Button>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/classes/${id}/groups`,
                },
              ]
            : [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
              ]
        }
      />

      {rosterResult && (
        <RosterUploadResult
          enrolledCount={rosterResult.enrolled_count}
          createdCount={rosterResult.created_count}
          existingCount={rosterResult.existing_count}
          newStudents={rosterResult.new_students}
          enrolledExistingStudents={rosterResult.enrolled_existing_students}
          existingStudents={rosterResult.existing_students}
          onClose={() => setRosterResult(null)}
        />
      )}

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
<<<<<<< HEAD
                <div className="MemberContent">
                  <img 
                    src={getProfilePictureUrl(member.profile_picture_url)} 
                    alt={`${member.name}'s profile`}
                    className="MemberProfilePicture"
                  />
                  <div className="MemberInfo">
                    <div className="MemberNameRow">
                      <strong>{member.name}</strong>
                      {getRoleBadge(member.role)}
                      <span> (ID: {member.student_id || 'NULL'})</span>
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
                    </div>
                    {member.email && (
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>{member.email}</span>
                    )}
                  </div>
                </div>
                )}
                <br />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {member.email}
                  {member.student_id && <span> | Student ID: {member.student_id}</span>}
                </span>
>>>>>>> 1d997af57a0f59d60a773feacf138787d663d777
              </div>
            )
          })
        )}
      </div>

      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
    </>
  );
}
