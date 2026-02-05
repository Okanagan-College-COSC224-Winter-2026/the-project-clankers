"""
Tests for peer review endpoints, focusing on POST /review/<review_id>/submit
"""

import pytest
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

from api.models import (
    User,
    Course,
    Assignment,
    Review,
    Submission,
    Rubric,
    CriteriaDescription,
    Criterion,
    User_Course,
)
from api.models.db import db


@pytest.fixture
def teacher_user(app):
    """Create a teacher user"""
    teacher = User(
        name="Teacher Test",
        email="teacher@test.com",
        hash_pass=generate_password_hash("password123"),
        role="teacher",
    )
    db.session.add(teacher)
    db.session.commit()
    return teacher


@pytest.fixture
def student_users(app):
    """Create multiple student users"""
    students = []
    for i in range(3):
        student = User(
            name=f"Student {i}",
            email=f"student{i}@test.com",
            hash_pass=generate_password_hash("password123"),
            role="student",
        )
        db.session.add(student)
        students.append(student)
    db.session.commit()
    return students


@pytest.fixture
def course_with_teacher(app, teacher_user):
    """Create a course with teacher"""
    course = Course(teacherID=teacher_user.id, name="Test Course")
    db.session.add(course)
    db.session.commit()
    return course


@pytest.fixture
def assignment_open(app, course_with_teacher):
    """Create an assignment with open review window (future due date)"""
    future_date = datetime.now(timezone.utc) + timedelta(days=7)
    assignment = Assignment(
        courseID=course_with_teacher.id,
        name="Test Assignment",
        rubric_text="Test Rubric",
        due_date=future_date,
    )
    db.session.add(assignment)
    db.session.commit()
    return assignment


@pytest.fixture
def assignment_closed(app, course_with_teacher):
    """Create an assignment with closed review window (past due date)"""
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    assignment = Assignment(
        courseID=course_with_teacher.id,
        name="Closed Assignment",
        rubric_text="Test Rubric",
        due_date=past_date,
    )
    db.session.add(assignment)
    db.session.commit()
    return assignment


@pytest.fixture
def rubric_with_criteria(app, assignment_open):
    """Create a rubric with criteria for assignment"""
    rubric = Rubric(assignmentID=assignment_open.id, canComment=True)
    db.session.add(rubric)
    db.session.commit()

    # Add criteria descriptions
    criteria = [
        CriteriaDescription(
            rubricID=rubric.id,
            question="Code Quality",
            scoreMax=5,
            hasScore=True,
        ),
        CriteriaDescription(
            rubricID=rubric.id,
            question="Completeness",
            scoreMax=4,
            hasScore=True,
        ),
        CriteriaDescription(
            rubricID=rubric.id,
            question="Comments",
            scoreMax=0,
            hasScore=False,
        ),
    ]
    for c in criteria:
        db.session.add(c)
    db.session.commit()

    return rubric


@pytest.fixture
def enrollment_students(app, course_with_teacher, student_users):
    """Enroll students in course"""
    for student in student_users:
        enrollment = User_Course(userID=student.id, courseID=course_with_teacher.id)
        db.session.add(enrollment)
    db.session.commit()
    return student_users


@pytest.fixture
def submission(app, assignment_open, student_users):
    """Create a submission from second student"""
    sub = Submission(
        path="test_submission.pdf",
        studentID=student_users[1].id,
        assignmentID=assignment_open.id,
    )
    db.session.add(sub)
    db.session.commit()
    return sub


@pytest.fixture
def review(app, assignment_open, student_users):
    """Create a review: student 0 reviews student 1"""
    review_obj = Review(
        assignmentID=assignment_open.id,
        reviewerID=student_users[0].id,
        revieweeID=student_users[1].id,
    )
    db.session.add(review_obj)
    db.session.commit()
    return review_obj


class TestSubmitReviewEndpoint:
    """Tests for POST /review/<review_id>/submit"""

    # ========================================================================
    # SUCCESS CASES (200)
    # ========================================================================

    def test_submit_review_success(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Test successfully submitting a peer review"""
        # Login as reviewer (student 0)
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        # Get criteria IDs
        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        # Submit review with grades for required criteria
        submit_data = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 4,
                    "comments": "Good implementation",
                },
                {
                    "criterionRowID": criteria_ids[1],
                    "grade": 3,
                    "comments": "Missing some edge cases",
                },
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["msg"] == "Review submitted successfully"
        assert data["markedComplete"] is True
        assert "review" in data

    def test_submit_review_with_comments_only_criteria(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Test submitting review with criteria that don't require scores"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        # Submit with grades for required criteria + comments for non-score criteria
        submit_data = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 5,
                    "comments": "Excellent",
                },
                {
                    "criterionRowID": criteria_ids[1],
                    "grade": 4,
                    "comments": "Very good",
                },
                {
                    "criterionRowID": criteria_ids[2],
                    "grade": 0,
                    "comments": "General feedback",
                },
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 200
        assert response.get_json()["markedComplete"] is True

    def test_submit_review_creates_criterion_records(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Verify Criterion records are created in database"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 3,
                    "comments": "Good",
                },
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 200

        # Verify Criterion record exists
        criterion = Criterion.query.filter(
            Criterion.reviewID == review.id,
            Criterion.criterionRowID == criteria_ids[0],
        ).first()
        assert criterion is not None
        assert criterion.grade == 3
        assert criterion.comments == "Good"

    # ========================================================================
    # 400 - REVIEW WINDOW CLOSED
    # ========================================================================

    def test_submit_review_window_closed(
        self, test_client, student_users, enrollment_students, assignment_closed
    ):
        """Test cannot submit review after window closes (400)"""
        # Create review for closed assignment
        review_obj = Review(
            assignmentID=assignment_closed.id,
            reviewerID=student_users[0].id,
            revieweeID=student_users[1].id,
        )
        db.session.add(review_obj)

        # Create submission
        sub = Submission(
            path="test.pdf",
            studentID=student_users[1].id,
            assignmentID=assignment_closed.id,
        )
        db.session.add(sub)
        db.session.commit()

        # Login as reviewer
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        # Try to submit
        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 1,
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review_obj.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["type"] == "REVIEW_WINDOW_CLOSED"
        assert "closed" in data["msg"].lower()

    def test_submit_review_no_json(self, test_client, student_users, enrollment_students, review):
        """Test submit without JSON body (400)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        response = test_client.post(f"/review/{review.id}/submit")

        assert response.status_code == 400
        assert "JSON" in response.get_json()["msg"]

    # ========================================================================
    # 403 - FORBIDDEN (NOT REVIEWER / NOT ENROLLED)
    # ========================================================================

    def test_submit_review_not_assigned_reviewer(
        self, test_client, student_users, enrollment_students, review, submission
    ):
        """Test cannot submit review if not the assigned reviewer (403)"""
        # Login as student 2 (not the assigned reviewer)
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student2@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 1,
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 403
        assert "not assigned" in response.get_json()["msg"].lower()

    def test_submit_review_not_enrolled_in_course(
        self, test_client, student_users, review, submission, rubric_with_criteria
    ):
        """Test cannot submit if not enrolled in course (403)"""
        # Note: student_users fixture exists but enrollment_students not used
        # So student 0 is NOT enrolled

        # Create new course/assignment/review for enrolled student
        course = Course(teacherID=1, name="Course 2")
        db.session.add(course)
        db.session.commit()

        past_date = datetime.now(timezone.utc) + timedelta(days=7)
        assignment = Assignment(
            courseID=course.id,
            name="Assignment 2",
            rubric_text="Test",
            due_date=past_date,
        )
        db.session.add(assignment)
        db.session.commit()

        # Create review but don't enroll student
        review_obj = Review(
            assignmentID=assignment.id,
            reviewerID=student_users[0].id,
            revieweeID=student_users[1].id,
        )
        db.session.add(review_obj)
        db.session.commit()

        # Login as student 0
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 1,
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review_obj.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 403
        assert "not enrolled" in response.get_json()["msg"].lower()

    # ========================================================================
    # 404 - NOT FOUND
    # ========================================================================

    def test_submit_review_not_found(self, test_client, student_users, enrollment_students):
        """Test submitting to non-existent review (404)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        response = test_client.post(
            "/review/99999/submit",
            json={"criteria": []},
        )

        assert response.status_code == 404
        assert "not found" in response.get_json()["msg"].lower()

    def test_submit_review_submission_not_found(
        self, test_client, student_users, enrollment_students, review
    ):
        """Test error when submission doesn't exist (404)"""
        # Review exists but no submission for reviewee
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 1,
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 404
        assert "submission" in response.get_json()["msg"].lower()

    # ========================================================================
    # 422 - UNPROCESSABLE ENTITY (VALIDATION ERRORS)
    # ========================================================================

    def test_submit_review_no_criteria_provided(
        self, test_client, student_users, enrollment_students, review, submission
    ):
        """Test error when no criteria provided (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        response = test_client.post(
            f"/review/{review.id}/submit",
            json={"criteria": []},
        )

        assert response.status_code == 422
        assert "No criteria" in response.get_json()["msg"]

    def test_submit_review_missing_criterion_row_id(
        self, test_client, student_users, enrollment_students, review, submission
    ):
        """Test validation error - missing criterionRowID (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    # Missing criterionRowID
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 422
        data = response.get_json()
        assert data["type"] == "VALIDATION_ERROR"
        assert len(data["errors"]) > 0

    def test_submit_review_missing_grade(
        self, test_client, student_users, enrollment_students, review, submission
    ):
        """Test validation error - missing grade (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 1,
                    # Missing grade
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 422
        data = response.get_json()
        assert data["type"] == "VALIDATION_ERROR"

    def test_submit_review_grade_out_of_range(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Test validation error - grade exceeds scoreMax (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        # First criterion has scoreMax=5, try grade=6
        submit_data = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 10,  # Too high!
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 422
        data = response.get_json()
        assert data["type"] == "VALIDATION_ERROR"
        assert any("must be between" in str(e) for e in data["errors"])

    def test_submit_review_negative_grade(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Test validation error - negative grade (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": -1,  # Negative!
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 422
        data = response.get_json()
        assert data["type"] == "VALIDATION_ERROR"

    def test_submit_review_invalid_criterion_row_id(
        self, test_client, student_users, enrollment_students, review, submission
    ):
        """Test validation error - criterionRowID doesn't exist (422)"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        submit_data = {
            "criteria": [
                {
                    "criterionRowID": 99999,  # Doesn't exist
                    "grade": 3,
                    "comments": "Test",
                }
            ]
        }

        response = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data,
        )

        assert response.status_code == 422
        data = response.get_json()
        assert data["type"] == "VALIDATION_ERROR"
        assert any("not found" in str(e).lower() for e in data["errors"])

    # ========================================================================
    # 401 - UNAUTHORIZED (NO JWT)
    # ========================================================================

    def test_submit_review_no_jwt(self, test_client, review):
        """Test cannot submit without JWT (401)"""
        response = test_client.post(
            f"/review/{review.id}/submit",
            json={"criteria": []},
        )

        assert response.status_code == 401

    # ========================================================================
    # EDGE CASES
    # ========================================================================

    def test_submit_review_update_existing_criteria(
        self, test_client, student_users, enrollment_students, review, submission, rubric_with_criteria
    ):
        """Test updating existing criteria response"""
        login_response = test_client.post(
            "/auth/login",
            json={"email": "student0@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        criteria_ids = [c.id for c in rubric_with_criteria.criteria_descriptions]

        # Submit first time
        submit_data_1 = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 2,
                    "comments": "Poor",
                }
            ]
        }

        response1 = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data_1,
        )
        assert response1.status_code == 200

        # Verify first submission
        criterion = Criterion.query.filter(
            Criterion.reviewID == review.id,
            Criterion.criterionRowID == criteria_ids[0],
        ).first()
        assert criterion.grade == 2

        # Submit again with different grade
        submit_data_2 = {
            "criteria": [
                {
                    "criterionRowID": criteria_ids[0],
                    "grade": 5,
                    "comments": "Excellent!",
                }
            ]
        }

        response2 = test_client.post(
            f"/review/{review.id}/submit",
            json=submit_data_2,
        )
        assert response2.status_code == 200

        # Verify update
        criterion = Criterion.query.filter(
            Criterion.reviewID == review.id,
            Criterion.criterionRowID == criteria_ids[0],
        ).first()
        assert criterion.grade == 5
        assert criterion.comments == "Excellent!"

