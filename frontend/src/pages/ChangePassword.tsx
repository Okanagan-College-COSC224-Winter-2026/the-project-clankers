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

      await changePassword(currentPassword, newPassword)
      setSuccess(true)

      setTimeout(() => {
        navigate('/home')
      }, 2000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to change password')
      } else {
        setError('Failed to change password')
      }
    }
  }

  return (
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
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={success}
            className="w-full"
          >
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
