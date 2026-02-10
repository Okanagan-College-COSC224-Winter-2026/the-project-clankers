import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState } from "react";
import Button from "../components/Button";
import { importCSV } from "../util/csv";
import { listCourseMembers, listClasses } from "../util/api";
import RosterUploadResult from "../components/RosterUploadResult";

import './ClassMembers.css'
import { isTeacher } from "../util/login";

export default function ClassMembers() {
  const { id } = useParams()
  const [members, setMembers] = useState<User[]>([])
  const [className, setClassName] = useState<string | null>(null);
  const [rosterResult, setRosterResult] = useState<any>(null);

  const loadMembers = async () => {
    const members = await listCourseMembers(id as string)
    const classes = await listClasses();
    const currentClass = classes.find((c: { id: number }) => c.id === Number(id));
    setMembers(members)
    setClassName(currentClass?.name || null);
  }

  useEffect(() => {
    loadMembers()
  }, [])  

  const handleRosterUpload = () => {
    importCSV(
      id as string,
      (result) => {
        // Show the result modal with passwords
        setRosterResult(result);
        // Reload members list to show newly added students
        loadMembers();
      },
      (error) => {
        alert(`Error uploading roster: ${error}`);
      }
    );
  };

  return (
    <>
      <div className="ClassHeader">
        <div className="ClassHeaderLeft">
          <h2>{className}</h2>
        </div>

        <div className="ClassHeaderRight">
          {isTeacher() ? (
            <Button onClick={handleRosterUpload}>Add Students via CSV</Button>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={[
          {
            label: "Home",
            path: `/classes/${id}/home`,
          },
          {
            label: "Members",
            path: `/classes/${id}/members`,
          },
        ]}
      />

      {rosterResult && (
        <RosterUploadResult
          enrolledCount={rosterResult.enrolled_count}
          createdCount={rosterResult.created_count}
          newStudents={rosterResult.new_students}
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

            return (
              <div key={member.id} className="Member">
                <strong>{member.name}</strong>
                {getRoleBadge(member.role)}
                {member.student_id && <span> (ID: {member.student_id})</span>}
                <br />
                {member.email && (
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>{member.email}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  );
}
