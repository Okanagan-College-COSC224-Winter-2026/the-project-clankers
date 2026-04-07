import json
from datetime import datetime, timedelta, timezone

from werkzeug.security import generate_password_hash

from api.models import (
    Assignment,
    Course,
    CriteriaDescription,
    Criterion,
    Review,
    Rubric,
    StudentSubmission,
    User,
    User_Course,
    db,
)


def _login(client, email, password):
    return client.post(
        "/auth/login",
        data=json.dumps({"email": email, "password": password}),
        headers={"Content-Type": "application/json"},
    )


def _create_review_with_grade(assignment_id, reviewer_id, reviewee_id, criteria_id, grade):
    review = Review(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewer_type="user",
        reviewee_type="user",
    )
    db.session.add(review)
    db.session.flush()

    criterion = Criterion(
        reviewID=review.id,
        criterionRowID=criteria_id,
        grade=grade,
        comments="",
    )
    db.session.add(criterion)
    db.session.flush()


def test_gradebook_shows_submission_status_and_averages(test_client):
    teacher = User(
        name="Teacher",
        email="teacher-gradebook@test.com",
        hash_pass=generate_password_hash("password"),
        role="teacher",
    )
    student1 = User(
        name="Student One",
        email="student-one@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="S001",
    )
    student2 = User(
        name="Student Two",
        email="student-two@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="S002",
    )
    db.session.add_all([teacher, student1, student2])
    db.session.flush()

    course = Course(teacherID=teacher.id, name="Gradebook 101")
    db.session.add(course)
    db.session.flush()

    db.session.add_all(
        [
            User_Course(userID=student1.id, courseID=course.id),
            User_Course(userID=student2.id, courseID=course.id),
        ]
    )
    db.session.flush()

    assignment = Assignment(
        courseID=course.id,
        name="Assignment 1",
        rubric_text="",
        submission_type="individual",
        external_review=True,
        due_date=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.session.add(assignment)
    db.session.flush()

    rubric = Rubric(assignmentID=assignment.id)
    db.session.add(rubric)
    db.session.flush()

    criteria = CriteriaDescription(
        rubricID=rubric.id,
        question="Quality",
        scoreMax=100,
        hasScore=True,
    )
    db.session.add(criteria)
    db.session.flush()

    submission = StudentSubmission(
        assignment_id=assignment.id,
        student_id=student1.id,
        filename="a1.pdf",
        file_path="a1.pdf",
    )
    db.session.add(submission)
    db.session.flush()

    _create_review_with_grade(assignment.id, student2.id, student1.id, criteria.id, 90)
    db.session.commit()

    _login(test_client, "teacher-gradebook@test.com", "password")
    response = test_client.get(f"/class/{course.id}/gradebook")
    assert response.status_code == 200

    payload = response.get_json()
    students = {student["student_id"]: student for student in payload["students"]}
    entry1 = students[student1.id]["assignments"][0]
    entry2 = students[student2.id]["assignments"][0]

    assert entry1["submission_status"] == "submitted"
    assert entry1["effective_grade"] == 90.0
    assert entry2["submission_status"] == "no submission"

    aggregate = payload["assignment_aggregates"][0]
    assert aggregate["submitted_count"] == 1
    assert aggregate["missing_count"] == 1
    assert aggregate["average_grade"] == 90.0


def test_grade_override_reflects_in_student_course_grade(test_client):
    teacher = User(
        name="Teacher",
        email="teacher-override@test.com",
        hash_pass=generate_password_hash("password"),
        role="teacher",
    )
    student = User(
        name="Student",
        email="student-override@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="S101",
    )
    reviewer = User(
        name="Reviewer",
        email="reviewer-override@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="S102",
    )
    db.session.add_all([teacher, student, reviewer])
    db.session.flush()

    course = Course(teacherID=teacher.id, name="Override Course")
    db.session.add(course)
    db.session.flush()

    db.session.add_all(
        [
            User_Course(userID=student.id, courseID=course.id),
            User_Course(userID=reviewer.id, courseID=course.id),
        ]
    )
    db.session.flush()

    assignment = Assignment(
        courseID=course.id,
        name="Assignment Override",
        rubric_text="",
        submission_type="individual",
        external_review=True,
    )
    db.session.add(assignment)
    db.session.flush()

    rubric = Rubric(assignmentID=assignment.id)
    db.session.add(rubric)
    db.session.flush()

    criteria = CriteriaDescription(rubricID=rubric.id, question="Quality", scoreMax=100, hasScore=True)
    db.session.add(criteria)
    db.session.flush()

    _create_review_with_grade(assignment.id, reviewer.id, student.id, criteria.id, 95)
    db.session.commit()

    _login(test_client, "teacher-override@test.com", "password")
    override_resp = test_client.put(
        f"/class/{course.id}/gradebook/overrides",
        data=json.dumps(
            {
                "assignment_id": assignment.id,
                "student_id": student.id,
                "override_grade": 77,
                "reason": "Manual adjustment",
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert override_resp.status_code == 200

    _login(test_client, "student-override@test.com", "password")
    my_grade_resp = test_client.get(f"/class/{course.id}/my-grade")
    assert my_grade_resp.status_code == 200

    payload = my_grade_resp.get_json()
    assert payload["course_total_grade"] == 77.0
    assert payload["assignments"][0]["grade_source"] == "override"
    assert payload["assignments"][0]["effective_grade"] == 77.0


def test_penalties_apply_for_late_submission_and_incomplete_evaluations(test_client):
    teacher = User(
        name="Teacher",
        email="teacher-penalty@test.com",
        hash_pass=generate_password_hash("password"),
        role="teacher",
    )
    s1 = User(
        name="Student A",
        email="student-a@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="PA1",
    )
    s2 = User(
        name="Student B",
        email="student-b@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="PA2",
    )
    s3 = User(
        name="Student C",
        email="student-c@test.com",
        hash_pass=generate_password_hash("password"),
        role="student",
        student_id="PA3",
    )
    db.session.add_all([teacher, s1, s2, s3])
    db.session.flush()

    course = Course(teacherID=teacher.id, name="Penalty Course")
    db.session.add(course)
    db.session.flush()

    db.session.add_all(
        [
            User_Course(userID=s1.id, courseID=course.id),
            User_Course(userID=s2.id, courseID=course.id),
            User_Course(userID=s3.id, courseID=course.id),
        ]
    )
    db.session.flush()

    assignment = Assignment(
        courseID=course.id,
        name="Penalty Assignment",
        rubric_text="",
        submission_type="individual",
        external_review=True,
        due_date=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.session.add(assignment)
    db.session.flush()

    rubric = Rubric(assignmentID=assignment.id)
    db.session.add(rubric)
    db.session.flush()

    criteria = CriteriaDescription(rubricID=rubric.id, question="Quality", scoreMax=100, hasScore=True)
    db.session.add(criteria)
    db.session.flush()

    # Student A submitted late.
    db.session.add(
        StudentSubmission(
            assignment_id=assignment.id,
            student_id=s1.id,
            filename="late.pdf",
            file_path="late.pdf",
        )
    )

    # Student A received two complete reviews (raw grade = 100).
    _create_review_with_grade(assignment.id, s2.id, s1.id, criteria.id, 100)
    _create_review_with_grade(assignment.id, s3.id, s1.id, criteria.id, 100)

    # Student A completed only one of expected two outgoing reviews.
    _create_review_with_grade(assignment.id, s1.id, s2.id, criteria.id, 90)
    db.session.commit()

    _login(test_client, "teacher-penalty@test.com", "password")
    policy_resp = test_client.put(
        f"/class/{course.id}/gradebook/policy",
        data=json.dumps(
            {
                "late_penalty_percent": 10,
                "incomplete_evaluation_penalty_percent": 20,
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert policy_resp.status_code == 200

    gradebook_resp = test_client.get(f"/class/{course.id}/gradebook")
    assert gradebook_resp.status_code == 200
    payload = gradebook_resp.get_json()

    student_row = next(student for student in payload["students"] if student["student_id"] == s1.id)
    entry = student_row["assignments"][0]

    assert entry["submission_status"] == "submitted late"
    assert entry["peer_evaluation"]["status"] == "incomplete"
    assert entry["penalty_applied_percent"] == 30.0
    assert entry["computed_grade"] == 100.0
    assert entry["effective_grade"] == 70.0
