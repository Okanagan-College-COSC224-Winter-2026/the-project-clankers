# User Story Implementation: Instructor Simple Assignment and Review Management Interface

## User Story

**As an instructor**, I want a simple interface for managing assignments and reviews, so that I can use the system easily and save time.

### Assumptions and Details
- Instructor is signed in
- Instructor already has at least one class
- There are assignments to manage

### Acceptance Criteria
1. ✅ Instructor can view all assignments for a class in one place **(Already Complete)**
2. ✅ Instructor can open an assignment and view its peer review settings **(Implemented)**
3. ✅ Instructor can edit or delete an assignment from the same interface **(Implemented)**
4. ✅ Actions give clear success/error messages **(Implemented)**

---

## Implementation Overview

This document describes the implementation process for completing acceptance criteria 2-4 of the instructor assignment management user story. The implementation follows a test-driven development (TDD) approach and maintains consistency with the existing Flask backend architecture.

---

## Architecture Analysis

### Existing Infrastructure (Pre-Implementation)

Before implementing new features, we analyzed the existing codebase:

#### Backend Components
- **Assignment Model** ([flask_backend/api/models/assignment_model.py](../flask_backend/api/models/assignment_model.py))
  - Fields: `id`, `courseID`, `name`, `rubric_text`, `due_date`
  - Relationships: `course`, `rubrics`, `groups`, `submissions`, `reviews`, `group_members`
  - Methods: `can_modify()` - checks if assignment can be edited/deleted based on due date

- **Assignment Controller** ([flask_backend/api/controllers/assignment_controller.py](../flask_backend/api/controllers/assignment_controller.py))
  - `POST /assignment/create_assignment` - Create new assignment ✅
  - `PATCH /assignment/edit_assignment/<id>` - Edit assignment ✅
  - `DELETE /assignment/delete_assignment/<id>` - Delete assignment ✅
  - `GET /assignment/<class_id>` - List all assignments for a class ✅

- **Assignment Schema** ([flask_backend/api/models/schemas.py](../flask_backend/api/models/schemas.py))
  - `AssignmentSchema` - Full serialization with course relationship
  - `RubricSchema` - For peer review rubric data
  - `ReviewSchema` - For peer review data

#### Frontend Components
- **ClassHome Page** ([frontend/src/pages/ClassHome.tsx](../frontend/src/pages/ClassHome.tsx))
  - Lists all assignments for a class using `AssignmentCard` components
  - Teachers can create new assignments
  - ✅ **Acceptance Criteria 1 already satisfied**

- **Assignment Page** ([frontend/src/pages/Assignment.tsx](../frontend/src/pages/Assignment.tsx))
  - Student view: Display rubrics, select group members, submit reviews
  - Teacher view: Create rubrics
  - Missing: Assignment management interface

- **API Utilities** ([frontend/src/util/api.ts](../frontend/src/util/api.ts))
  - `listAssignments()` - Fetch all assignments for a class ✅
  - `createAssignment()` - Create new assignment ✅
  - Missing: Get single assignment details, edit, delete

---

## Implementation Process

### Phase 1: Backend - Add Assignment Details Endpoint

**Objective:** Create an endpoint to view detailed assignment information including peer review settings.

#### Changes Made

**File:** [flask_backend/api/controllers/assignment_controller.py](../flask_backend/api/controllers/assignment_controller.py)

Added new endpoint `GET /assignment/details/<assignment_id>`:

```python
@bp.route("/details/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment_details(assignment_id):
    """Get detailed information for a single assignment including peer review settings"""
```

**Key Features:**
- Returns full assignment data with course information
- Includes peer review settings (rubrics with `canComment` flags)
- For teachers: Includes statistics (review count, group count)
- Access control: Only course teacher or enrolled students can access
- Clear error messages for all failure cases

**Security Considerations:**
- JWT authentication required
- Authorization checks:
  - User must be the course teacher OR
  - User must be enrolled in the course
- Returns 403 for unauthorized access
- Returns 404 for non-existent assignments

#### Testing Strategy

**File:** [flask_backend/tests/test_assignments.py](../flask_backend/tests/test_assignments.py)

Added 5 comprehensive test cases:

1. **`test_teacher_can_get_assignment_details`**
   - **Given:** A teacher creates an assignment
   - **When:** They request assignment details
   - **Then:** Returns full details including rubrics, review_count, group_count

2. **`test_student_can_get_assignment_details_if_enrolled`**
   - **Given:** A student enrolled in the course
   - **When:** They request assignment details
   - **Then:** Returns assignment details with rubrics (without teacher-only stats)

3. **`test_unenrolled_student_cannot_get_assignment_details`**
   - **Given:** A student NOT enrolled in the course
   - **When:** They try to access assignment details
   - **Then:** Returns 403 Unauthorized

4. **`test_get_nonexistent_assignment_details`**
   - **Given:** A teacher user
   - **When:** They request details for non-existent assignment
   - **Then:** Returns 404 Not Found

5. **`test_unauthenticated_user_cannot_get_assignment_details`**
   - **Given:** Unauthenticated user
   - **When:** They try to access assignment details
   - **Then:** Returns 401 Unauthorized

**Test Results:**
```
✅ All 5 tests passed
```

---

### Phase 2: Frontend - Add API Functions

**Objective:** Create frontend API utilities for the new and existing backend endpoints.

#### Changes Made

**File:** [frontend/src/util/api.ts](../frontend/src/util/api.ts)

Added three new API functions:

1. **`getAssignmentDetails(assignmentId: number)`**
   ```typescript
   // GET /assignment/details/:id
   // Returns: Assignment with rubrics, review counts, etc.
   ```

2. **`editAssignment(assignmentId: number, data: {...})`**
   ```typescript
   // PATCH /assignment/edit_assignment/:id
   // Updates: name, rubric, due_date
   // Returns: { msg, assignment }
   ```

3. **`deleteAssignment(assignmentId: number)`**
   ```typescript
   // DELETE /assignment/delete_assignment/:id
   // Returns: { msg: "Assignment deleted" }
   ```

**Implementation Details:**
- All functions use `credentials: 'include'` for HTTPOnly cookie authentication
- Error handling extracts error messages from response JSON
- Uses `maybeHandleExpire()` to handle session expiration
- Throws descriptive errors on failure

---

### Phase 3: Frontend - Create Assignment Management UI

**Objective:** Build an instructor-friendly interface for viewing, editing, and deleting assignments.

#### Component Design

**New Component:** [frontend/src/components/AssignmentSettings.tsx](../frontend/src/components/AssignmentSettings.tsx)

**Features Implemented:**

1. **View Assignment Details** (Read Mode)
   - Display assignment name, rubric description, due date
   - Show peer review settings (list of rubrics with comment settings)
   - Show progress statistics (review count, group count) for teachers
   - Clean, readable layout with labeled fields

2. **Edit Assignment** (Edit Mode)
   - Toggle between read and edit modes
   - Editable fields:
     - Assignment Name (required)
     - Rubric Description
     - Due Date (date picker)
   - Validation: Assignment name is required
   - Save/Cancel buttons
   - Updates reflected immediately after save

3. **Delete Assignment** (Danger Zone)
   - Clearly marked "Danger Zone" section with warning color
   - Confirmation dialog: "Are you sure?"
   - Redirects to class home after successful deletion
   - Disabled during loading state

4. **Success/Error Messages** ✅ **Acceptance Criteria 4**
   - StatusMessage component displays all feedback
   - Success messages (green):
     - "Assignment updated successfully!"
     - "Assignment deleted successfully! Redirecting..."
   - Error messages (red):
     - Field validation errors
     - Server errors (with message from backend)
     - Loading states ("Saving...", "Deleting...")

**Styling:** [frontend/src/components/AssignmentSettings.css](../frontend/src/components/AssignmentSettings.css)
- Responsive layout with max-width constraint
- Clean section-based design
- Form inputs with proper focus states
- Danger zone with red accent color
- Button disabled states for loading

#### Integration with Assignment Page

**Updated:** [frontend/src/pages/Assignment.tsx](../frontend/src/pages/Assignment.tsx)

**Changes:**
- Added import for `AssignmentSettings` component
- Added `useLocation` hook to detect current tab
- Added "Manage" tab to navigation (visible only to teachers)
- Conditional rendering:
  - If on `/assignment/:id/manage` → Show `AssignmentSettings`
  - Otherwise → Show existing rubric display and review interface

**Tab Structure:**
```typescript
// For Teachers:
[
  { label: "Home", path: `/assignment/${id}` },
  { label: "Group", path: `/assignment/${id}/group` },
  { label: "Manage", path: `/assignment/${id}/manage` }  // NEW
]

// For Students:
[
  { label: "Home", path: `/assignment/${id}` },
  { label: "Group", path: `/assignment/${id}/group` }
]
```

---

## Testing and Verification

### Backend Tests

**Command:** 
```bash
cd flask_backend
pytest tests/test_assignments.py -v
```

**Results:**
- ✅ 5 new tests for assignment details endpoint: **ALL PASSED**
- ✅ 19 existing tests for create/edit/delete: **19 PASSED**
- Total: **24 tests**

**Test Coverage:**
- Create assignment: 5 test cases
- Edit assignment: 5 test cases
- Delete assignment: 5 test cases
- List assignments: 4 test cases
- Get assignment details: 5 test cases (NEW)

### Manual Testing Checklist

**Tested Scenarios:**

1. **View Assignment Details (AC #2)** ✅
   - [x] Teacher can access assignment details via "Manage" tab
   - [x] Assignment information displays correctly
   - [x] Rubrics list shows all created rubrics with comment settings
   - [x] Review and group counts display for teachers
   - [x] Students can view details if enrolled

2. **Edit Assignment (AC #3)** ✅
   - [x] "Edit Assignment" button switches to edit mode
   - [x] All fields are editable
   - [x] Date picker works correctly
   - [x] "Save Changes" updates assignment
   - [x] "Cancel" reverts changes
   - [x] Cannot edit after due date (backend validation)

3. **Delete Assignment (AC #3)** ✅
   - [x] "Delete Assignment" button in danger zone
   - [x] Confirmation dialog appears
   - [x] Assignment deleted on confirmation
   - [x] Redirects to class home after deletion
   - [x] Cannot delete after due date (backend validation)

4. **Success/Error Messages (AC #4)** ✅
   - [x] Success message on edit
   - [x] Success message on delete
   - [x] Error message for validation failures
   - [x] Error message for unauthorized access
   - [x] Error message for server errors
   - [x] Loading states during operations

---

## Key Design Decisions

### 1. Separate Details Endpoint vs. Enhanced List Endpoint

**Decision:** Create a separate `/assignment/details/<id>` endpoint

**Rationale:**
- List endpoint should be lightweight (only basic info)
- Details endpoint can eagerly load relationships (rubrics, reviews)
- Avoids N+1 query problems when listing assignments
- Follows RESTful API design patterns

### 2. Manage Tab vs. Modal/Inline Editing

**Decision:** Add a dedicated "Manage" tab for teachers

**Rationale:**
- Keeps the interface organized and uncluttered
- Provides dedicated space for all management functions
- Consistent with existing tab navigation pattern
- Easy to extend with additional management features

### 3. In-Place Editing vs. Separate Edit Page

**Decision:** Toggle between read/edit modes in the same component

**Rationale:**
- Faster workflow (no page navigation)
- Users can see what they're editing
- Cancel button easily reverts changes
- Common pattern in modern web applications

### 4. Confirmation Dialog for Delete

**Decision:** Use browser-native `confirm()` dialog

**Rationale:**
- Simple and effective
- No additional component needed
- Clear and recognizable to users
- Prevents accidental deletions

---

## Code Quality and Best Practices

### Backend

✅ **Authentication & Authorization**
- JWT required for all endpoints
- Role-based access control (teachers can manage, students can view)
- Enrollment verification for student access

✅ **Error Handling**
- Clear, descriptive error messages
- Appropriate HTTP status codes (200, 400, 403, 404)
- Consistent JSON response format: `{ "msg": "..." }`

✅ **Database Queries**
- Uses existing model methods (`get_by_id`, `can_modify`)
- Eager loading of relationships where needed
- Transaction safety with SQLAlchemy

✅ **Testing**
- Comprehensive test coverage for happy paths and edge cases
- Tests use fixtures for consistent setup
- Tests verify both success and failure scenarios

### Frontend

✅ **Component Design**
- Single responsibility principle (AssignmentSettings handles management only)
- Props interface for type safety
- State management with React hooks

✅ **Error Handling**
- Try-catch blocks for all async operations
- User-friendly error messages displayed via StatusMessage
- Loading states to prevent double-submissions

✅ **User Experience**
- Clear visual hierarchy (sections, labels, buttons)
- Form validation before submission
- Confirmation for destructive actions
- Responsive design (max-width constraint)

✅ **Type Safety**
- TypeScript interfaces for all data structures
- Type annotations on all functions
- Proper typing for API responses

---

## Files Changed/Created

### Backend
- ✏️ Modified: [flask_backend/api/controllers/assignment_controller.py](../flask_backend/api/controllers/assignment_controller.py)
  - Added `get_assignment_details()` endpoint

- ✏️ Modified: [flask_backend/tests/test_assignments.py](../flask_backend/tests/test_assignments.py)
  - Added 5 new test cases for assignment details endpoint

### Frontend
- ✏️ Modified: [frontend/src/util/api.ts](../frontend/src/util/api.ts)
  - Added `getAssignmentDetails()`
  - Added `editAssignment()`
  - Added `deleteAssignment()`

- ✏️ Modified: [frontend/src/pages/Assignment.tsx](../frontend/src/pages/Assignment.tsx)
  - Added "Manage" tab for teachers
  - Integrated AssignmentSettings component
  - Added conditional rendering based on active tab

- ✨ Created: [frontend/src/components/AssignmentSettings.tsx](../frontend/src/components/AssignmentSettings.tsx)
  - Complete assignment management interface
  - View, edit, delete functionality
  - Success/error message handling

- ✨ Created: [frontend/src/components/AssignmentSettings.css](../frontend/src/components/AssignmentSettings.css)
  - Responsive styling for management interface
  - Form input styling
  - Danger zone visual treatment

---

## Future Enhancements

While this implementation completes all acceptance criteria, potential future improvements include:

1. **Batch Operations**
   - Delete multiple assignments at once
   - Duplicate assignment functionality

2. **Advanced Rubric Management**
   - Edit rubrics directly from assignment settings
   - Preview rubric before saving

3. **Enhanced Statistics**
   - Completion percentage for reviews
   - Review quality metrics
   - Student participation rates

4. **Due Date Management**
   - Extend due date functionality
   - Email notifications before due date

5. **Assignment Templates**
   - Save assignments as templates
   - Quick-create from template

---

## Conclusion

This implementation successfully completes acceptance criteria 2-4 for the instructor assignment management user story:

✅ **AC #2:** Instructors can open an assignment and view detailed peer review settings via the new "Manage" tab

✅ **AC #3:** Instructors can edit or delete assignments from the same interface with proper authorization and validation

✅ **AC #4:** All actions provide clear success/error messages using the StatusMessage component

The implementation follows established patterns in the codebase, maintains type safety, includes comprehensive test coverage, and provides a clean, intuitive user interface. The test-driven development approach ensures reliability and makes future modifications safer.

---

## Running the Implementation

### Backend Setup
```bash
cd flask_backend
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# OR: source venv/bin/activate  # macOS/Linux

flask run  # Starts on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:3000
```

### Run Tests
```bash
cd flask_backend
pytest tests/test_assignments.py -v
```

### Verify Implementation
1. Sign in as a teacher
2. Navigate to a class with assignments
3. Click on an assignment
4. Click the "Manage" tab
5. View assignment details, edit fields, or delete the assignment
6. Observe success/error messages for all actions
