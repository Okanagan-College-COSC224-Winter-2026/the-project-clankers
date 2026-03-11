import { useState, useEffect } from 'react';
import './AssignmentCard.css';
import { getStudentSubmissions, listCourseMembers } from '../util/api';
import { isTeacher } from '../util/login';

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  id: number | string
  dueDate?: string | null
  classId?: number | string
  startDate?: string | null
}

export default function Button(props: Props) {
  const [status, setStatus] = useState<'In Progress' | 'Overdue' | 'Complete' | 'Submitted' | 'Submitted Late' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const calculateStatus = async () => {
      try {
        // Fetch submissions for this assignment
        const submissionsData = await getStudentSubmissions(Number(props.id));
        
        if (isTeacher() && props.classId) {
          // Teacher view: check if all students submitted
          const classMembersData = await listCourseMembers(String(props.classId));
          const students = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');
          
          const submittedStudentIds = new Set(submissionsData.map((sub: { student_id: number }) => sub.student_id));
          const allStudentsSubmitted = students.length > 0 && students.every((student: { id: number }) => submittedStudentIds.has(student.id));
          
          if (allStudentsSubmitted) {
            setStatus('Complete');
          } else if (props.dueDate) {
            const isPastDue = new Date(props.dueDate) < new Date();
            setStatus(isPastDue ? 'Overdue' : 'In Progress');
          } else {
            setStatus('In Progress');
          }
        } else {
          // Student view: check if current user has submitted
          if (submissionsData.length > 0) {
            // Student has submitted - check if it was on time
            const submission = submissionsData[0]; // For students, getStudentSubmissions returns only their own
            if (props.dueDate) {
              const submittedAt = new Date(submission.submitted_at);
              const dueDate = new Date(props.dueDate);
              setStatus(submittedAt <= dueDate ? 'Submitted' : 'Submitted Late');
            } else {
              setStatus('Submitted');
            }
          } else {
            // Student has not submitted
            if (props.dueDate) {
              const isPastDue = new Date(props.dueDate) < new Date();
              setStatus(isPastDue ? 'Overdue' : null);
            } else {
              setStatus(null);
            }
          }
        }
      } catch (error) {
        console.error('Error calculating assignment status:', error);
        // Fallback logic
        if (props.dueDate) {
          const isPastDue = new Date(props.dueDate) < new Date();
          setStatus(isPastDue ? 'Overdue' : 'In Progress');
        } else {
          setStatus('In Progress');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    calculateStatus();
  }, [props.id, props.classId, props.dueDate]);

  const now = new Date();
  // For students, use simple date-based logic
  const isOverdue = !isTeacher() && props.dueDate ? new Date(props.dueDate) < now : false;
  const isHiddenFromStudents = isTeacher() && props.startDate ? new Date(props.startDate) > now : false;

  // Determine badge class based on status
  const getBadgeClass = () => {
    if (status === 'Complete' || status === 'Submitted') return 'complete';
    if (status === 'Submitted Late') return 'submitted-late';
    if (status === 'Overdue') return 'overdue';
    if (status === 'In Progress') return 'in-progress';
    return '';
  };
  
  // Determine badge text
  const getBadgeText = () => {
    if (isLoading) return 'Loading...';
    if (status) return status;
    // Show due date if no status (not submitted, not overdue yet)
    return props.dueDate ? `Due: ${new Date(props.dueDate).toLocaleDateString()}` : '';
  };
  
  return (
    <div
      onClick={() => {
         window.location.href = `/assignments/${props.id}`
      }}
      className='A_Card'
    >
      <img src="/icons/document.svg" alt="document" />
      
      <span className="assignment-name">{props.children}</span>
      
      {isHiddenFromStudents && (
        <span className="hidden-badge" title={`Visible to students from ${new Date(props.startDate!).toLocaleDateString()}`}>
          Hidden until {new Date(props.startDate!).toLocaleDateString()}
        </span>
      )}

      {(props.dueDate || status) && (
        <span className={`due-date-badge ${getBadgeClass()}`}>
          {getBadgeText()}
        </span>
      )}
    </div>
  )
}