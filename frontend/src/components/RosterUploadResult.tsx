import { useState } from 'react';
import Button from './Button';
import './RosterUploadResult.css';

interface NewStudent {
  email: string;
  student_id: string;
  temp_password: string;
}

interface ExistingStudent {
  email: string;
  student_id: string;
  name: string;
}

interface Props {
  enrolledCount: number;
  createdCount: number;
  existingCount?: number;
  newStudents?: NewStudent[];
  enrolledExistingStudents?: ExistingStudent[];  // Existing accounts newly enrolled
  existingStudents?: ExistingStudent[];  // Already enrolled in this course
  onClose: () => void;
}

export default function RosterUploadResult(props: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    if (!props.newStudents || props.newStudents.length === 0) return;

    const text = props.newStudents
      .map(s => `${s.email} - Password: ${s.temp_password}`)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadCSV = () => {
    if (!props.newStudents || props.newStudents.length === 0) return;

    const csv = [
      'Student ID,Email,Temporary Password',
      ...props.newStudents.map(s => `${s.student_id},${s.email},${s.temp_password}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="RosterUploadResult-Overlay">
      <div className="RosterUploadResult">
        <div className="RosterUploadResult-Header">
          <h2>Roster Upload Complete</h2>
          <button className="RosterUploadResult-Close" onClick={props.onClose}>×</button>
        </div>

        <div className="RosterUploadResult-Summary">
          {/* Case 1: All students were already enrolled in this course */}
          {props.enrolledCount === 0 && props.createdCount === 0 && (props.existingCount ?? 0) > 0 && (
            <p className="RosterUploadResult-NoChanges">ℹ️ No changes made - all students were already enrolled in this course</p>
          )}
          
          {/* Case 2: Students were enrolled (existing accounts or new accounts) */}
          {props.enrolledCount > 0 && (
            <>
              <p>✅ {props.enrolledCount} student(s) enrolled in this course</p>
              
              {/* Show breakdown: new accounts created */}
              {props.createdCount > 0 && (
                <p>🆕 {props.createdCount} new student account(s) created</p>
              )}
              
              {/* Show breakdown: existing accounts enrolled */}
              {props.createdCount === 0 && (
                <p>ℹ️ All students had existing accounts - no new accounts created</p>
              )}
              {props.createdCount > 0 && props.createdCount < props.enrolledCount && (
                <p>ℹ️ {props.enrolledCount - props.createdCount} student(s) already had accounts</p>
              )}
            </>
          )}
          
          {/* Show count of students who were already enrolled */}
          {(props.existingCount ?? 0) > 0 && (
            <p>ℹ️ {props.existingCount} student(s) were already enrolled (skipped)</p>
          )}
        </div>

        {props.newStudents && props.newStudents.length > 0 && (
          <>
            <div className="RosterUploadResult-Warning">
              <strong>⚠️ Important:</strong> Save these temporary passwords now. They will not be shown again.
            </div>

            <div className="RosterUploadResult-Actions">
              <Button onClick={handleCopyAll}>
                {copied ? '✓ Copied!' : 'Copy All'}
              </Button>
              <Button onClick={handleDownloadCSV} type="secondary">
                Download CSV
              </Button>
            </div>

            <div className="RosterUploadResult-Table">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Email</th>
                    <th>Temporary Password</th>
                  </tr>
                </thead>
                <tbody>
                  {props.newStudents.map((student, idx) => (
                    <tr key={idx}>
                      <td>{student.student_id}</td>
                      <td>{student.email}</td>
                      <td className="RosterUploadResult-Password">{student.temp_password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {props.enrolledExistingStudents && props.enrolledExistingStudents.length > 0 && (
          <div className="RosterUploadResult-ExistingStudents">
            <h3>Existing Students Enrolled</h3>
            <p className="RosterUploadResult-Info">ℹ️ These students already had accounts in the system and have been enrolled in this course.</p>
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {props.enrolledExistingStudents.map((student, index) => (
                  <tr key={index}>
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {props.existingStudents && props.existingStudents.length > 0 && (
          <div className="RosterUploadResult-ExistingStudents">
            <h3>Students Already Enrolled</h3>
            <p className="RosterUploadResult-Info">ℹ️ These students already had accounts and were already enrolled in this course.</p>
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {props.existingStudents.map((student, index) => (
                  <tr key={index}>
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="RosterUploadResult-Footer">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
