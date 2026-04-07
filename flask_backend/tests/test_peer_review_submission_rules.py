"""
Tests for peer review submission-based rules:
1. Reviewer must have submitted before reviewing others
2. Reviewee must have submitted to be reviewable
3. Late submissions are still reviewable
4. /review-targets endpoint filters by submission status
5. create_review returns peer_review_start_date when not yet available
"""

import pytest
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

from api.models import (
    Assignment, Course, User, Review, Rubric,
    CriteriaDescription, CourseGroup, Group_Members,
    User_Course, StudentSubmission,
)
from api.models.db import db


def _login(client, email, password="password"):
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp


def _setup_individual_assignment(db_session, peer_review_available=True):
    """Create teacher, course, 2 students enrolled, assignment with peer review.
    Returns a dict of IDs to avoid detached instance errors."""
    teacher = User(name="Teacher", email="teacher@test.com",
                   hash_pass=generate_password_hash("password"), role="teacher")
    student1 = User(name="Student One", email="s1@test.com",
                    hash_pass=generate_password_hash("password"), role="student")
    student2 = User(name="Student Two", email="s2@test.com",
                    hash_pass=generate_password_hash("password"), role="student")
    db_session.session.add_all([teacher, student1, student2])
    db_session.session.flush()

    course = Course(teacherID=teacher.id, name="Test Course")
    db_session.session.add(course)
    db_session.session.flush()

    for u in [student1, student2]:
        db_session.session.add(User_Course(userID=u.id, courseID=course.id))

    now = datetime.now(timezone.utc)
    if peer_review_available:
        start = now - timedelta(days=1)
        due = now + timedelta(days=7)
    else:
        start = now + timedelta(days=1)
        due = now + timedelta(days=8)

    sub_due = now - timedelta(hours=1)  # submission deadline passed
    assignment = Assignment(
        courseID=course.id,
        name="Test Assignment",
        rubric_text="",
        submission_type="individual",
        external_review=True,
        internal_review=False,
        anonymous_review=False,
        due_date=sub_due,
        peer_review_start_date=start,
        peer_review_due_date=due,
    )
    db_session.session.add(assignment)
    db_session.session.flush()

    rubric = Rubric(assignmentID=assignment.id)
    db_session.session.add(rubric)
    db_session.session.flush()
    cd = CriteriaDescription(rubricID=rubric.id, question="Quality", scoreMax=100, hasScore=True)
    db_session.session.add(cd)
    db_session.session.commit()

    return {
        "s1_id": student1.id,
        "s2_id": student2.id,
        "assignment_id": assignment.id,
        "due_date": sub_due,
    }


def _add_submission(db_session, assignment_id, student_id, late=False, due_date=None):
    """Add a submission for a student."""
    sub = StudentSubmission(
        assignment_id=assignment_id,
        student_id=student_id,
        submission_text="My submission",
    )
    db_session.session.add(sub)
    db_session.session.flush()
    # Override submitted_at for late-submission testing
    if late and due_date:
        sub.submitted_at = due_date + timedelta(hours=2)
    db_session.session.commit()
    return sub


class TestCreateReviewSubmissionGuards:
    """Test that create_review enforces submission requirements."""

    def test_reviewer_without_submission_cannot_review(self, app, db, test_client):
        """Reviewer who hasn't submitted gets 403."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            # s2 submitted, s1 did NOT
            _add_submission(db, ids["assignment_id"], ids["s2_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.post("/create_review", json={
            "assignmentID": ids["assignment_id"],
            "reviewerID": ids["s1_id"],
            "revieweeID": ids["s2_id"],
            "reviewerType": "user",
            "revieweeType": "user",
        })
        assert resp.status_code == 403
        assert "must submit" in resp.get_json()["msg"].lower()

    def test_reviewee_without_submission_cannot_be_reviewed(self, app, db, test_client):
        """Trying to review someone who hasn't submitted gets 403."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            # s1 submitted, s2 did NOT
            _add_submission(db, ids["assignment_id"], ids["s1_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.post("/create_review", json={
            "assignmentID": ids["assignment_id"],
            "reviewerID": ids["s1_id"],
            "revieweeID": ids["s2_id"],
            "reviewerType": "user",
            "revieweeType": "user",
        })
        assert resp.status_code == 403
        assert "not submitted" in resp.get_json()["msg"].lower()

    def test_both_submitted_allows_review(self, app, db, test_client):
        """When both parties submitted, review creation succeeds."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.post("/create_review", json={
            "assignmentID": ids["assignment_id"],
            "reviewerID": ids["s1_id"],
            "revieweeID": ids["s2_id"],
            "reviewerType": "user",
            "revieweeType": "user",
        })
        assert resp.status_code == 201

    def test_late_submission_is_reviewable(self, app, db, test_client):
        """A late submission can still be reviewed."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"], late=True, due_date=ids["due_date"])

        _login(test_client, "s1@test.com")
        resp = test_client.post("/create_review", json={
            "assignmentID": ids["assignment_id"],
            "reviewerID": ids["s1_id"],
            "revieweeID": ids["s2_id"],
            "reviewerType": "user",
            "revieweeType": "user",
        })
        assert resp.status_code == 201

    def test_not_yet_available_returns_start_date(self, app, db, test_client):
        """When peer review hasn't started, 403 includes peer_review_start_date."""
        with app.app_context():
            ids = _setup_individual_assignment(db, peer_review_available=False)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.post("/create_review", json={
            "assignmentID": ids["assignment_id"],
            "reviewerID": ids["s1_id"],
            "revieweeID": ids["s2_id"],
            "reviewerType": "user",
            "revieweeType": "user",
        })
        assert resp.status_code == 403
        data = resp.get_json()
        assert "not yet available" in data["msg"].lower()
        assert "peer_review_start_date" in data


class TestReviewTargetsEndpoint:
    """Test the /review-targets/<assignment_id> endpoint."""

    def test_targets_include_submitted_students(self, app, db, test_client):
        """Students who submitted appear in external_targets with has_submitted=True."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.get(f"/review-targets/{ids['assignment_id']}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["reviewer_eligible"] is True
        ext = data["external_targets"]
        s2_target = next((t for t in ext if t["id"] == ids["s2_id"]), None)
        assert s2_target is not None
        assert s2_target["has_submitted"] is True

    def test_targets_show_unsubmitted_students(self, app, db, test_client):
        """Students who haven't submitted appear with has_submitted=False."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            # s2 did NOT submit

        _login(test_client, "s1@test.com")
        resp = test_client.get(f"/review-targets/{ids['assignment_id']}")
        assert resp.status_code == 200
        data = resp.get_json()
        ext = data["external_targets"]
        s2_target = next((t for t in ext if t["id"] == ids["s2_id"]), None)
        assert s2_target is not None
        assert s2_target["has_submitted"] is False

    def test_reviewer_not_eligible_without_submission(self, app, db, test_client):
        """User who hasn't submitted has reviewer_eligible=False."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            # s1 did NOT submit

        _login(test_client, "s1@test.com")
        resp = test_client.get(f"/review-targets/{ids['assignment_id']}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["reviewer_eligible"] is False

    def test_late_submission_flagged(self, app, db, test_client):
        """A late submission is flagged with is_late=True in targets."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"], late=True, due_date=ids["due_date"])

        _login(test_client, "s1@test.com")
        resp = test_client.get(f"/review-targets/{ids['assignment_id']}")
        assert resp.status_code == 200
        data = resp.get_json()
        ext = data["external_targets"]
        s2_target = next((t for t in ext if t["id"] == ids["s2_id"]), None)
        assert s2_target is not None
        assert s2_target["is_late"] is True

    def test_self_excluded_from_targets(self, app, db, test_client):
        """Current user should not appear in their own external targets."""
        with app.app_context():
            ids = _setup_individual_assignment(db)
            _add_submission(db, ids["assignment_id"], ids["s1_id"])
            _add_submission(db, ids["assignment_id"], ids["s2_id"])

        _login(test_client, "s1@test.com")
        resp = test_client.get(f"/review-targets/{ids['assignment_id']}")
        data = resp.get_json()
        ext_ids = [t["id"] for t in data["external_targets"]]
        assert ids["s1_id"] not in ext_ids
