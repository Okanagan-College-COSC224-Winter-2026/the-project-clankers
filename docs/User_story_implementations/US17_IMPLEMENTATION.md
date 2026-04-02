# User Story 17: Student Enrollment Requests with Teacher Approval

**Narrative:** When a student clicks "join course" on the browse page, a request is created instead of auto-enrolling. The teacher is assigned to that course and gets notified. The teacher can choose to approve the request, and if so, the student will be enrolled in that class. The notifications show in a notification center for the teachers.

## Status: ✅ COMPLETE

---

## Implementation Overview

### Backend Architecture

#### 1. Database Models
**File:** `flask_backend/api/models/enrollment_request_model.py`
- **EnrollmentRequest Model**
  - Fields: `studentID`, `courseID`, `status` (pending/approved/rejected), `created_at`, `resolved_at`, `teacher_notes`
  - Methods: `create_request()`, `approve()`, `reject()`, `get_existing_request()`, `get_pending_for_course()`
  - Prevents duplicate pending requests for same student/course combo

**File:** `flask_backend/api/models/notification_model.py`
- **Notification Model**
  - Fields: `userID`, `type`, `related_id`, `message`, `is_read`, `created_at`
  - Types: `enrollment_request`, `enrollment_approved`, `enrollment_rejected`
  - Methods: `create_notification()`, `get_for_user()`, `get_unread_for_user()`, `mark_as_read()`

#### 2. API Endpoints
**File:** `flask_backend/api/controllers/enrollment_controller.py`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/enrollments/request` | Student | Submit enrollment request |
| GET | `/enrollments/teacher/requests` | Teacher | Get pending requests for teacher's courses |
| POST | `/enrollments/{id}/approve` | Teacher | Approve request → auto-enroll student |
| POST | `/enrollments/{id}/reject` | Teacher | Reject request with optional notes |
| GET | `/notifications` | Any | Get all notifications |
| GET | `/notifications/unread` | Any | Get unread notifications |
| PUT | `/notifications/{id}/read` | Any | Mark notification as read |

#### 3. Database Integration
- Models registered in `flask_backend/api/models/__init__.py`
- Schemas (EnrollmentRequestSchema, NotificationSchema) in `schemas.py`
- Blueprint registered in `flask_backend/api/__init__.py`

---

### Frontend Implementation

#### 1. Components
**File:** `frontend/src/components/NotificationCenter.tsx`
- Modal dialog for viewing enrollment requests
- Filter tabs: "Pending" and "All"
- Status badges: yellow (pending), green (approved), red (rejected)
- Approve/Reject buttons with loading states
- Optional rejection notes via prompt
- Real-time state updates after action

**File:** `frontend/src/components/Sidebar.tsx`
- Notification bell icon (teachers only)
- Red badge showing count of pending requests
- Auto-refreshes every 30 seconds
- Opens NotificationCenter modal on click
- Hidden for non-teacher roles

#### 2. API Layer
**File:** `frontend/src/util/api.ts`
- `requestEnrollment(courseId)` - Request to join course
- `getEnrollmentRequests()` - Get pending requests (teachers)
- `approveEnrollmentRequest(requestId)` - Approve request
- `rejectEnrollmentRequest(requestId, notes)` - Reject with notes
- `getNotifications()` - Get all notifications
- `getUnreadNotifications()` - Get unread only
- `markNotificationAsRead(notificationId)` - Mark read

#### 3. Page Updates
**File:** `frontend/src/pages/Browse.tsx`
- Changed "Join Course" button to "Request to Join"
- Uses `requestEnrollment()` instead of direct enrollment
- Success message: "Enrollment request submitted! Waiting for teacher approval."
- Button shows "Requesting..." state during submission

---

## User Workflow

### 1. Student Requests Enrollment
```
Student views Browse page
    ↓
Student clicks "Request to Join" button
    ↓
API POST /enrollments/request {course_id}
    ↓
EnrollmentRequest created with status="pending"
    ↓
Notification created for course teacher
    ↓
Success message: "Enrollment request submitted!"
```

### 2. Teacher Receives Notification
```
Teacher logs in
    ↓
Sidebar shows notification bell with count
    ↓
Teacher clicks bell
    ↓
NotificationCenter modal opens
    ↓
Teacher sees student request with 3 options:
  - "Approve" button → enrolls student
  - "Reject" button → prompts for notes
  - View student details and request date
```

### 3. Teacher Approves Request
```
Teacher clicks "Approve"
    ↓
API POST /enrollments/{request_id}/approve
    ↓
- EnrollmentRequest status → "approved"
- Student auto-added to User_Courses
- Notification created for student: "Your request to join [Course] has been approved!"
    ↓
Request moves from "Pending" to "All" tab (if filtered)
    ↓
Notification bell count decreases
```

### 4. Teacher Rejects Request
```
Teacher clicks "Reject"
    ↓
Prompt: "Add notes (optional):"
    ↓
API POST /enrollments/{request_id}/reject {notes}
    ↓
- EnrollmentRequest status → "rejected"
- teacher_notes stored
- Notification created for student: "Your request to join [Course] has been rejected. Notes: [teacher notes]"
    ↓
Request moves to "All" tab only (not in Pending)
    ↓
Notification bell count decreases
```

---

## Test Coverage

**File:** `flask_backend/tests/test_enrollment_workflow.py`

All 8 tests passing ✅:

1. **test_student_request_enrollment** - Student can submit request
2. **test_student_cannot_request_twice** - Duplicate requests prevented
3. **test_teacher_receives_notification** - Notification created for teacher
4. **test_teacher_approve_request** - Student auto-enrolled on approval
5. **test_teacher_reject_request** - Rejection with notes stored
6. **test_teacher_get_enrollment_requests** - Teacher views all pending requests
7. **test_notifications_mark_as_read** - Mark read functionality works
8. **test_get_unread_notifications** - Unread filtering works

Test commands:
```bash
cd flask_backend
.venv/Scripts/python -m pytest tests/test_enrollment_workflow.py -v
```

---

## Key Features

✅ **Request Management**
- Students request instead of auto-enroll
- Teachers approve/reject with notes
- Automatic enrollment on approval

✅ **Notifications**
- Teachers notified of enrollment requests
- Students notified of approval/rejection
- Badge counter shows pending count
- Auto-refresh every 30 seconds

✅ **UI/UX**
- Clean modal interface for managing requests
- Real-time status updates
- Filter by pending vs all requests
- Loading states during actions

✅ **Data Integrity**
- Prevents duplicate requests
- Transactional approval process
- Proper status tracking

---

## Files Modified/Created

### Backend
- ✨ `flask_backend/api/models/enrollment_request_model.py` (NEW)
- ✨ `flask_backend/api/models/notification_model.py` (NEW)
- 📝 `flask_backend/api/models/__init__.py` (Updated)
- 📝 `flask_backend/api/models/schemas.py` (Updated)
- ✨ `flask_backend/api/controllers/enrollment_controller.py` (NEW)
- 📝 `flask_backend/api/__init__.py` (Updated - registered blueprints)
- ✨ `flask_backend/tests/test_enrollment_workflow.py` (NEW)

### Frontend
- ✨ `frontend/src/components/NotificationCenter.tsx` (NEW)
- 📝 `frontend/src/components/Sidebar.tsx` (Updated)
- 📝 `frontend/src/pages/Browse.tsx` (Updated)
- 📝 `frontend/src/util/api.ts` (Updated)

---

## Setup Instructions

### Database Initialization
```powershell
cd flask_backend
.venv/Scripts/python -m flask init_db
.venv/Scripts/python -m flask add_users
```

### Running Tests
```powershell
cd flask_backend
.venv/Scripts/python -m pytest tests/test_enrollment_workflow.py -v
```

### Running Application
**Terminal 1 - Flask Backend:**
```powershell
cd flask_backend
.venv/Scripts/python -m flask --app api run
```

**Terminal 2 - React Frontend:**
```powershell
cd frontend
npm run dev
```

---

## Error Handling

### Student-Facing Errors
- "Course not found" - Invalid course ID
- "Already enrolled in this course" - Student already in course
- "You already have a pending enrollment request for this course" - Duplicate request
- "Only students can request enrollment" - Non-student attempting request

### Teacher-Facing Errors
- "Request not found" - Invalid request ID
- "Request is already [status]" - Cannot modify resolved request
- "You are not authorized to [approve/reject] this request" - Wrong teacher

---

## Future Enhancements

- Email notifications for both students and teachers
- Bulk approval/rejection of requests
- Request expiration after X days
- Student can cancel pending requests
- Teacher comments/feedback on rejections
- Analytics on approval rates per course
- Admin dashboard for system-wide request management

---

## Notes

- Notification bell only visible to teachers
- Auto-refresh prevents stale data for teachers with many courses
- All API endpoints require JWT authentication
- SQLite tested; PostgreSQL compatible for production
