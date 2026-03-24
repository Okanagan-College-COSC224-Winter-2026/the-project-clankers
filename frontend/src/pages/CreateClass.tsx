import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import StatusMessage from '../components/StatusMessage'
import { createClass } from '../util/api'
import { Plus } from 'lucide-react'

export default function CreateClass() {
  const [name, setName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'error' | 'success'>('error')

  const attemptCreateClass = async () => {
    try {
      setStatusMessage('')
      const response = await createClass(name)

      if (!response.ok) {
        throw new Error('Failed to create class')
      }

      setStatusType('success')
      setStatusMessage('Class created successfully!')
      setName('')
    } catch (error) {
      console.error('Error creating class:', error)
      setStatusType('error')
      setStatusMessage('Error creating class.')
    }
  }

  return (
    <div className="flex flex-1 items-start justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Class
          </CardTitle>
          <CardDescription>Create a new class for your students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

          <div className="space-y-2">
            <Label htmlFor="className">Class Name</Label>
            <Input
              id="className"
              placeholder="Enter class name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Button onClick={attemptCreateClass} className="w-full">
            Create Class
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
