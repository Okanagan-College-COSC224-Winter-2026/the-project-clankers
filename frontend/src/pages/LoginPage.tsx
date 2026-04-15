import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import PasswordInput from '../components/PasswordInput'
import StatusMessage from '../components/StatusMessage'
import { tryLogin } from '../util/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const attemptLogin = async () => {
    setError('') // Clear previous error
    try {
      const result = await tryLogin(email, password)
      if (result) {
        if (result.must_change_password) {
          navigate('/change-password', { state: { forced: true } })
        } else {
          navigate('/home')
        }
      } else {
        setError('Invalid email or password')
      }
    } catch {
      setError('Invalid email or password')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    attemptLogin()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg">
          <StatusMessage message={error} type="error" className="text-base px-6 py-4" />
        </div>
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                value={password}
                placeholder="Enter your password"
                autoComplete="current-password"
                onInput={setPassword}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                Login
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
