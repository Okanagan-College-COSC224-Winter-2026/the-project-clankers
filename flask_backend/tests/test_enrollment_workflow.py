"""
Tests for the enrollment request workflow.
Covers student enrollment requests, teacher approval/rejection, and notifications.
"""

import pytest
from werkzeug.security import generate_password_hash

from api.models import Course, EnrollmentRequest, Notification, User, User_Course
from api.models.db import db


@pytest.fixture
def setup_class_and_users(test_client):
    """Create a teacher, student, and class for testing"""
    # Create a teacher
    teacher = User(
        name="Test Teacher",
        email="teacher@example.com",
        hash_pass=generate_password_hash("teacher_password"),
        role="teacher"
    )
    db.session.add(teacher)
    db.session.commit()
    
    # Create a student
    student = User(
        name="Test Student",
        email="student@example.com",
        hash_pass=generate_password_hash("student_password"),
        role="student"
    )
    db.session.add(student)
    db.session.commit()
    
    # Create a class
    course = Course(teacherID=teacher.id, name="Test Course")
    db.session.add(course)
    db.session.commit()
    
    return {
        "teacher": teacher,
        "student": student,
        "course": course,
        "test_client": test_client
    }


def test_student_request_enrollment(setup_class_and_users):
    """Test that a student can request to enroll in a course"""
    data = setup_class_and_users
    student = data["student"]
    course = data["course"]
    
    # Login as student
    response = data["test_client"].post(
        "/auth/login",
        json={"email": student.email, "password": "student_password"},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    
    # Request enrollment
    response = data["test_client"].post(
        "/enrollments/request",
        json={"course_id": course.id},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 201
    response_data = response.get_json()
    assert response_data["msg"] == "Enrollment request submitted successfully"
    assert response_data["request"]["status"] == "pending"
    assert response_data["request"]["studentID"] == student.id
    assert response_data["request"]["courseID"] == course.id


def test_student_cannot_request_twice(setup_class_and_users):
    """Test that a student cannot request enrollment twice for the same course"""
    data = setup_class_and_users
    student = data["student"]
    course = data["course"]
    
    # Login as student
    data["test_client"].post(
        "/auth/login",
        json={"email": student.email, "password": "student_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # First request
    response = data["test_client"].post(
        "/enrollments/request",
        json={"course_id": course.id},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 201
    
    # Second request should fail
    response = data["test_client"].post(
        "/enrollments/request",
        json={"course_id": course.id},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert "already have a pending enrollment request" in response.get_json()["msg"]


def test_teacher_receives_notification(setup_class_and_users):
    """Test that a teacher receives a notification when a student requests enrollment"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Login as student and request enrollment
    data["test_client"].post(
        "/auth/login",
        json={"email": student.email, "password": "student_password"},
        headers={"Content-Type": "application/json"}
    )
    data["test_client"].post(
        "/enrollments/request",
        json={"course_id": course.id},
        headers={"Content-Type": "application/json"}
    )
    
    # Check that notification was created for teacher
    notifications = Notification.get_for_user(teacher.id)
    assert len(notifications) == 1
    assert notifications[0].type == "enrollment_request"
    assert notifications[0].is_read == False
    assert student.name in notifications[0].message


def test_teacher_approve_request(setup_class_and_users):
    """Test that a teacher can approve an enrollment request"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Create an enrollment request
    enrollment_request = EnrollmentRequest.create_request(student.id, course.id)
    
    # Login as teacher
    data["test_client"].post(
        "/auth/login",
        json={"email": teacher.email, "password": "teacher_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # Approve the request
    response = data["test_client"].post(
        f"/enrollments/{enrollment_request.id}/approve",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    response_data = response.get_json()
    assert response_data["request"]["status"] == "approved"
    
    # Check that student was enrolled
    enrollment = User_Course.get(student.id, course.id)
    assert enrollment is not None
    
    # Check that student received notification
    notifications = Notification.get_for_user(student.id)
    assert len(notifications) == 1
    assert notifications[0].type == "enrollment_approved"
    assert "approved" in notifications[0].message


def test_teacher_reject_request(setup_class_and_users):
    """Test that a teacher can reject an enrollment request"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Create an enrollment request
    enrollment_request = EnrollmentRequest.create_request(student.id, course.id)
    
    # Login as teacher
    data["test_client"].post(
        "/auth/login",
        json={"email": teacher.email, "password": "teacher_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # Reject the request
    response = data["test_client"].post(
        f"/enrollments/{enrollment_request.id}/reject",
        json={"notes": "Not available this semester"},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    response_data = response.get_json()
    assert response_data["request"]["status"] == "rejected"
    assert response_data["request"]["teacher_notes"] == "Not available this semester"
    
    # Check that student was NOT enrolled
    enrollment = User_Course.get(student.id, course.id)
    assert enrollment is None
    
    # Check that student received rejection notification
    notifications = Notification.get_for_user(student.id)
    assert len(notifications) == 1
    assert notifications[0].type == "enrollment_rejected"
    assert "rejected" in notifications[0].message


def test_teacher_get_enrollment_requests(setup_class_and_users):
    """Test that a teacher can view all enrollment requests for their courses"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Create enrollment requests
    request1 = EnrollmentRequest.create_request(student.id, course.id)
    
    # Create another student and request
    student2 = User(
        name="Another Student",
        email="student2@example.com",
        hash_pass=generate_password_hash("student_password"),
        role="student"
    )
    db.session.add(student2)
    db.session.commit()
    request2 = EnrollmentRequest.create_request(student2.id, course.id)
    
    # Login as teacher
    data["test_client"].post(
        "/auth/login",
        json={"email": teacher.email, "password": "teacher_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # Get requests
    response = data["test_client"].get(
        "/enrollments/teacher/requests",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    requests_data = response.get_json()
    assert len(requests_data) == 2
    assert all(r["status"] == "pending" for r in requests_data)


def test_notifications_mark_as_read(setup_class_and_users):
    """Test that notifications can be marked as read"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Create request and notification
    enrollment_request = EnrollmentRequest.create_request(student.id, course.id)
    notification = Notification.create_notification(
        user_id=teacher.id,
        type="enrollment_request",
        related_id=enrollment_request.id,
        message=f"{student.name} is requesting to join {course.name}"
    )
    
    # Login as teacher
    data["test_client"].post(
        "/auth/login",
        json={"email": teacher.email, "password": "teacher_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # Mark as read
    response = data["test_client"].put(
        f"/notifications/{notification.id}/read",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    response_data = response.get_json()
    assert response_data["notification"]["is_read"] == True


def test_get_unread_notifications(setup_class_and_users):
    """Test that unread notifications can be retrieved"""
    data = setup_class_and_users
    student = data["student"]
    teacher = data["teacher"]
    course = data["course"]
    
    # Create multiple notifications
    enrollment_request = EnrollmentRequest.create_request(student.id, course.id)
    notification1 = Notification.create_notification(
        user_id=teacher.id,
        type="enrollment_request",
        related_id=enrollment_request.id,
        message="Test notification 1"
    )
    notification2 = Notification.create_notification(
        user_id=teacher.id,
        type="enrollment_request",
        related_id=enrollment_request.id,
        message="Test notification 2"
    )
    
    # Login as teacher
    data["test_client"].post(
        "/auth/login",
        json={"email": teacher.email, "password": "teacher_password"},
        headers={"Content-Type": "application/json"}
    )
    
    # Get unread notifications
    response = data["test_client"].get(
        "/notifications/unread",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    notifications = response.get_json()
    assert len(notifications) == 2
    assert all(not n["is_read"] for n in notifications)
    
    # Mark one as read
    data["test_client"].put(
        f"/notifications/{notification1.id}/read",
        headers={"Content-Type": "application/json"}
    )
    
    # Get unread again
    response = data["test_client"].get(
        "/notifications/unread",
        headers={"Content-Type": "application/json"}
    )
    notifications = response.get_json()
    assert len(notifications) == 1
    assert notifications[0]["id"] == notification2.id
