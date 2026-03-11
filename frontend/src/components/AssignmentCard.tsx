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
}

export default function Button(props: Props) {
  const [status, setStatus] = useState<'In Progress' | 'Overdue' | 'Complete' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Only calculate status for teachers
    if (!isTeacher() || !props.classId) {
      setIsLoading(false);
      return;
    }
    
    const calculateStatus = async () => {
      try {
        // Fetch all students in the class
        const classMembersData = await listCourseMembers(String(props.classId));
        const students = (classMembersData || []).filter((member: { role: string }) => member.role === 'student');
        
        // Fetch all submissions for this assignment
        const submissionsData = await getStudentSubmissions(Number(props.id));
        
        // Count how many students have submitted
        const submittedStudentIds = new Set(submissionsData.map((sub: { student_id: number }) => sub.student_id));
        const allStudentsSubmitted = students.length > 0 && students.every((student: { id: number }) => submittedStudentIds.has(student.id));
        
        // Determine status
        if (allStudentsSubmitted) {
          setStatus('Complete');
        } else if (props.dueDate) {
          const isPastDue = new Date(props.dueDate) < new Date();
          setStatus(isPastDue ? 'Overdue' : 'In Progress');
        } else {
          setStatus('In Progress');
        }
      } catch (error) {
        console.error('Error calculating assignment status:', error);
        // Fallback to simple date-based logic
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
  
  // For students, use simple date-based logic
  const isOverdue = !isTeacher() && props.dueDate ? new Date(props.dueDate) < new Date() : false;
  
  // Determine badge class based on status
  const getBadgeClass = () => {
    if (!isTeacher()) return isOverdue ? 'overdue' : '';
    if (status === 'Complete') return 'complete';
    if (status === 'Overdue') return 'overdue';
    return 'in-progress';
  };
  
  // Determine badge text
  const getBadgeText = () => {
    if (!isTeacher()) {
      return isOverdue ? 'Overdue' : (props.dueDate ? `Due: ${new Date(props.dueDate).toLocaleDateString()}` : '');
    }
    if (isLoading) return 'Loading...';
    return status || 'In Progress';
  };
  
  return (
    <div
      onClick= {() => {
         window.location.href = `/assignments/${props.id}`
      }
    }
      className='A_Card'
    >
      <img src="/icons/document.svg" alt="document" />
      
      <span className="assignment-name">{props.children}</span>
      
      {(props.dueDate || status) && (
        <span className={`due-date-badge ${getBadgeClass()}`}>
          {getBadgeText()}
        </span>
      )}
    </div>
  )
}