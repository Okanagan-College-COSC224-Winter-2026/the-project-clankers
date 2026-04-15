import { useState } from 'react';
import Textbox from './Textbox';
import PasswordInput from './PasswordInput';
import PasswordCriteria from './PasswordCriteria';
import StatusMessage from './StatusMessage';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  user: User;
  onSave: (userId: number, password: string) => Promise<void>;
  onCancel: () => void;
}

export default function ChangePasswordModal({
  user,
  onSave,
  onCancel,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (!pwd) return { valid: false, message: 'Password is required' };
    if (pwd.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(pwd)) return { valid: false, message: 'Password must contain an uppercase letter' };
    if (!/[a-z]/.test(pwd)) return { valid: false, message: 'Password must contain a lowercase letter' };
    if (!/\d/.test(pwd)) return { valid: false, message: 'Password must contain a number' };
    if (!/[!@#$%^&*]/.test(pwd)) return { valid: false, message: 'Password must contain a special character (!@#$%^&*)' };
    return { valid: true, message: '' };
  };

  const handleSave = async () => {
    setError('');

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await onSave(user.id, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(password);

  return (
    <div className="ChangePasswordModal-Overlay" onClick={onCancel}>
      <div className="ChangePasswordModal-Card" onClick={(e) => e.stopPropagation()}>
        <div className="ChangePasswordModal-Header">
          <h2>Change Password for {user.name}</h2>
          <button className="ChangePasswordModal-CloseButton" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="ChangePasswordModal-Body">
          {error && <StatusMessage message={error} type="error" />}

          <div className="ChangePasswordModal-Field">
            <label>New Password</label>
            <PasswordInput
              value={password}
              placeholder="Enter new password"
              onInput={setPassword}
            />
            {password && <PasswordCriteria password={password} />}
          </div>

          <div className="ChangePasswordModal-Field">
            <label>Confirm Password</label>
            <PasswordInput
              value={confirmPassword}
              placeholder="Re-enter password"
              onInput={setConfirmPassword}
            />
          </div>
        </div>

        <div className="ChangePasswordModal-Actions">
          <button
            className="ChangePasswordModal-CancelButton"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ChangePasswordModal-SaveButton"
            onClick={handleSave}
            disabled={loading || !passwordValidation.valid}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
