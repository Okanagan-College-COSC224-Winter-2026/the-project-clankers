import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Camera, Loader2, Upload, X, BookOpen, Key } from 'lucide-react'
import {
  getCurrentUserProfile,
  getEnrolledCourses,
  getUserProfileById,
  uploadProfilePicture,
  getProfilePictureUrl,
} from '../util/api'

interface UserProfile {
  id: number
  student_id?: string | null
  name: string
  email: string
  role: string
  profile_picture_url?: string | null
}

interface Course {
  id: number
  name: string
}

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingPicture, setIsEditingPicture] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const currentUser = await getCurrentUserProfile()
        const routeUserId = Number(id)
        const hasValidRouteUserId = Number.isInteger(routeUserId) && routeUserId > 0
        const targetUserId = hasValidRouteUserId ? routeUserId : currentUser.id
        const viewingOwnProfile = targetUserId === currentUser.id

        const profileData = viewingOwnProfile
          ? currentUser
          : await getUserProfileById(targetUserId)

        setProfile(profileData)
        setIsOwnProfile(viewingOwnProfile)

        if (viewingOwnProfile) {
          const coursesData = await getEnrolledCourses()
          setCourses(Array.isArray(coursesData) ? coursesData : [])
        } else {
          setCourses([])
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setProfile(null)
        setIsOwnProfile(false)
        setCourses([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const getProfileImageUrl = () => {
    return getProfilePictureUrl(profile?.profile_picture_url)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUpdateError('Invalid file type. Please select a PNG, JPG, GIF, or WebP image.')
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setUpdateError('File is too large. Maximum size is 50MB.')
      return
    }

    setSelectedFile(file)
    setUpdateError(null)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpdatePicture = async () => {
    if (!isOwnProfile) {
      setUpdateError('You can only update your own profile picture.')
      return
    }

    if (!selectedFile) {
      setUpdateError('Please select a file')
      return
    }

    setIsUpdating(true)
    setUpdateError(null)

    try {
      await uploadProfilePicture(selectedFile)
      const updatedProfile = await getCurrentUserProfile()
      setProfile(updatedProfile)
      setIsEditingPicture(false)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to upload profile picture')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingPicture(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUpdateError(null)
  }

  const handleChangePassword = () => {
    navigate('/change-password', { state: { forced: false } })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <p className="text-destructive">{error || 'No profile data available'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage src={previewUrl || getProfileImageUrl()} alt={profile.name} />
              <AvatarFallback className="text-2xl">{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
            {isOwnProfile && !isEditingPicture && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => setIsEditingPicture(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isEditingPicture && (
            <div className="flex flex-col gap-3">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileSelect}
                disabled={isUpdating}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdatePicture}
                  disabled={isUpdating || !selectedFile}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
              {updateError && <p className="text-sm text-destructive">{updateError}</p>}
            </div>
          )}

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="capitalize">
                {profile.role}
              </Badge>
              {profile.student_id && (
                <Badge variant="outline">ID: {profile.student_id}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {isOwnProfile
                ? profile.role === 'teacher' || profile.role === 'admin'
                  ? 'My Courses'
                  : 'Enrolled Courses'
                : 'Courses'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isOwnProfile ? (
              <p className="text-sm text-muted-foreground">
                Course list is only available on your own profile.
              </p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {profile.role === 'teacher'
                  ? 'You are not currently teaching any courses.'
                  : 'You are not currently enrolled in any courses.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {courses.map((course) => (
                  <li
                    key={course.id}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2"
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{course.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleChangePassword} variant="outline" className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>
        )}

        {profile.role === 'student' && (
          <Card>
            <CardHeader>
              <CardTitle>Data Corrections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If your profile information is inaccurate, please contact your instructor to
                request corrections.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
