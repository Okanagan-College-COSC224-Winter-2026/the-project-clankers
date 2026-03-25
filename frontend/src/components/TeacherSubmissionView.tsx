import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AssignmentFileUpload.css"; // Reuse the same styles
import { getStudentSubmissions, downloadStudentSubmission, getAssignmentDetails, listCourseMembers, getCourseGroups, getGroupMembers } from "../util/api";

interface StudentSubmission {
  id: number;
  filename: string;
  file_path: string;
  submitted_at: string;
  student_id: number;
  student_name: string;
  assignment_id: number;
}

interface Student {
  id: number;
  student_id?: string; // The school's student identifier
  name: string;
  email: string;
}

interface StudentWithSubmission {
  student: Student;
  submission: StudentSubmission | null;
  status: "Submitted" | "Submitted Late" | "No Submission";
  grade?: string; // Placeholder for future grade feature
}

interface CourseGroup {
  id: number;
  name: string;
  courseID: number;
  member_count?: number;
}

interface GroupWithSubmission {
  group: CourseGroup;
  submission: StudentSubmission | null;
  status: "Submitted" | "Submitted Late" | "No Submission";
  grade?: string;
  submittedBy?: string; // Name of student who submitted for the group
  members: Student[]; // All members of the group
}

interface TeacherSubmissionViewProps {
  assignmentId: number;
}

export default function TeacherSubmissionView({ 
  assignmentId
}: TeacherSubmissionViewProps) {
  const [studentsWithSubmissions, setStudentsWithSubmissions] = useState<StudentWithSubmission[]>([]);
  const [groupsWithSubmissions, setGroupsWithSubmissions] = useState<GroupWithSubmission[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const navigate = useNavigate();

  const loadSubmissionsAndStudents = useCallback(async () => {
    setIsLoadingSubmissions(true);
    setError(null);
    try {
      // Fetch assignment details to get class ID, due date, and submission type
      const assignmentData = await getAssignmentDetails(assignmentId);
      const classId = assignmentData.courseID || assignmentData.course?.id;
      const dueDate = assignmentData.due_date ? new Date(assignmentData.due_date) : null;
      const submissionType = assignmentData.submission_type || 'individual';

      if (!classId) {
        throw new Error("Could not determine class ID for this assignment");
      }

      // Fetch all submissions for this assignment
      const submissionsData = await getStudentSubmissions(assignmentId);

      if (submissionType === 'group') {
        // Handle group assignments
        setIsGroupAssignment(true);
        await loadGroupSubmissions(classId, submissionsData, dueDate);
      } else {
        // Handle individual assignments
        setIsGroupAssignment(false);
        await loadIndividualSubmissions(classId, submissionsData, dueDate);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [assignmentId]);

  // Load all student submissions and class roster
  useEffect(() => {
    loadSubmissionsAndStudents();
  }, [loadSubmissionsAndStudents]);

  const loadIndividualSubmissions = async (
    classId: number, 
    submissionsData: StudentSubmission[], 
    dueDate: Date | null
  ) => {
    // Fetch all students in the class
    const classMembersData = await listCourseMembers(String(classId));
    // Filter to only include students (not the teacher)
    const students: Student[] = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');

    // Create a map of student_id -> submission for quick lookup
    const submissionMap = new Map<number, StudentSubmission>();
    submissionsData.forEach((sub: StudentSubmission) => {
      submissionMap.set(sub.student_id, sub);
    });

    // Merge students with their submission status
    const merged: StudentWithSubmission[] = students.map((student) => {
      const submission = submissionMap.get(student.id) || null;
      
      let status: "Submitted" | "Submitted Late" | "No Submission" = "No Submission";
      
      if (submission) {
        if (dueDate) {
          const submittedAt = new Date(submission.submitted_at);
          status = submittedAt > dueDate ? "Submitted Late" : "Submitted";
        } else {
          status = "Submitted";
        }
      }
      
      return {
        student,
        submission,
        status
      };
    });

    setStudentsWithSubmissions(merged);
  };

  const loadGroupSubmissions = async (
    classId: number, 
    submissionsData: StudentSubmission[],
    dueDate: Date | null
  ) => {
    // Fetch all groups in the course
    const groupsData = await getCourseGroups(classId);
    
    // Create a map of student_id -> submission for quick lookup
    const submissionMap = new Map<number, StudentSubmission>();
    submissionsData.forEach((sub: StudentSubmission) => {
      submissionMap.set(sub.student_id, sub);
    });

    // For each group, fetch members and check for submissions
    const merged: GroupWithSubmission[] = await Promise.all(
      groupsData.map(async (group: CourseGroup) => {
        try {
          // Fetch group members with full student data
          const membersData = await getGroupMembers(classId, group.id);

          // Convert to Student type
          const members: Student[] = membersData.map((member: { id: number; student_id?: string; name: string; email: string }) => ({
            id: member.id,
            student_id: member.student_id,
            name: member.name,
            email: member.email
          }));
          
          // Find if any group member has submitted
          let groupSubmission: StudentSubmission | null = null;
          let submittedBy: string | undefined = undefined;
          
          for (const member of members) {
            const submission = submissionMap.get(member.id);
            if (submission) {
              groupSubmission = submission;
              submittedBy = member.name;
              break; // Use the first submission found
            }
          }
          
          // Sort members so submitter appears first
          if (groupSubmission) {
            const submitterId = groupSubmission.student_id;
            members.sort((a, b) => {
              if (a.id === submitterId) return -1;
              if (b.id === submitterId) return 1;
              return 0;
            });
          }
          
          // Calculate status
          let status: "Submitted" | "Submitted Late" | "No Submission" = "No Submission";
          
          if (groupSubmission && dueDate) {
            const submittedAt = new Date(groupSubmission.submitted_at);
            status = submittedAt > dueDate ? "Submitted Late" : "Submitted";
          } else if (groupSubmission) {
            status = "Submitted";
          }
          
          return {
            group,
            submission: groupSubmission,
            status,
            submittedBy,
            members
          };
        } catch (error) {
          console.error(`Error loading members for group ${group.id}:`, error);
          // Return group with no submission if there's an error
          return {
            group,
            submission: null,
            status: "No Submission" as const,
            submittedBy: undefined,
            members: []
          };
        }
      })
    );

    setGroupsWithSubmissions(merged);
  };

  const handleDownload = async (submissionId: number, filename: string) => {
    try {
      const blob = await downloadStudentSubmission(submissionId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleViewProfile = (studentId: number) => {
    navigate(`/profile/${studentId}`);
  };

  const toggleGroupExpanded = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Submitted":
        return { color: "#4caf50", fontWeight: 500 };
      case "Submitted Late":
        return { color: "#ff9800", fontWeight: 500 };
      case "No Submission":
        return { color: "#d32f2f", fontWeight: 500 };
      default:
        return {};
    }
  };

  return (
    <div className="assignment-file-upload-container">
      <h3>Student Submissions {isGroupAssignment && "(Group Assignment)"}</h3>
      
      {isLoadingSubmissions ? (
        <p className="loading-message">Loading submissions...</p>
      ) : error ? (
        <div className="upload-message error">
          ❌ {error}
        </div>
      ) : isGroupAssignment ? (
        // Render group submissions accordion
        groupsWithSubmissions.length > 0 ? (
          <div style={{ marginTop: '20px' }}>
            {groupsWithSubmissions.map((groupItem) => {
              const isExpanded = expandedGroups.has(groupItem.group.id);
              return (
                <div key={groupItem.group.id} style={{
                  marginBottom: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Group Summary Row */}
                  <div 
                    onClick={() => toggleGroupExpanded(groupItem.group.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? '#f8f9fa' : 'white',
                      borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    {/* Expand/Collapse Icon */}
                    <div style={{ 
                      marginRight: '12px', 
                      fontSize: '1.2em',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                    }}>
                      ▶
                    </div>

                    {/* Group Info */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: '200px' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.05em' }}>
                          {groupItem.group.name}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                          {groupItem.members.length} member{groupItem.members.length !== 1 ? 's' : ''}
                          {groupItem.submittedBy && (
                            <span> • Submitted by: {groupItem.submittedBy}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.75em', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Status
                          </div>
                          <div style={{...getStatusStyle(groupItem.status), fontSize: '0.9em'}}>
                            {groupItem.status}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75em', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Grade
                          </div>
                          <div style={{ fontSize: '0.9em' }}>
                            {groupItem.grade || '-'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75em', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Last Modified
                          </div>
                          <div style={{ fontSize: '0.9em' }}>
                            {groupItem.submission ? formatDate(groupItem.submission.submitted_at) : 'N/A'}
                          </div>
                        </div>

                        {groupItem.submission && (
                          <div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(groupItem.submission!.id, groupItem.submission!.filename);
                              }}
                              style={{
                                padding: '6px 16px',
                                backgroundColor: '#1976d2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9em',
                                fontWeight: 500,
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                            >
                              Download
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Member Details */}
                  {isExpanded && (
                    <div style={{ padding: '0' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse'
                      }}>
                        <thead>
                          <tr style={{
                            backgroundColor: '#f0f0f0'
                          }}>
                            <th style={{...tableHeaderStyle, fontSize: '0.85em'}}>Name</th>
                            <th style={{...tableHeaderStyle, fontSize: '0.85em'}}>Student ID</th>
                            <th style={{...tableHeaderStyle, fontSize: '0.85em'}}>Email</th>
                            <th style={{...tableHeaderStyle, fontSize: '0.85em'}}>Status</th>
                            <th style={{...tableHeaderStyle, fontSize: '0.85em'}}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItem.members.length > 0 ? (
                            groupItem.members.map((member) => {
                              const isSubmitter = groupItem.submission && groupItem.submission.student_id === member.id;
                              return (
                                <tr key={member.id} style={{
                                  borderBottom: '1px solid #f0f0f0',
                                  backgroundColor: isSubmitter ? '#f0f8ff' : 'white'
                                }}>
                                  <td style={{...tableCellStyle, fontSize: '0.85em'}}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <a
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleViewProfile(member.id);
                                        }}
                                        style={{
                                          color: '#1976d2',
                                          textDecoration: 'none',
                                          fontWeight: 500,
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        {member.name}
                                      </a>
                                      {isSubmitter && (
                                        <span style={{
                                          fontSize: '0.75em',
                                          backgroundColor: '#4caf50',
                                          color: 'white',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontWeight: 600
                                        }}>
                                          Submitter
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{...tableCellStyle, fontSize: '0.85em'}}>
                                    {member.student_id || 'N/A'}
                                  </td>
                                <td style={{...tableCellStyle, fontSize: '0.85em'}}>
                                  {member.email}
                                </td>
                                <td style={{...tableCellStyle, ...getStatusStyle(groupItem.status), fontSize: '0.85em'}}>
                                  {groupItem.status}
                                </td>
                                <td style={{...tableCellStyle, fontSize: '0.85em'}}>
                                  {groupItem.grade || '-'}
                                </td>
                              </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                No members in this group
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-files-message">No groups created for this class</p>
        )
      ) : (
        // Render individual submissions table
        studentsWithSubmissions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '20px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f5f5f5',
                  borderBottom: '2px solid #ddd'
                }}>
                  <th style={tableHeaderStyle}>Name</th>
                  <th style={tableHeaderStyle}>Student ID</th>
                  <th style={tableHeaderStyle}>Email</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Grade</th>
                  <th style={tableHeaderStyle}>Last Modified</th>
                  <th style={tableHeaderStyle}>File Submission</th>
                </tr>
              </thead>
              <tbody>
                {studentsWithSubmissions.map((item) => (
                  <tr key={item.student.id} style={{
                    borderBottom: '1px solid #eee',
                    transition: 'background-color 0.2s'
                  }}>
                    <td style={tableCellStyle}>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewProfile(item.student.id);
                        }}
                        style={{
                          color: '#1976d2',
                          textDecoration: 'none',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {item.student.name}
                      </a>
                    </td>
                    <td style={tableCellStyle}>
                      {item.student.student_id || 'N/A'}
                    </td>
                    <td style={tableCellStyle}>
                      {item.student.email}
                    </td>
                    <td style={{...tableCellStyle, ...getStatusStyle(item.status)}}>
                      {item.status}
                    </td>
                    <td style={tableCellStyle}>
                      {item.grade || '-'}
                    </td>
                    <td style={tableCellStyle}>
                      {item.submission ? formatDate(item.submission.submitted_at) : 'N/A'}
                    </td>
                    <td style={tableCellStyle}>
                      {item.submission ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.9em' }}>
                            {item.submission.filename}
                          </span>
                          <button 
                            onClick={() => handleDownload(item.submission!.id, item.submission!.filename)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#1976d2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85em',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                          >
                            Download
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-files-message">No students enrolled in this class</p>
        )
      )}
    </div>
  );
}

// Table styles
const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.9em',
  color: '#333',
  whiteSpace: 'nowrap'
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '0.9em',
  color: '#555',
  verticalAlign: 'middle'
};
