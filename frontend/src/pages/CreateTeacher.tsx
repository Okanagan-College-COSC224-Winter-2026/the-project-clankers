import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import StatusMessage from '../components/StatusMessage'
import { createTeacherAccount } from '../util/api'
import { UserPlus, CheckCircle } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function CreateTeacher() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdTeacher, setCreatedTeacher] = useState<User | null>(null)

  const handleCreateTeacher = async () => {
    try {
      setError('')
      setSuccess(false)

      if (!name || !email || !password) {
        setError('All fields are required')
        return
      }

      if (password.length < 6) {
        setError('Temporary password must be at least 6 characters')
        return
      }

      const result = await createTeacherAccount(name, email, password)
      setCreatedTeacher(result.user)
      setSuccess(true)

      setName('')
      setEmail('')
      setPassword('')
    } catch {
      setError('Failed to create teacher account')
    }
  }

  return (
    <div className="flex flex-1 items-start justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Teacher Account
          </CardTitle>
          <CardDescription>
            Create a new teacher account with a temporary password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <StatusMessage message={error} type="error" />}

          {success && createdTeacher && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Teacher account created successfully!</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-green-600 dark:text-green-400">
                <p><strong>Name:</strong> {createdTeacher.name}</p>
                <p><strong>Email:</strong> {createdTeacher.email}</p>
                <p><strong>Temporary Password:</strong> (provided by you)</p>
                <p className="mt-2 italic">
                  The teacher will be prompted to change their password on first login.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Teacher Name</Label>
            <Input
              id="name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Institutional Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateTeacher} className="flex-1">
              Create Teacher
            </Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
