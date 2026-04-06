# User Story Implementation Breakdown: US5, US20, US30

## User Story 5 — Grade Book and Student Progress Dashboard

**Summary:** Teachers can view a full grade matrix for their course, drill down into per-student detail, set grading policies, and override individual assignment grades or a student's course total.

### Endpoints implemented

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/class/<id>/gradebook` | Teacher (own course) | Full matrix: all students × all assignments + course totals |
| `GET` | `/class/<id>/gradebook/student/<student_id>` | Teacher or own student | Per-student detail with received peer-review grades |
| `PUT` | `/class/<id>/gradebook/policy` | Teacher | Set late / incomplete-evaluation penalty percentages (0–100) |
| `PUT` | `/class/<id>/gradebook/overrides` | Teacher | Set or clear an assignment-level grade override for one student |
| `PUT` | `/class/<id>/gradebook/course-total-overrides` | Teacher | Set or clear a course-total override for one student |

### Key implementation details (`flask_backend/api/controllers/gradebook_controller.py`)

- **`_grade_entry()`** — computes the effective grade for one student/assignment. Priority order: `CourseTotalOverride` → `GradeOverride` → computed average of `Criterion` scores from all reviews. Returns `grade_source` as `"override"`, `"computed"`, or `"pending"`.
- **`_effective_course_total()`** — first checks for a `CourseTotalOverride`, falls back to the average of all `effective_grade` values. Returns `{"effective": ..., "source": "<override|computed>"}`.
- **`get_gradebook()`** — teacher-only; builds the full N×M matrix plus aggregates (class averages per assignment, per-student course totals).
- **`get_student_gradebook_detail()`** — teacher or the student themselves; includes `received_reviews` (reviewer IDs + individual criterion grades).
- **`update_gradebook_policy()`** — validates that both penalty fields are in `[0, 100]`; returns `400` if out of range or if neither field is supplied.
- **`upsert_grade_override()`** — `override_grade: null` triggers a delete of the existing `GradeOverride` row, reverting to the computed grade.
- **`upsert_course_total_override()`** — `override_total: null` deletes the `CourseTotalOverride` row; value must be `0–100`.

### Models touched

- `GradeOverride` — per-student per-assignment manual grade
- `CourseTotalOverride` — per-student manual course total
- `CourseGradePolicy` — late and incomplete-evaluation penalty percentages per course
- `Review`, `Criterion`, `CriteriaDescription` — source of computed grades

---

## User Story 20 — Student Course Grade on Course Card

**Summary:** Enrolled students can view their own computed (or overridden) course grade and per-assignment breakdown without accessing the full teacher gradebook.

### Endpoint implemented

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/class/<id>/my-grade` | Enrolled student (own grade) | Returns `course_total_grade`, `status`, and `assignments[]` |

### Response shape

```json
{
  "class": { "id": 1, "name": "..." },
  "student": { "id": 2, "name": "..." },
  "course_total_grade": 85.5,
  "status": "available",
  "course_total": { "effective": 85.5, "source": "computed" },
  "assignments": [
    {
      "assignment_id": 1,
      "name": "...",
      "effective_grade": 85.5,
      "grade_source": "computed",
      "submission_status": "submitted"
    }
  ]
}
```

- `status` is `"pending evaluations"` when no reviews exist for any assignment; otherwise `"available"`.
- `course_total_grade` is `null` when all assignments are still pending.
- `grade_source` per assignment is `"override"`, `"computed"`, or `"pending"`.

### Access control

- Only works for students enrolled in the course (`_ensure_course_access` returns `403` for unenrolled or non-student users).
- Teachers/admins may use an optional `?student_id=<id>` query parameter.

---

## User Story 30 — Teacher Student Enrollment Management

**Summary:** Teachers have three pathways to manage who is in their course: approving/rejecting student join requests, directly enrolling registered students (individually or in bulk), and removing students.

### Enrollment pathway 1: Join-request flow (`flask_backend/api/controllers/enrollment_controller.py`)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/enrollments/request` | Student | Submit a join request for a course |
| `GET` | `/enrollments/teacher/requests` | Teacher | All pending requests across all teacher's courses |
| `GET` | `/enrollments/course/<id>/requests` | Teacher (own course) | Pending requests for one specific course |
| `POST` | `/enrollments/<id>/approve` | Teacher (own course) | Approve → creates `User_Course`, notifies student |
| `POST` | `/enrollments/<id>/reject` | Teacher (own course) | Reject with optional `notes` → stored as `teacher_notes`, notifies student |

**Guards:**
- Only students may submit requests; `403` for teachers.
- Already-enrolled students cannot re-request (`400`).
- Duplicate pending requests are blocked (`400`).
- A teacher of a different course cannot approve/reject (`403`).

### Enrollment pathway 2: Direct enrollment (`flask_backend/api/controllers/class_controller.py`)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/class/<id>/registered_students` | Teacher | Lists all students **not yet enrolled**; supports `?search=` filter by name, email, or student ID |
| `POST` | `/class/<id>/enroll_direct` | Teacher | Bulk-enroll by `{"student_ids": [...]}` — idempotent; returns `enrolled_count`, `already_enrolled_count`, `not_found_count` |

**Guards:**
- Empty `student_ids` list → `400`.
- Non-existent or non-student IDs increments `not_found_count` rather than crashing.
- Already-enrolled IDs are counted in `already_enrolled_count` and skipped (no duplicate rows).

### Enrollment pathway 3: Unenrollment (`flask_backend/api/controllers/class_controller.py`)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `DELETE` | `/class/<id>/members/<student_id>` | Teacher | Remove student from course; `404` if not enrolled |

---

## Test Coverage Added

### `flask_backend/tests/test_us5_us20_gradebook.py` (16 new tests)

| Test | US | What it verifies |
|------|----|-----------------|
| `test_student_detail_shows_received_reviews` | US5 | Teacher sees per-student detail with reviewer IDs and grades |
| `test_student_detail_access_denied_for_other_student` | US5 | Student A cannot view Student B's detail (403) |
| `test_student_can_view_own_detail` | US5 | Student can view their own detail (200) |
| `test_gradebook_access_denied_for_wrong_teacher` | US5 | Different teacher cannot access gradebook (403) |
| `test_gradebook_pending_when_no_reviews` | US5 | Submission with zero reviews → `effective_grade=null`, `grade_source="pending"` |
| `test_course_total_override_upsert_and_clear` | US5 | Override sets total; clearing restores computed average |
| `test_course_total_override_out_of_range_rejected` | US5 | `override_total > 100` → 400 |
| `test_clearing_grade_override_reverts_to_computed` | US5 | `override_grade=null` removes override, restores computed |
| `test_policy_update_rejects_out_of_range_values` | US5 | Negative and >100 penalty values → 400 |
| `test_policy_update_with_no_fields_returns_400` | US5 | Empty policy body → 400 |
| `test_student_detail_404_for_unenrolled` | US5 | Detail for a non-enrolled student → 404 |
| `test_my_grade_returns_pending_when_no_reviews` | US20 | No reviews → `course_total_grade=null`, `status="pending evaluations"` |
| `test_my_grade_returns_computed_grade_from_reviews` | US20 | Two reviews averaged correctly; `grade_source="computed"` |
| `test_my_grade_reflects_instructor_override` | US20 | Assignment override visible in student's `/my-grade`; `grade_source="override"` |
| `test_my_grade_updates_after_new_review_submitted` | US20 | Grade recalculates after additional review added |
| `test_my_grade_denied_for_unenrolled_student` | US20 | Unenrolled student cannot access `/my-grade` (403/404) |
| `test_my_grade_with_course_total_override` | US20 | Course-total override reflected in `/my-grade`; `source="override"` |

### `flask_backend/tests/test_us30_enrollment_management.py` (20 new tests)

| Test | Pathway | What it verifies |
|------|---------|-----------------|
| `test_registered_students_excludes_already_enrolled` | Direct | Enrolled student absent from list |
| `test_registered_students_search_filter_by_name` | Direct | `?search=` filters by name |
| `test_registered_students_search_filter_by_student_id` | Direct | `?search=` filters by student_id field |
| `test_registered_students_requires_teacher` | Direct | Student gets 403 |
| `test_enroll_direct_single_student` | Direct | Single enroll creates `User_Course` row |
| `test_enroll_direct_bulk_students` | Direct | 3 students enrolled in one request |
| `test_enroll_direct_is_idempotent` | Direct | Already-enrolled counted, no duplicate row |
| `test_enroll_direct_skips_non_existent_ids` | Direct | Bad ID increments `not_found_count` |
| `test_enroll_direct_rejects_teacher_ids` | Direct | Teacher ID not enrolled |
| `test_enroll_direct_empty_list_returns_error` | Direct | Empty list → 400 |
| `test_enroll_direct_requires_teacher` | Direct | Student caller gets 403 |
| `test_unenroll_student_removes_enrollment` | Unenroll | `User_Course` row deleted |
| `test_unenroll_nonexistent_student_returns_404` | Unenroll | Not enrolled → 404 |
| `test_unenroll_requires_teacher` | Unenroll | Student caller gets 403 |
| `test_already_enrolled_cannot_submit_join_request` | Join | Already enrolled → 400 |
| `test_wrong_teacher_cannot_approve_join_request` | Join | Cross-course approval → 403 |
| `test_course_specific_enrollment_requests_filtered` | Join | Course filter contains only that course's requests |
| `test_teacher_can_reject_with_notes` | Join | Rejection with notes stored in `teacher_notes`; student not enrolled |
| `test_enrollments_request_requires_student_role` | Join | Teacher submitting request → 400 or 403 |
