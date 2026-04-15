import { useState, useEffect } from 'react';
import Textbox from './Textbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import StatusMessage from './StatusMessage';
import './EditUserModal.css';

interface EditUserModalProps {
  user: User;
  currentUserId: number;
  onSave: (userId: number, updates: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export default function EditUserModal({
  user,
  currentUserId,
  onSave,
  onCancel,
}: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [studentId, setStudentId] = useState(user.student_id || '');
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditingSelf = user.id === currentUserId;

  useEffect(() => {
    // Update form if user prop changes
    setName(user.name);
    setStudentId(user.student_id || '');
    setEmail(user.email);
    setRole(user.role);
  }, [user]);

  const handleSave = async () => {
    setError('');

    // Validation
    if (!name || name.trim() === '') {
      setError('Name is required');
      return;
    }

    if (!email || email.trim() === '') {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!role) {
      setError('Role is required');
      return;
    }

    // Build updates object (only include changed fields)
    const updates: Partial<User> = {};
    if (name !== user.name) updates.name = name;
    if (studentId !== (user.student_id || '')) updates.student_id = studentId || null;
    if (email !== user.email) updates.email = email;
    if (role !== user.role) updates.role = role;

    // If nothing changed, just close
    if (Object.keys(updates).length === 0) {
      onCancel();
      return;
    }

    setLoading(true);
    try {
      await onSave(user.id, updates);
      // onCancel() will be called by parent component after successful save
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      setLoading(false);
    }
  };

  return (
    <div className="EditUserModal-Overlay" onClick={onCancel}>
      <div className="EditUserModal-Card" onClick={(e) => e.stopPropagation()}>
        <div className="EditUserModal-Header">
          <h2>Edit User</h2>
          <button className="EditUserModal-CloseButton" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="EditUserModal-Body">
          {error && <StatusMessage message={error} type="error" />}

          <div className="EditUserModal-Field">
            <label>Name</label>
            <Textbox
              value={name}
              placeholder="Full name..."
              onInput={setName}
            />
          </div>

          {role === 'student' && (
            <div className="EditUserModal-Field">
              <label>Student ID</label>
              <Textbox
                value={studentId}
                placeholder="Student ID..."
                onInput={setStudentId}
              />
            </div>
          )}

          <div className="EditUserModal-Field">
            <label>Email</label>
            <Textbox
              type="email"
              value={email}
              placeholder="user@example.com..."
              onInput={setEmail}
            />
          </div>

          <div className="EditUserModal-Field">
            <label>Role</label>
            {isEditingSelf ? (
              <div className="EditUserModal-ReadOnlyRole">
                {role.charAt(0).toUpperCase() + role.slice(1)}
                <span className="EditUserModal-RoleNote">
                  (You cannot change your own role)
                </span>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  {[{ value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }, { value: 'admin', label: 'Admin' }].map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setRole(opt.value as 'student' | 'teacher' | 'admin')}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="EditUserModal-Actions">
          <button
            className="EditUserModal-CancelButton"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="EditUserModal-SaveButton"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
