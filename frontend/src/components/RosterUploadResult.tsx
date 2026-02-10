import { useState } from 'react';
import Button from './Button';
import './RosterUploadResult.css';

interface NewStudent {
  email: string;
  student_id: string;
  temp_password: string;
}

interface Props {
  enrolledCount: number;
  createdCount: number;
  newStudents?: NewStudent[];
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
          <p>✅ {props.enrolledCount} student(s) enrolled in course</p>
          {props.createdCount > 0 && (
            <p>🆕 {props.createdCount} new student account(s) created</p>
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

        <div className="RosterUploadResult-Footer">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
