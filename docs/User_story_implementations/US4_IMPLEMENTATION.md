# US4 Implementation Summary – Class and Assignment Creation

## ✅ Status: COMPLETE

User Story 4 has been fully implemented. All original acceptance criteria are met, and a number of additional quality-of-life and safety improvements were made on top of the core requirements.

---

## 📋 User Story

**As an instructor, I want to be able to create classes and associated assignments with evaluation events, so that I can provide my students with evaluation and review materials.**

---

## ✅ Acceptance Criteria Met

- [x] Instructor can create a class
- [x] Instructor can view class details (student count, assignment count, teacher info)
- [x] Instructor can edit/update a class name
- [x] Instructor can delete a class safely, with protections against accidental data loss
- [x] Instructor can archive a class to hide it from their dashboard without losing any data
- [x] Instructor can create an assignment under a class
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
| `GET` | `/class/classes` | List classes for the authenticated user (archived classes excluded) | Any |
| `GET` | `/class/browse_classes` | List all classes | Any |
| `GET` | `/class/<id>` | Get class details (name, teacher, student count, assignment count) | Teacher / Enrolled Student / Admin |
| `PUT` | `/class/update_class` | Rename a class | Teacher (own class) / Admin |
| `DELETE` | `/class/delete_class` | Delete a class (blocked if students enrolled or assignments exist, unless admin) | Teacher (own class) / Admin |
| `PUT` | `/class/archive_class` | Archive a class so it disappears from the dashboard without being deleted | Teacher (own class) / Admin |
| `POST` | `/class/members` | Get all members of a class | Any |
| `POST` | `/class/enroll_students` | Bulk-enroll students via CSV roster | Teacher |

#### Key Logic – `delete_class` (updated)
Previously, deletion was only blocked when assignments existed. This has been strengthened:
- Teachers can only delete their own classes.
- Deletion is blocked if **any students are enrolled** in the class (returns 400 with a descriptive message).
- Deletion is blocked if **any assignments exist** in the class (returns 400 with a descriptive message).
- In both blocking cases, the teacher is prompted to archive the class instead.
- Admins bypass all restrictions and can delete any class at any time.

#### Key Logic – `archive_class` (new)
- Marks the class as archived (`is_archived = True`) without deleting any data.
- Archived classes no longer appear in the teacher's class list.
- All student enrolment, assignment, and group data is preserved.
- Ownership is enforced — teachers can only archive their own classes. Admins can archive any class.

#### Key Logic – `update_class`
- Validates that the new class name is not a duplicate for the same teacher.
- Admins can rename any class.

#### Key Logic – `enroll_students`
- Accepts a CSV with `id`, `name`, `email` columns.
- Creates new student accounts with secure temporary passwords if the student does not exist.
- Prevents duplicate student IDs within the CSV and in the database.
- Returns a summary of enrolled, created, and already-existing students.

---

### Course Model
**File**: `flask_backend/api/models/course_model.py`

- Added `is_archived` column (`Boolean`, default `False`) to the `Course` table.
- Added `archive()` method — sets `is_archived = True` and commits to the database.
- `get_courses_by_teacher()` now filters out archived courses, so they are automatically hidden from the teacher dashboard.

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
- Assignments have an optional `due_date` (ISO 8601 string). Start date inputs were removed from the creation form to simplify the teacher's workflow.
- `can_modify()` prevents edits or deletion after the due date has passed.
- Students only see assignments where `is_visible_to_students()` returns `True`.

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

Main class dashboard for both teachers and students. Key changes made during this implementation:

- **Inline class name editing** – Teachers can click the edit icon next to the class name to rename it in-place. The pencil emoji was replaced with a proper SVG icon (`edit-tool-pencil-svgrepo-com.svg`) for a cleaner, more professional appearance. Saves via `PUT /class/update_class`.
- **Assignment list** – All assignments are rendered as `AssignmentCard` components. Students only see assignments whose start date has passed.
- **Create assignment form (simplified)** – Visible to teachers only. The start date and end date input fields were removed from the form to reduce unnecessary complexity. Teachers now only provide an assignment name. Submissions use `POST /assignment/create_assignment`.
- **Roster upload** – Teachers can upload a CSV file to bulk-enroll students via `POST /class/enroll_students`. Results are displayed in a `RosterUploadResult` modal.
- **Delete / Archive modal (updated)** – The class management modal was redesigned to present three clearly labelled options:
  - **Cancel** – Dismiss the modal with no action taken.
  - **Archive** – Soft-deletes the class by hiding it from the dashboard while preserving all data. Always available.
  - **Delete** – Permanently removes the class. Disabled (greyed out) when students are enrolled or assignments exist, unless the user is an admin.
  - Student enrolment count is fetched on page load via `GET /class/<id>` and used to determine whether Delete should be enabled.
- **Tab navigation** – Teachers see Home, Members, Groups, and Student Submissions tabs. Students see Home and Members only.

---

### Frontend API Utility
**File**: `frontend/src/util/api.ts`

- Added `archiveClass(classId: number)` — makes a `PUT` request to `/class/archive_class` with the class ID in the request body.

---

### Assignment Detail Page
**File**: `frontend/src/pages/Assignment.tsx`

- Tabs for Members, Groups, and Rubric are preserved and fully functional.
- Each tab routes to its own dedicated page (`AssignmentMembers.tsx`, `AssignmentGroups.tsx`, `AssignmentRubric.tsx`).

---

### Assignment Settings Component
**File**: `frontend/src/components/AssignmentSettings.tsx`

Embedded within the assignment detail page. Allows teachers to:

- **Edit assignment** – Update name, rubric text, and due date.
- **Delete assignment** – Red "Delete Assignment" button in a styled danger zone. Confirms before calling `DELETE /assignment/delete_assignment/<id>` and redirects back to the class page on success.

---

## 🎨 UI / Styling Changes

### Button Component
**File**: `frontend/src/components/Button.tsx`

- Added `style?: React.CSSProperties` prop so that inline styles (such as a red background) are correctly forwarded to the underlying `<button>` element. Previously the prop was silently ignored.

### Delete Button Colour Convention
Red delete buttons (`#dc3545`) are now consistent across the entire application:

| Location | File |
|---|---|
| "Delete Class" button | `ClassHome.tsx` |
| "Delete Selected Group" button | `Group.tsx` |
| `.delete-btn` | `ClassGroupManagement.css` |
| `.delete-file-button` / `.delete-file-button-small` | `AssignmentFileUpload.css` |
| `.delete-button-wrapper button` | `RubricCreator.css` |
| `.danger-zone button` | `AssignmentSettings.css` |

---

## 🔐 Access Control Summary

| Action | Student | Teacher (own class) | Teacher (other class) | Admin |
|--------|---------|--------------------|-----------------------|-------|
| View class details | ✅ (if enrolled) | ✅ | ❌ | ✅ |
| Create class | ❌ | ✅ | ✅ | ✅ |
| Rename class | ❌ | ✅ | ❌ | ✅ |
| Archive class | ❌ | ✅ | ❌ | ✅ |
| Delete class (empty) | ❌ | ✅ | ❌ | ✅ |
| Delete class (with students or assignments) | ❌ | ❌ | ❌ | ✅ |
| View assignments | ✅ (visible only) | ✅ | ❌ | ✅ |
| Create assignment | ❌ | ✅ | ❌ | ❌ |
| Edit assignment | ❌ | ✅ (before due date) | ❌ | ❌ |
| Delete assignment | ❌ | ✅ (before due date) | ❌ | ❌ |

---

## 🧪 Tests

All tests pass. Coverage spans both the new endpoints and the model-level changes introduced during this implementation.

### Test Files

| File | What It Covers |
|---|---|
| `flask_backend/tests/test_classes.py` | Class CRUD, enrolment, access control, archive, and delete-blocking behaviour |
| `flask_backend/tests/test_model.py` | User role logic and Course model (`is_archived` default, `archive()` method) |
| `flask_backend/tests/test_assignments.py` | Assignment creation, editing, deletion, and visibility rules |
| `flask_backend/tests/test_assignment_schema.py` | Marshmallow schema serialisation for assignments |
| `flask_backend/tests/test_course_schema.py` | Marshmallow schema serialisation for courses |

### New Tests Added

The following tests were written specifically to cover the features implemented in this story:

**Archive endpoint (`PUT /class/archive_class`):**
- Teacher successfully archives their own class → 200
- Missing class ID in request body → 400
- Non-existent class ID → 404
- Unauthenticated request → 401
- Student attempts to archive → 403
- Teacher attempts to archive a class they do not own → 403
- Archived class no longer appears in `GET /class/classes`

**Delete class blocking (updated behaviour):**
- Teacher attempts to delete a class with enrolled students → 400
- Teacher attempts to delete a class with existing assignments → 400
- Admin deletes a class with enrolled students → 200 (bypass applies)

**Course model:**
- New `Course` object has `is_archived` set to `False` by default
- Calling `course.archive()` sets `is_archived` to `True` and persists it

Run all tests:
```bash
cd flask_backend
pytest
```
