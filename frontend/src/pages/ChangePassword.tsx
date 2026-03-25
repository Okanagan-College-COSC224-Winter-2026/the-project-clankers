<<<<<<< Updated upstream
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import PasswordInput from '../components/PasswordInput'
import PasswordCriteria from '../components/PasswordCriteria'
import StatusMessage from '../components/StatusMessage'
import { changePassword } from '../util/api'

export default function ChangePassword() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
=======
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Textbox from '../components/Textbox';
import StatusMessage from '../components/StatusMessage';
import { changePassword } from '../util/api';
import './LoginPage.css';

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if this is a forced password change (from login flow)
  const isForcedChange = location.state?.forced === true;
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
>>>>>>> Stashed changes

  const handleChangePassword = async () => {
    try {
      setError('')
      setSuccess(false)

      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('All fields are required')
        return
      }

      if (newPassword !== confirmPassword) {
        setError('New passwords do not match')
        return
      }

      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters')
        return
      }

<<<<<<< Updated upstream
      await changePassword(currentPassword, newPassword)
      setSuccess(true)

      setTimeout(() => {
        navigate('/home')
      }, 2000)
=======
      if (currentPassword === newPassword) {
        setError('New password must be different from current password');
        return;
      }

      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(isForcedChange ? '/home' : '/profile');
      }, 2000);
>>>>>>> Stashed changes
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to change password')
      } else {
        setError('Failed to change password')
      }
    }
  }

  const handleCancel = () => {
    if (!isForcedChange) {
      navigate('/profile');
    }
  };

  return (
<<<<<<< Updated upstream
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Change Password</CardTitle>
          <CardDescription className="text-center">
            You must change your temporary password before continuing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <StatusMessage message={error} type="error" />}
          {success && (
            <StatusMessage
              message="Password changed successfully! Redirecting..."
              type="success"
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <PasswordInput
              value={currentPassword}
              placeholder="Enter current password"
              onInput={setCurrentPassword}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <PasswordInput
              value={newPassword}
              placeholder="Enter new password"
              onInput={setNewPassword}
            />
            {newPassword && <PasswordCriteria password={newPassword} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <PasswordInput
              value={confirmPassword}
              placeholder="Confirm new password"
              onInput={setConfirmPassword}
            />
=======
    <div className="LoginPage">
      <div className="LoginBlock">
        <h1>Change Password</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {isForcedChange 
            ? 'You must change your temporary password before continuing.' 
            : 'Update your password to keep your account secure.'}
        </p>

        <StatusMessage message={error} type="error" />
        {success && (
          <StatusMessage 
            message="Password changed successfully! Redirecting..." 
            type="success" 
          />
        )}

        <div className="LoginInner">
          <div className="LoginInputs">
            <div className="LoginInputChunk">
              <span>Current Password</span>
              <Textbox
                type='password'
                placeholder='Current password...'
                onInput={setCurrentPassword}
                className='LoginInput'
                disabled={success}
              />
            </div>

            <div className="LoginInputChunk">
              <span>New Password</span>
              <Textbox
                type='password'
                placeholder='New password...'
                onInput={setNewPassword}
                className='LoginInput'
                disabled={success}
              />
            </div>

            <div className="LoginInputChunk">
              <span>Confirm New Password</span>
              <Textbox
                type='password'
                placeholder='Confirm new password...'
                onInput={setConfirmPassword}
                className='LoginInput'
                disabled={success}
              />
            </div>
>>>>>>> Stashed changes
          </div>

<<<<<<< Updated upstream
=======
        <div style={{ display: 'flex', gap: '1rem' }}>
>>>>>>> Stashed changes
          <Button
            onClick={handleChangePassword}
            disabled={success}
            className="w-full"
          >
            Change Password
          </Button>
<<<<<<< Updated upstream
        </CardContent>
      </Card>
=======
          {!isForcedChange && (
            <Button
              onClick={handleCancel}
              disabled={success}
              style={{ background: 'var(--bg-secondary)' }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
>>>>>>> Stashed changes
    </div>
  )
}
