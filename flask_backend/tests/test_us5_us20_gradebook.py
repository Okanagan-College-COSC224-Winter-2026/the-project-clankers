"""
Test suite for US5 – Grade Book and Student Progress Dashboard
             US20 – Student Course Grade on Course Card

Tests cover:
  US5 – Per-student detail view, course-total override, policy validation,
         access control (unauthorised/wrong teacher), no-grade pending state,
         clearing an override, student-detail received reviews.
  US20 – /my-grade happy path, pending state when no reviews exist,
          grade reflects override, course-total pending status field.
"""

import json
from datetime import datetime, timedelta, timezone

from werkzeug.security import generate_password_hash

from api.models import (
    Assignment,
    Course,
    CourseTotalOverride,
    CriteriaDescription,
    Criterion,
    GradeOverride,
    Review,
    Rubric,
    StudentSubmission,
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


def _make_assignment(course_id, name, external_review=True, due_date=None):
    a = Assignment(
        courseID=course_id,
        name=name,
        rubric_text="",
        submission_type="individual",
        external_review=external_review,
        due_date=due_date,
    )
    db.session.add(a)
    return a


def _make_rubric_criteria(assignment_id, score_max=100):
    rubric = Rubric(assignmentID=assignment_id)
    db.session.add(rubric)
    db.session.flush()
    criteria = CriteriaDescription(
        rubricID=rubric.id, question="Quality", scoreMax=score_max, hasScore=True
    )
    db.session.add(criteria)
    db.session.flush()
    return criteria


def _add_review(assignment_id, reviewer_id, reviewee_id, criteria_id, grade):
    review = Review(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewer_type="user",
        reviewee_type="user",
    )
    db.session.add(review)
    db.session.flush()
    db.session.add(
        Criterion(reviewID=review.id, criterionRowID=criteria_id, grade=grade, comments="")
    )
    db.session.flush()
    return review


# ---------------------------------------------------------------------------
# US5: Student-level gradebook detail
# ---------------------------------------------------------------------------

def test_student_detail_shows_received_reviews(test_client):
    """Teacher can fetch per-student detail including all received review grades."""
    teacher = _make_user("Teacher Det", "teacher-det@gb.test", role="teacher")
    student = _make_user("Student Det", "student-det@gb.test", student_id="DET01")
    reviewer = _make_user("Reviewer Det", "reviewer-det@gb.test", student_id="DET02")
    db.session.flush()

    course = _make_course(teacher.id, "Detail Course")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "Detail Assign", external_review=True)
    db.session.flush()

    criteria = _make_rubric_criteria(assignment.id, score_max=100)

    _add_review(assignment.id, reviewer.id, student.id, criteria.id, 80)
    db.session.commit()

    _login(test_client, "teacher-det@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook/student/{student.id}")
    assert resp.status_code == 200

    payload = resp.get_json()
    assert payload["student"]["id"] == student.id
    assert len(payload["assignments"]) == 1
    assert payload["assignments"][0]["effective_grade"] == 80.0
    received = payload["assignments"][0]["received_reviews"]
    assert len(received) == 1
    assert received[0]["grade"] == 80.0
    assert received[0]["reviewer_id"] == reviewer.id


def test_student_detail_access_denied_for_other_student(test_client):
    """A student cannot view another student's gradebook detail."""
    teacher = _make_user("Teacher Priv", "teacher-priv@gb.test", role="teacher")
    student_a = _make_user("Student A", "student-a-priv@gb.test", student_id="PRIV01")
    student_b = _make_user("Student B", "student-b-priv@gb.test", student_id="PRIV02")
    db.session.flush()

    course = _make_course(teacher.id, "Privacy Course")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student_a.id, courseID=course.id),
        User_Course(userID=student_b.id, courseID=course.id),
    ])
    db.session.commit()

    _login(test_client, "student-a-priv@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook/student/{student_b.id}")
    assert resp.status_code == 403


def test_student_can_view_own_detail(test_client):
    """A student can view their own gradebook detail."""
    teacher = _make_user("Teacher Own", "teacher-own@gb.test", role="teacher")
    student = _make_user("Student Own", "student-own@gb.test", student_id="OWN01")
    db.session.flush()

    course = _make_course(teacher.id, "Own Course")
    db.session.flush()

    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.flush()

    _make_assignment(course.id, "Own Assign")
    db.session.commit()

    _login(test_client, "student-own@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook/student/{student.id}")
    assert resp.status_code == 200


def test_gradebook_access_denied_for_wrong_teacher(test_client):
    """A teacher cannot view the gradebook of someone else's course."""
    owner = _make_user("Owner Teacher", "owner-t@gb.test", role="teacher")
    other = _make_user("Other Teacher", "other-t@gb.test", role="teacher")
    db.session.flush()

    course = _make_course(owner.id, "Owner Course")
    db.session.commit()

    _login(test_client, "other-t@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook")
    assert resp.status_code == 403


def test_gradebook_pending_when_no_reviews(test_client):
    """A student with a submission but zero reviews shows effective_grade as None (pending)."""
    teacher = _make_user("Teacher Pend", "teacher-pend@gb.test", role="teacher")
    student = _make_user("Student Pend", "student-pend@gb.test", student_id="PEND01")
    db.session.flush()

    course = _make_course(teacher.id, "Pending Course")
    db.session.flush()

    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.flush()

    assignment = _make_assignment(course.id, "Pending Assign", external_review=False)
    db.session.flush()

    db.session.add(StudentSubmission(
        assignment_id=assignment.id,
        student_id=student.id,
        filename="work.pdf",
        file_path="work.pdf",
    ))
    db.session.commit()

    _login(test_client, "teacher-pend@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook")
    assert resp.status_code == 200

    payload = resp.get_json()
    row = payload["students"][0]
    entry = row["assignments"][0]
    assert entry["submission_status"] == "submitted"
    assert entry["effective_grade"] is None
    assert entry["grade_source"] == "pending"


# ---------------------------------------------------------------------------
# US5: Course-total override
# ---------------------------------------------------------------------------

def test_course_total_override_upsert_and_clear(test_client):
    """Teacher can set a course-total override, which is reflected in the gradebook,
    and then clear it to restore the computed total."""
    teacher = _make_user("Teacher CTO", "teacher-cto@gb.test", role="teacher")
    student = _make_user("Student CTO", "student-cto@gb.test", student_id="CTO01")
    reviewer = _make_user("Reviewer CTO", "reviewer-cto@gb.test", student_id="CTO02")
    db.session.flush()

    course = _make_course(teacher.id, "CTO Course")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "CTO Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id)
    _add_review(assignment.id, reviewer.id, student.id, criteria.id, 60)
    db.session.commit()

    _login(test_client, "teacher-cto@gb.test", "password")

    # Set override
    resp = test_client.put(
        f"/class/{course.id}/gradebook/course-total-overrides",
        data=json.dumps({"student_id": student.id, "override_total": 95, "reason": "Adjustment"}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200

    # Verify override is reflected in gradebook
    gb_resp = test_client.get(f"/class/{course.id}/gradebook")
    assert gb_resp.status_code == 200
    row = next(r for r in gb_resp.get_json()["students"] if r["student_id"] == student.id)
    assert row["course_total_grade"] == 95.0
    assert row["course_total"]["source"] == "override"

    # Clear override — course total should revert to computed (60)
    clear_resp = test_client.put(
        f"/class/{course.id}/gradebook/course-total-overrides",
        data=json.dumps({"student_id": student.id, "override_total": None}),
        headers={"Content-Type": "application/json"},
    )
    assert clear_resp.status_code == 200

    gb_resp2 = test_client.get(f"/class/{course.id}/gradebook")
    row2 = next(r for r in gb_resp2.get_json()["students"] if r["student_id"] == student.id)
    assert row2["course_total_grade"] == 60.0
    assert row2["course_total"]["source"] == "computed"


def test_course_total_override_out_of_range_rejected(test_client):
    """override_total values outside 0–100 are rejected with 400."""
    teacher = _make_user("Teacher CTOR", "teacher-ctor@gb.test", role="teacher")
    student = _make_user("Student CTOR", "student-ctor@gb.test", student_id="CTOR01")
    db.session.flush()

    course = _make_course(teacher.id, "CTOR Course")
    db.session.flush()
    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.commit()

    _login(test_client, "teacher-ctor@gb.test", "password")
    resp = test_client.put(
        f"/class/{course.id}/gradebook/course-total-overrides",
        data=json.dumps({"student_id": student.id, "override_total": 150}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# US5: Grade override – clear (delete) path
# ---------------------------------------------------------------------------

def test_clearing_grade_override_reverts_to_computed(test_client):
    """Sending override_grade=null removes the override and restores the computed grade."""
    teacher = _make_user("Teacher Clr", "teacher-clr@gb.test", role="teacher")
    student = _make_user("Student Clr", "student-clr@gb.test", student_id="CLR01")
    reviewer = _make_user("Reviewer Clr", "reviewer-clr@gb.test", student_id="CLR02")
    db.session.flush()

    course = _make_course(teacher.id, "Clear Course")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "Clear Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id)
    _add_review(assignment.id, reviewer.id, student.id, criteria.id, 70)
    db.session.commit()

    _login(test_client, "teacher-clr@gb.test", "password")

    # Apply an override
    test_client.put(
        f"/class/{course.id}/gradebook/overrides",
        data=json.dumps({
            "assignment_id": assignment.id,
            "student_id": student.id,
            "override_grade": 50,
        }),
        headers={"Content-Type": "application/json"},
    )

    # Clear the override
    clear_resp = test_client.put(
        f"/class/{course.id}/gradebook/overrides",
        data=json.dumps({
            "assignment_id": assignment.id,
            "student_id": student.id,
            "override_grade": None,
        }),
        headers={"Content-Type": "application/json"},
    )
    assert clear_resp.status_code == 200
    assert clear_resp.get_json()["msg"] == "Grade override cleared"

    # Confirm computed grade (70) is now effective
    gb_resp = test_client.get(f"/class/{course.id}/gradebook")
    row = next(r for r in gb_resp.get_json()["students"] if r["student_id"] == student.id)
    assert row["assignments"][0]["effective_grade"] == 70.0
    assert row["assignments"][0]["grade_source"] == "computed"


# ---------------------------------------------------------------------------
# US5: Policy validation
# ---------------------------------------------------------------------------

def test_policy_update_rejects_out_of_range_values(test_client):
    """Policy values outside 0–100 return 400."""
    teacher = _make_user("Teacher PV", "teacher-pv@gb.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Policy Val Course")
    db.session.commit()

    _login(test_client, "teacher-pv@gb.test", "password")

    resp = test_client.put(
        f"/class/{course.id}/gradebook/policy",
        data=json.dumps({"late_penalty_percent": -5}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400

    resp2 = test_client.put(
        f"/class/{course.id}/gradebook/policy",
        data=json.dumps({"incomplete_evaluation_penalty_percent": 110}),
        headers={"Content-Type": "application/json"},
    )
    assert resp2.status_code == 400


def test_policy_update_with_no_fields_returns_400(test_client):
    """Sending an empty body to the policy endpoint returns 400."""
    teacher = _make_user("Teacher PE", "teacher-pe@gb.test", role="teacher")
    db.session.flush()

    course = _make_course(teacher.id, "Policy Empty Course")
    db.session.commit()

    _login(test_client, "teacher-pe@gb.test", "password")

    resp = test_client.put(
        f"/class/{course.id}/gradebook/policy",
        data=json.dumps({}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# US5: Single-student gradebook detail for unenrolled student
# ---------------------------------------------------------------------------

def test_student_detail_404_for_unenrolled(test_client):
    """Detail endpoint returns 404 when the student is not enrolled."""
    teacher = _make_user("Teacher UE", "teacher-ue@gb.test", role="teacher")
    student = _make_user("Student UE", "student-ue@gb.test", student_id="UE01")
    db.session.flush()

    course = _make_course(teacher.id, "UE Course")
    db.session.commit()

    # student NOT enrolled in course
    _login(test_client, "teacher-ue@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/gradebook/student/{student.id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# US20: /my-grade endpoint
# ---------------------------------------------------------------------------

def test_my_grade_returns_pending_when_no_reviews(test_client):
    """Student's course grade is pending when no peer reviews have been submitted."""
    teacher = _make_user("Teacher MG1", "teacher-mg1@gb.test", role="teacher")
    student = _make_user("Student MG1", "student-mg1@gb.test", student_id="MG101")
    db.session.flush()

    course = _make_course(teacher.id, "My Grade Course 1")
    db.session.flush()

    db.session.add(User_Course(userID=student.id, courseID=course.id))
    db.session.flush()

    _make_assignment(course.id, "MG1 Assign", external_review=True)
    db.session.commit()

    _login(test_client, "student-mg1@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/my-grade")
    assert resp.status_code == 200

    payload = resp.get_json()
    assert payload["course_total_grade"] is None
    assert payload["status"] == "pending evaluations"


def test_my_grade_returns_computed_grade_from_reviews(test_client):
    """Student's /my-grade reflects the average of all peer review grades."""
    teacher = _make_user("Teacher MG2", "teacher-mg2@gb.test", role="teacher")
    student = _make_user("Student MG2", "student-mg2@gb.test", student_id="MG201")
    reviewer1 = _make_user("Reviewer MG2a", "reviewer-mg2a@gb.test", student_id="MG202")
    reviewer2 = _make_user("Reviewer MG2b", "reviewer-mg2b@gb.test", student_id="MG203")
    db.session.flush()

    course = _make_course(teacher.id, "My Grade Course 2")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer1.id, courseID=course.id),
        User_Course(userID=reviewer2.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "MG2 Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id, score_max=100)

    # Two reviews: 80 and 100 → average 90
    _add_review(assignment.id, reviewer1.id, student.id, criteria.id, 80)
    _add_review(assignment.id, reviewer2.id, student.id, criteria.id, 100)
    db.session.commit()

    _login(test_client, "student-mg2@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/my-grade")
    assert resp.status_code == 200

    payload = resp.get_json()
    assert payload["course_total_grade"] == 90.0
    assert payload["status"] == "available"
    assert payload["assignments"][0]["effective_grade"] == 90.0
    assert payload["assignments"][0]["grade_source"] == "computed"


def test_my_grade_reflects_instructor_override(test_client):
    """Student's /my-grade shows the overridden grade when instructor overrides it."""
    teacher = _make_user("Teacher MG3", "teacher-mg3@gb.test", role="teacher")
    student = _make_user("Student MG3", "student-mg3@gb.test", student_id="MG301")
    reviewer = _make_user("Reviewer MG3", "reviewer-mg3@gb.test", student_id="MG302")
    db.session.flush()

    course = _make_course(teacher.id, "My Grade Course 3")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "MG3 Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id, score_max=100)
    _add_review(assignment.id, reviewer.id, student.id, criteria.id, 70)
    db.session.commit()

    # Teacher applies override
    _login(test_client, "teacher-mg3@gb.test", "password")
    test_client.put(
        f"/class/{course.id}/gradebook/overrides",
        data=json.dumps({
            "assignment_id": assignment.id,
            "student_id": student.id,
            "override_grade": 55,
            "reason": "Penalty applied",
        }),
        headers={"Content-Type": "application/json"},
    )

    # Student sees the overridden grade
    _login(test_client, "student-mg3@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/my-grade")
    assert resp.status_code == 200

    payload = resp.get_json()
    assert payload["assignments"][0]["effective_grade"] == 55.0
    assert payload["assignments"][0]["grade_source"] == "override"


def test_my_grade_updates_after_new_review_submitted(test_client):
    """Grade recalculates when an additional review is added (simulated, not event-driven)."""
    teacher = _make_user("Teacher MG4", "teacher-mg4@gb.test", role="teacher")
    student = _make_user("Student MG4", "student-mg4@gb.test", student_id="MG401")
    reviewer1 = _make_user("Reviewer MG4a", "reviewer-mg4a@gb.test", student_id="MG402")
    reviewer2 = _make_user("Reviewer MG4b", "reviewer-mg4b@gb.test", student_id="MG403")
    db.session.flush()

    course = _make_course(teacher.id, "my grade course 4")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer1.id, courseID=course.id),
        User_Course(userID=reviewer2.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "MG4 Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id, score_max=100)

    # Just one review: 60
    _add_review(assignment.id, reviewer1.id, student.id, criteria.id, 60)
    db.session.commit()

    _login(test_client, "student-mg4@gb.test", "password")
    resp1 = test_client.get(f"/class/{course.id}/my-grade")
    assert resp1.get_json()["course_total_grade"] == 60.0

    # Second review added: 100 → new average 80
    _add_review(assignment.id, reviewer2.id, student.id, criteria.id, 100)
    db.session.commit()

    resp2 = test_client.get(f"/class/{course.id}/my-grade")
    assert resp2.get_json()["course_total_grade"] == 80.0


def test_my_grade_denied_for_unenrolled_student(test_client):
    """Student not enrolled cannot access /my-grade."""
    teacher = _make_user("Teacher MG5", "teacher-mg5@gb.test", role="teacher")
    student = _make_user("Student MG5", "student-mg5@gb.test", student_id="MG501")
    db.session.flush()

    course = _make_course(teacher.id, "My Grade Course 5")
    db.session.commit()

    _login(test_client, "student-mg5@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/my-grade")
    # Unenrolled student fails the course-access guard before enrollment check
    assert resp.status_code in (403, 404)


def test_my_grade_with_course_total_override(test_client):
    """When teacher sets a course-total override, student's /my-grade reflects it."""
    teacher = _make_user("Teacher MG6", "teacher-mg6@gb.test", role="teacher")
    student = _make_user("Student MG6", "student-mg6@gb.test", student_id="MG601")
    reviewer = _make_user("Reviewer MG6", "reviewer-mg6@gb.test", student_id="MG602")
    db.session.flush()

    course = _make_course(teacher.id, "My Grade Course 6")
    db.session.flush()

    db.session.add_all([
        User_Course(userID=student.id, courseID=course.id),
        User_Course(userID=reviewer.id, courseID=course.id),
    ])
    db.session.flush()

    assignment = _make_assignment(course.id, "MG6 Assign", external_review=True)
    db.session.flush()
    criteria = _make_rubric_criteria(assignment.id)
    _add_review(assignment.id, reviewer.id, student.id, criteria.id, 50)
    db.session.commit()

    # Teacher sets course-total override
    _login(test_client, "teacher-mg6@gb.test", "password")
    test_client.put(
        f"/class/{course.id}/gradebook/course-total-overrides",
        data=json.dumps({"student_id": student.id, "override_total": 88, "reason": "participation"}),
        headers={"Content-Type": "application/json"},
    )

    # Student sees the overridden course total
    _login(test_client, "student-mg6@gb.test", "password")
    resp = test_client.get(f"/class/{course.id}/my-grade")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["course_total_grade"] == 88.0
    assert payload["course_total"]["source"] == "override"
