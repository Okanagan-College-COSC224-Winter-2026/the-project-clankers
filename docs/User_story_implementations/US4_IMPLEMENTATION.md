# US4 Implementation Summary – Class and Assignment Creation

## ✅ Status: COMPLETE

User Story 4 has been fully implemented with all acceptance criteria met across both the Flask backend and React frontend.

---

## 📋 User Story

**As an instructor, I want to be able to create classes and associated assignments with evaluation events, so that I can provide my students with evaluation and review materials.**

---

## ✅ Acceptance Criteria Met

- [x] Instructor can create a class
- [x] Instructor can view class details (student count, assignment count, teacher info)
- [x] Instructor can edit/update a class name
- [x] Instructor can delete a class (only if no assignments exist, or if user is admin)
- [x] Instructor can create an assignment under that class
- [x] Students in that class can see the assignment
- [x] Instructor can edit or delete the assignment before its due date

---

## 🗄️ Backend Changes

### Class Controller
**File**: `flask_backend/api/controllers/class_controller.py`

#### Endpoints Implemented

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/class/create_class` | Create a new class | Teacher |
| `GET` | `/class/classes` | List classes for the authenticated user | Any |
| `GET` | `/class/browse_classes` | List all classes | Any |
| `GET` | `/class/<id>` | Get class details (name, teacher, student count, assignment count) | Teacher / Enrolled Student / Admin |
| `PUT` | `/class/update_class` | Rename a class | Teacher (own class) / Admin |
| `DELETE` | `/class/delete_class` | Delete a class | Teacher (own class) / Admin |
| `POST` | `/class/members` | Get all members of a class | Any |
| `POST` | `/class/enroll_students` | Bulk-enroll students via CSV roster | Teacher |

#### Key Logic – `delete_class`
- Teachers can only delete their own classes.
- Deletion is blocked if the class has existing assignments (returns 400) **unless** the user is an admin.
- Admins can delete any class regardless of assignment count.

#### Key Logic – `update_class`
- Validates that the new class name is not a duplicate for the same teacher.
- Admins can rename any class.

#### Key Logic – `enroll_students`
- Accepts a CSV with `id`, `name`, `email` columns.
- Creates new student accounts with secure temporary passwords if the student does not exist.
- Prevents duplicate student IDs within the CSV and in the database.
- Returns a summary of enrolled, created, and already-existing students.

---

### Assignment Controller
**File**: `flask_backend/api/controllers/assignment_controller.py`

#### Endpoints Implemented

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/assignment/create_assignment` | Create a new assignment for a class | Teacher |
| `PATCH` | `/assignment/edit_assignment/<id>` | Edit assignment name, rubric, or dates | Teacher (own class) |
| `DELETE` | `/assignment/delete_assignment/<id>` | Delete an assignment | Teacher (own class) |
| `GET` | `/assignment/<class_id>` | List all assignments for a class | Teacher / Student |
| `GET` | `/assignment/details/<id>` | Get detailed info for a single assignment | Teacher / Enrolled Student |

#### Key Logic – Date Handling
- Assignments have optional `start_date` and `due_date` (ISO 8601 strings).
- `can_modify()` prevents edits or deletion after the due date has passed.
- Students only see assignments where `is_visible_to_students()` returns `True` (i.e., the start date has been reached).

---

## 🖥️ Frontend Changes

### Class Creation Page
**File**: `frontend/src/pages/CreateClass.tsx`

- Simple form that calls `POST /class/create_class`.
- Shows a success or error status message after submission.
- Resets the input field on success.

---

### Class Home Page
**File**: `frontend/src/pages/ClassHome.tsx`

Main class dashboard for both teachers and students. Key features:

- **Class name display and inline editing** – Teachers can click the ✏️ icon to rename the class in-place. Saves via `PUT /class/update_class`.
- **Assignment list** – All assignments rendered as `AssignmentCard` components. Students only see assignments whose start date has passed.
- **Create assignment form** – Visible to teachers only. Accepts assignment name, optional start date, and optional due date. Submits via `POST /assignment/create_assignment`.
- **Roster upload** – Teachers can upload a CSV file to bulk-enroll students via `POST /class/enroll_students`. Results are displayed in a `RosterUploadResult` modal.
- **Delete Class button** – Red button (`#dc3545`) visible to teachers only. Opens a confirmation modal before calling `DELETE /class/delete_class`. Warns the user if the class has existing assignments.
- **Tab navigation** – Teachers see Home, Members, Groups, and Student Submissions tabs. Students see Home and Members only.

---

### Assignment Settings Component
**File**: `frontend/src/components/AssignmentSettings.tsx`

Embedded within the assignment detail page. Allows teachers to:

- **Edit assignment** – Update name, rubric text, start date, and due date.
- **Delete assignment** – Red "Delete Assignment" button in a styled danger zone. Confirms via `window.confirm` before calling `DELETE /assignment/delete_assignment/<id>`. Redirects back to the class page on success.

---

## 🎨 UI/Styling Changes

### Button Component
**File**: `frontend/src/components/Button.tsx`

- Added `style?: React.CSSProperties` prop to allow inline styles to be forwarded to the underlying `<button>` element.
- This enables delete buttons (e.g., "Delete Class" in ClassHome) to apply a red background (`#dc3545`) correctly.

### Group Page Delete Button
**File**: `frontend/src/pages/Group.tsx`

- Added `style={{ backgroundColor: '#dc3545', color: 'white' }}` to the "Delete Selected Group" button to match the red delete button convention used across the app.

### Existing Red Delete Button Styles
The following delete button styles were already red prior to this story and remain unchanged:

| Class / Selector | File | Color |
|---|---|---|
| `.delete-btn` | `ClassGroupManagement.css` | `#dc3545` |
| `.delete-file-button-small` | `AssignmentFileUpload.css` | `#f44336` |
| `.delete-file-button` | `AssignmentFileUpload.css` | `#f44336` |
| `.delete-button-wrapper button` | `RubricCreator.css` | `#dc3545` |
| `.danger-zone button` | `AssignmentSettings.css` | `#e74c3c` |

---

## 🔐 Access Control Summary

| Action | Student | Teacher (own class) | Teacher (other class) | Admin |
|--------|---------|--------------------|-----------------------|-------|
| View class details | ✅ (if enrolled) | ✅ | ❌ | ✅ |
| Create class | ❌ | ✅ | ✅ | ✅ |
| Rename class | ❌ | ✅ | ❌ | ✅ |
| Delete class (no assignments) | ❌ | ✅ | ❌ | ✅ |
| Delete class (with assignments) | ❌ | ❌ | ❌ | ✅ |
| View assignments | ✅ (started only) | ✅ | ❌ | ✅ |
| Create assignment | ❌ | ✅ | ❌ | ❌ |
| Edit assignment | ❌ | ✅ (before due date) | ❌ | ❌ |
| Delete assignment | ❌ | ✅ (before due date) | ❌ | ❌ |

---

## 🧪 Tests

Tests for class and assignment management are located in:

- `flask_backend/tests/test_classes.py` – Class CRUD, access control, roster upload
- `flask_backend/tests/test_assignments.py` – Assignment creation, editing, deletion, visibility rules
- `flask_backend/tests/test_assignment_schema.py` – Marshmallow schema serialization for assignments
- `flask_backend/tests/test_course_schema.py` – Marshmallow schema serialization for courses

Run all tests:
```bash
cd flask_backend
pytest
```
