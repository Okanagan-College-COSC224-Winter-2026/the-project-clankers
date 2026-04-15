"""
Test suite for US30 – Teacher Student Enrollment Management

Covers all three enrollment pathways:
  1. Join-request flow (student requests, teacher approves/rejects)
  2. Direct enrollment via registered-students list (registered_students + enroll_direct)
  3. Unenrollment (DELETE /class/<id>/members/<student_id>)

Edge cases: idempotency, access control, search filtering, non-student guard,
            cross-course isolation, already-enrolled re-request guard.
"""

import json

from werkzeug.security import generate_password_hash

from api.models import (
    Course,
    EnrollmentRequest,
    User,
    User_Course,
    db,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client, email, password):
    return client.post(
        "/auth/login",
        data=json.dumps({"email": email, "password": password}),
        headers={"Content-Type": "application/json"},
    )


def _make_user(name, email, role="student", student_id=None):
    u = User(
        name=name,
        email=email,
        hash_pass=generate_password_hash("password"),
        role=role,
        student_id=student_id,
    )
    db.session.add(u)
    return u


def _make_course(teacher_id, name):
    c = Course(teacherID=teacher_id, name=name)
    db.session.add(c)
    return c


# ---------------------------------------------------------------------------
# Registered-students listing  (GET /class/<id>/registered_students)
# ---------------------------------------------------------------------------

def test_registered_students_excludes_already_enrolled(test_client):
    """Enrolled students do not appear in the registered_students list."""
    teacher = _make_user("Teacher RS1", "teacher-rs1@us30.test", role="teacher")
    enrolled = _make_user("Enrolled S", "enrolled-s@us30.test", student_id="RS101")
    unenrolled = _make_user("Free S", "free-s@us30.test", student_id="RS102")
    db.session.flush()

    course = _make_course(teacher.id, "RS Course 1")
    db.session.flush()

    db.session.add(User_Course(userID=enrolled.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "teacher-rs1@us30.test", "password")
    resp = test_client.get(f"/class/{course.id}/registered_students")
    assert resp.status_code == 200

    # Endpoint returns a JSON array directly
    ids = [s["id"] for s in resp.get_json()]
    assert enrolled.id not in ids
    assert unenrolled.id in ids


def test_registered_students_search_filter_by_name(test_client):
    """?search= filters registered students by name or email."""
    teacher = _make_user("Teacher RS2", "teacher-rs2@us30.test", role="teacher")
    alice = _make_user("Alice Smith", "alice-rs@us30.test", student_id="RS201")
    bob = _make_user("Bob Jones", "bob-rs@us30.test", student_id="RS202")
    db.session.flush()

    course = _make_course(teacher.id, "RS Course 2")
    db.session.commit()

    _login(test_client, "teacher-rs2@us30.test", "password")
    resp = test_client.get(f"/class/{course.id}/registered_students?search=alice")
    assert resp.status_code == 200

    # Endpoint returns a JSON array directly
    ids = [s["id"] for s in resp.get_json()]
    assert alice.id in ids
    assert bob.id not in ids


def test_registered_students_search_filter_by_student_id(test_client):
    """?search= also matches on student_id field."""
    teacher = _make_user("Teacher RS3", "teacher-rs3@us30.test", role="teacher")
    target = _make_user("Target Student", "target-rs@us30.test", student_id="FINDME99")
    other = _make_user("Other Student", "other-rs@us30.test", student_id="OTHER00")
    db.session.flush()

    course = _make_course(teacher.id, "RS Course 3")
    db.session.commit()

    _login(test_client, "teacher-rs3@us30.test", "password")
    resp = test_client.get(f"/class/{course.id}/registered_students?search=FINDME99")
    assert resp.status_code == 200

    # Endpoint returns a JSON array directly
    ids = [s["id"] for s in resp.get_json()]
    assert target.id in ids
    assert other.id not in ids


def test_registered_students_requires_teacher(test_client):
    """Non-teacher users receive 403 when accessing registered_students."""
    teacher = _make_user("Teacher RS4", "teacher-rs4@us30.test", role="teacher")
    student = _make_user("Student RS4", "student-rs4@us30.test", student_id="RS401")
    db.session.flush()

    course = _make_course(teacher.id, "RS Course 4")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "student-rs4@us30.test", "password")
    resp = test_client.get(f"/class/{course.id}/registered_students")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Direct enrollment  (POST /class/<id>/enroll_direct)
# ---------------------------------------------------------------------------

def test_enroll_direct_single_student(test_client):
    """Teacher can directly enroll a single registered student."""
    teacher = _make_user("Teacher ED1", "teacher-ed1@us30.test", role="teacher")
    student = _make_user("Student ED1", "student-ed1@us30.test", student_id="ED101")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 1")
    db.session.commit()

    _login(test_client, "teacher-ed1@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [student.id]}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["enrolled_count"] == 1
    assert payload["already_enrolled_count"] == 0

    # Confirm DB enrollment
    assert User_Course.query.filter_by(userID=student.id, courseID=course.id).first() is not None


def test_enroll_direct_bulk_students(test_client):
    """Teacher can directly enroll multiple students in one request."""
    teacher = _make_user("Teacher ED2", "teacher-ed2@us30.test", role="teacher")
    s1 = _make_user("Student ED2a", "s1-ed2@us30.test", student_id="ED201")
    s2 = _make_user("Student ED2b", "s2-ed2@us30.test", student_id="ED202")
    s3 = _make_user("Student ED2c", "s3-ed2@us30.test", student_id="ED203")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 2")
    db.session.commit()

    _login(test_client, "teacher-ed2@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [s1.id, s2.id, s3.id]}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["enrolled_count"] == 3


def test_enroll_direct_is_idempotent(test_client):
    """Enrolling an already-enrolled student does not create a duplicate,
    and the response correctly counts already_enrolled."""
    teacher = _make_user("Teacher ED3", "teacher-ed3@us30.test", role="teacher")
    student = _make_user("Student ED3", "student-ed3@us30.test", student_id="ED301")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 3")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "teacher-ed3@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [student.id]}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["enrolled_count"] == 0
    assert payload["already_enrolled_count"] == 1

    # Ensure no duplicate row exists
    count = User_Course.query.filter_by(userID=student.id, courseID=course.id).count()
    assert count == 1


def test_enroll_direct_skips_non_existent_ids(test_client):
    """Invalid / non-existent IDs increment not_found_count without crashing."""
    teacher = _make_user("Teacher ED4", "teacher-ed4@us30.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 4")
    db.session.commit()

    nonexistent_id = 999888777

    _login(test_client, "teacher-ed4@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [nonexistent_id]}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["not_found_count"] == 1


def test_enroll_direct_rejects_teacher_ids(test_client):
    """Attempting to directly enroll a teacher (non-student) is rejected
    and counts as not_found or returns an error — teacher IDs must not be enrolled."""
    teacher = _make_user("Teacher ED5", "teacher-ed5@us30.test", role="teacher")
    other_teacher = _make_user("Other Teacher ED5", "other-t-ed5@us30.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 5")
    db.session.commit()

    _login(test_client, "teacher-ed5@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [other_teacher.id]}),
        headers={"Content-Type": "application/json"},
    )
    # Either a 400 error or a 200 with not_found_count>=1 — non-students must not be enrolled
    if resp.status_code == 200:
        payload = resp.get_json()
        assert payload.get("enrolled_count", 0) == 0
        assert User_Course.query.filter_by(
            userID=other_teacher.id, courseID=course.id
        ).first() is None
    else:
        assert resp.status_code == 400


def test_enroll_direct_empty_list_returns_error(test_client):
    """Sending an empty student_ids list returns 400."""
    teacher = _make_user("Teacher ED6", "teacher-ed6@us30.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 6")
    db.session.commit()

    _login(test_client, "teacher-ed6@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": []}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_enroll_direct_requires_teacher(test_client):
    """Students cannot use the enroll_direct endpoint."""
    teacher = _make_user("Teacher ED7", "teacher-ed7@us30.test", role="teacher")
    student = _make_user("Student ED7", "student-ed7@us30.test", student_id="ED701")
    other_s = _make_user("Other S ED7", "other-s-ed7@us30.test", student_id="ED702")
    db.session.flush()

    course = _make_course(teacher.id, "Enroll Direct 7")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "student-ed7@us30.test", "password")
    resp = test_client.post(
        f"/class/{course.id}/enroll_direct",
        data=json.dumps({"student_ids": [other_s.id]}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Unenrollment  (DELETE /class/<id>/members/<student_id>)
# ---------------------------------------------------------------------------

def test_unenroll_student_removes_enrollment(test_client):
    """Teacher can remove a student from a course."""
    teacher = _make_user("Teacher UN1", "teacher-un1@us30.test", role="teacher")
    student = _make_user("Student UN1", "student-un1@us30.test", student_id="UN101")
    db.session.flush()

    course = _make_course(teacher.id, "Unenroll Course 1")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "teacher-un1@us30.test", "password")
    resp = test_client.delete(f"/class/{course.id}/members/{student.id}")
    assert resp.status_code == 200

    assert User_Course.query.filter_by(userID=student.id, courseID=course.id).first() is None


def test_unenroll_nonexistent_student_returns_404(test_client):
    """Unenrolling a student not in the course returns 404."""
    teacher = _make_user("Teacher UN2", "teacher-un2@us30.test", role="teacher")
    student = _make_user("Student UN2", "student-un2@us30.test", student_id="UN201")
    db.session.flush()

    course = _make_course(teacher.id, "Unenroll Course 2")
    db.session.commit()

    # student was never enrolled
    _login(test_client, "teacher-un2@us30.test", "password")
    resp = test_client.delete(f"/class/{course.id}/members/{student.id}")
    assert resp.status_code == 404


def test_unenroll_requires_teacher(test_client):
    """Non-teacher cannot unenroll a student."""
    teacher = _make_user("Teacher UN3", "teacher-un3@us30.test", role="teacher")
    student = _make_user("Student UN3", "student-un3@us30.test", student_id="UN301")
    db.session.flush()

    course = _make_course(teacher.id, "Unenroll Course 3")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "student-un3@us30.test", "password")
    resp = test_client.delete(f"/class/{course.id}/members/{student.id}")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Join-request flow (enrollment_controller)
# ---------------------------------------------------------------------------

def test_already_enrolled_cannot_submit_join_request(test_client):
    """A student already enrolled in a course cannot submit a new join request."""
    teacher = _make_user("Teacher JR1", "teacher-jr1@us30.test", role="teacher")
    student = _make_user("Student JR1", "student-jr1@us30.test", student_id="JR101")
    db.session.flush()

    course = _make_course(teacher.id, "Join Req Course 1")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "student-jr1@us30.test", "password")
    resp = test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course.id}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_wrong_teacher_cannot_approve_join_request(test_client):
    """A teacher of a different course cannot approve someone else's join request."""
    owner_teacher = _make_user("Owner T JR2", "owner-t-jr2@us30.test", role="teacher")
    other_teacher = _make_user("Other T JR2", "other-t-jr2@us30.test", role="teacher")
    student = _make_user("Student JR2", "student-jr2@us30.test", student_id="JR201")
    db.session.flush()

    course = _make_course(owner_teacher.id, "Course JR2")
    db.session.commit()

    # Student requests
    _login(test_client, "student-jr2@us30.test", "password")
    req_resp = test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course.id}),
        headers={"Content-Type": "application/json"},
    )
    assert req_resp.status_code == 201
    request_id = req_resp.get_json()["request"]["id"]

    # Other teacher tries to approve
    _login(test_client, "other-t-jr2@us30.test", "password")
    approve_resp = test_client.post(f"/enrollments/{request_id}/approve")
    assert approve_resp.status_code == 403


def test_course_specific_enrollment_requests_filtered(test_client):
    """GET /enrollments/course/<id>/requests returns only requests for that course."""
    teacher = _make_user("Teacher JR3", "teacher-jr3@us30.test", role="teacher")
    student_a = _make_user("Student JR3a", "student-jr3a@us30.test", student_id="JR301")
    student_b = _make_user("Student JR3b", "student-jr3b@us30.test", student_id="JR302")
    db.session.flush()

    course_x = _make_course(teacher.id, "Course JR3 X")
    course_y = _make_course(teacher.id, "Course JR3 Y")
    db.session.commit()

    # student_a joins course_x, student_b joins course_y
    _login(test_client, "student-jr3a@us30.test", "password")
    test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course_x.id}),
        headers={"Content-Type": "application/json"},
    )

    _login(test_client, "student-jr3b@us30.test", "password")
    test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course_y.id}),
        headers={"Content-Type": "application/json"},
    )

    # Teacher queries course_x-specific requests
    _login(test_client, "teacher-jr3@us30.test", "password")
    resp = test_client.get(f"/enrollments/course/{course_x.id}/requests")
    assert resp.status_code == 200

    # Endpoint returns a JSON array (schema dump) directly
    requests_list = resp.get_json()
    course_ids = {r["courseID"] for r in requests_list}
    assert course_ids == {course_x.id}
    requester_ids = {r["studentID"] for r in requests_list}
    assert student_a.id in requester_ids
    assert student_b.id not in requester_ids


def test_teacher_can_reject_with_notes(test_client):
    """Teacher can reject a join request and supply rejection notes."""
    teacher = _make_user("Teacher JR4", "teacher-jr4@us30.test", role="teacher")
    student = _make_user("Student JR4", "student-jr4@us30.test", student_id="JR401")
    db.session.flush()

    course = _make_course(teacher.id, "Course JR4")
    db.session.commit()

    _login(test_client, "student-jr4@us30.test", "password")
    req_resp = test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course.id}),
        headers={"Content-Type": "application/json"},
    )
    request_id = req_resp.get_json()["request"]["id"]

    _login(test_client, "teacher-jr4@us30.test", "password")
    rej_resp = test_client.post(
        f"/enrollments/{request_id}/reject",
        data=json.dumps({"notes": "Full course capacity"}),
        headers={"Content-Type": "application/json"},
    )
    assert rej_resp.status_code == 200
    payload = rej_resp.get_json()
    assert payload["request"]["status"] == "rejected"
    # Rejection notes are stored/returned as teacher_notes
    assert payload["request"]["teacher_notes"] == "Full course capacity"

    # Student should not be enrolled
    assert User_Course.query.filter_by(userID=student.id, courseID=course.id).first() is None


def test_enrollments_request_requires_student_role(test_client):
    """A teacher cannot submit a join request."""
    teacher = _make_user("Teacher JR5", "teacher-jr5@us30.test", role="teacher")
    other_teacher = _make_user("Other T JR5", "other-t-jr5@us30.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Course JR5")
    db.session.commit()

    _login(test_client, "other-t-jr5@us30.test", "password")
    resp = test_client.post(
        "/enrollments/request",
        data=json.dumps({"course_id": course.id}),
        headers={"Content-Type": "application/json"},
    )
    # Teachers should not be allowed to request enrollment
    assert resp.status_code in (400, 403)
