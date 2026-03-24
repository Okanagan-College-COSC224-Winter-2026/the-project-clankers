import { useEffect, useState } from 'react'
import './Profile.css'
import { getCurrentUserProfile, getEnrolledCourses, uploadProfilePicture, getProfilePictureUrl } from '../util/api'

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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
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
        const profileData = await getCurrentUserProfile()
        setProfile(profileData)
        
        const coursesData = await getEnrolledCourses()
        setCourses(Array.isArray(coursesData) ? coursesData : [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setProfile(null)
        setCourses([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getProfileImageUrl = () => {
    return getProfilePictureUrl(profile?.profile_picture_url)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUpdateError('Invalid file type. Please select a PNG, JPG, GIF, or WebP image.')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setUpdateError('File is too large. Maximum size is 5MB.')
      return
    }

    setSelectedFile(file)
    setUpdateError(null)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpdatePicture = async () => {
    if (!selectedFile) {
      setUpdateError('Please select a file')
      return
    }

    setIsUpdating(true)
    setUpdateError(null)

    try {
      await uploadProfilePicture(selectedFile)
      // Refresh profile to get updated picture URL
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

  if (loading) {
    return (
      <div className="Profile">
        <p className="profile-loading">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="Profile">
        <p className="profile-error">Error: {error}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="Profile">
        <p className="profile-error">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="Profile">
      <div className="profile-image-container">
        <div className="profile-image">
          <img src={previewUrl || getProfileImageUrl()} alt="profile" />
        </div>
        {!isEditingPicture ? (
          <button 
            className="change-picture-btn" 
            onClick={() => setIsEditingPicture(true)}
          >
            Change Picture
          </button>
        ) : (
          <div className="edit-picture-form">
            <input
              type="file"
              className="picture-file-input"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={handleFileSelect}
              disabled={isUpdating}
            />
            {selectedFile && (
              <p className="selected-file-name">Selected: {selectedFile.name}</p>
            )}
            <div className="edit-picture-buttons">
              <button 
                className="save-picture-btn" 
                onClick={handleUpdatePicture}
                disabled={isUpdating || !selectedFile}
              >
                {isUpdating ? 'Uploading...' : 'Upload'}
              </button>
              <button 
                className="cancel-picture-btn" 
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
            {updateError && <p className="update-error">{updateError}</p>}
          </div>
        )}
      </div>

      <div className="profile-info">
        <div className="profile-section">
          <h2>Full Name</h2>
          <span>{profile.name}</span>
        </div>

        <div className="profile-section">
          <h2>Student ID</h2>
          <span>{profile.student_id || 'NULL'}</span>
        </div>

        <div className="profile-section">
          <h2>Email</h2>
          <span>{profile.email}</span>
        </div>

        <div className="profile-section">
          <h2>Role</h2>
          <span className="role-badge">{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</span>
        </div>

        {profile.role === 'student' && (
          <div className="profile-corrections">
            <h3>Data Corrections</h3>
            <p>If your profile information is inaccurate, please contact your instructor to request corrections.</p>
          </div>
        )}
      </div>

      <div className="profile-enrolled-courses">
        <h3>{profile.role === 'teacher' || profile.role === 'admin' ? 'My Courses' : 'Enrolled Courses'}</h3>
        {courses.length === 0 ? (
          <p className="no-courses-message">
            {profile.role === 'teacher' 
              ? 'You are not currently teaching any courses.' 
              : 'You are not currently enrolled in any courses.'}
          </p>
        ) : (
          <ul className="courses-list">
            {courses.map((course) => (
              <li key={course.id} className="course-item">
                <span className="course-name">{course.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}