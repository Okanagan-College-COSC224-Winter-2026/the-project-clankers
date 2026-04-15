import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import PasswordInput from '../components/PasswordInput'
import PasswordCriteria from '../components/PasswordCriteria'
import StatusMessage from '../components/StatusMessage'
import { changePassword } from '../util/api'
import { validatePassword } from '../util/passwordValidation'

export default function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()

  // Check if this is a forced password change (from login flow)
  const isForcedChange = location.state?.forced === true

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

      const validation = validatePassword(newPassword)
      if (!validation.isValid) {
        setError(validation.errors.join(', '))
        return
      }

      if (currentPassword === newPassword) {
        setError('New password must be different from current password')
        return
      }

      await changePassword(currentPassword, newPassword)
      setSuccess(true)

      setTimeout(() => {
        navigate(isForcedChange ? '/home' : '/profile')
      }, 2000)
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
      navigate('/profile')
    }
  }

  const passwordValidation = newPassword ? validatePassword(newPassword) : { isValid: false, errors: [] }
  const isFormValid =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    passwordValidation.isValid &&
    currentPassword !== newPassword

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Change Password</CardTitle>
          <CardDescription className="text-center">
            {isForcedChange
              ? 'You must change your temporary password before continuing'
              : 'Update your password to keep your account secure'}
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
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleChangePassword}
              disabled={success || !isFormValid}
              className="flex-1"
            >
              Change Password
            </Button>
            {!isForcedChange && (
              <Button
                onClick={handleCancel}
                disabled={success}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
