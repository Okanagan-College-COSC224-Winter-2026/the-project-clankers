"""
Enrollment request and notification endpoints for the peer evaluation app.
Handles student enrollment requests, teacher approval/rejection, and notifications.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import (
    Course,
    EnrollmentRequest,
    EnrollmentRequestSchema,
    Notification,
    NotificationSchema,
    User,
    User_Course,
)
from .auth_controller import jwt_teacher_required

bp = Blueprint("enrollment", __name__, url_prefix="/enrollments")
notification_bp = Blueprint("notification", __name__, url_prefix="/notifications")

# Create schema instances
enrollment_request_schema = EnrollmentRequestSchema()
enrollment_requests_schema = EnrollmentRequestSchema(many=True)
notification_schema = NotificationSchema()
notifications_schema = NotificationSchema(many=True)


@bp.route("/request", methods=["POST"])
@jwt_required()
def request_enrollment():
    """
    Student requests to enroll in a course.
    Creates an enrollment request and notifies the course teacher.
    """
    data = request.get_json()
    course_id = data.get("course_id")

    if not course_id:
        return jsonify({"msg": "Course ID is required"}), 400

    email = get_jwt_identity()
    student = User.get_by_email(email)
    if not student:
        return jsonify({"msg": "User not found"}), 404

    if not student.is_student():
        return jsonify({"msg": "Only students can request enrollment"}), 403

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    # Check if already enrolled
    existing_enrollment = User_Course.get(student.id, course_id)
    if existing_enrollment:
        return jsonify({"msg": "You are already enrolled in this course"}), 400

    # Check if already has a pending request
    existing_request = EnrollmentRequest.get_existing_request(student.id, course_id)
    if existing_request:
        return jsonify({"msg": "You already have a pending enrollment request for this course"}), 400

    # Create enrollment request
    enrollment_request = EnrollmentRequest.create_request(student.id, course_id)

    # Notify the teacher
    teacher = User.get_by_id(course.teacherID)
    message = f"{student.name} has requested to join {course.name}"
    Notification.create_notification(
        user_id=teacher.id,
        type="enrollment_request",
        related_id=enrollment_request.id,
        message=message
    )

    return jsonify({
        "msg": "Enrollment request submitted successfully",
        "request": enrollment_request_schema.dump(enrollment_request)
    }), 201


@bp.route("/teacher/requests", methods=["GET"])
@jwt_teacher_required
def get_teacher_enrollment_requests():
    """
    Get all pending enrollment requests for the teacher's courses.
    Teachers can see and manage requests for their courses.
    """
    email = get_jwt_identity()
    teacher = User.get_by_email(email)
    if not teacher:
        return jsonify({"msg": "User not found"}), 404

    # Get all courses taught by this teacher
    teacher_courses = Course.get_courses_by_teacher(teacher.id)
    course_ids = [course.id for course in teacher_courses]

    # Get all pending requests for these courses
    requests = EnrollmentRequest.query.filter(
        EnrollmentRequest.courseID.in_(course_ids),
        EnrollmentRequest.status == "pending"
    ).order_by(EnrollmentRequest.created_at.desc()).all()

    return jsonify(enrollment_requests_schema.dump(requests)), 200


@bp.route("/course/<int:course_id>/requests", methods=["GET"])
@jwt_teacher_required
def get_course_enrollment_requests(course_id):
    """
    Get all pending enrollment requests for a specific course.
    Only the course teacher (or an admin) may access this.
    """
    email = get_jwt_identity()
    teacher = User.get_by_email(email)
    if not teacher:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != teacher.id and not teacher.is_admin():
        return jsonify({"msg": "Not authorized"}), 403

    requests = EnrollmentRequest.get_pending_for_course(course_id)
    return jsonify(enrollment_requests_schema.dump(requests)), 200


@bp.route("/<int:request_id>/approve", methods=["POST"])
@jwt_teacher_required
def approve_enrollment_request(request_id):
    """
    Approve an enrollment request and enroll the student in the course.
    Only the course teacher can approve requests for their courses.
    """
    email = get_jwt_identity()
    teacher = User.get_by_email(email)
    if not teacher:
        return jsonify({"msg": "User not found"}), 404

    enrollment_request = EnrollmentRequest.get_by_id(request_id)
    if not enrollment_request:
        return jsonify({"msg": "Enrollment request not found"}), 404

    if enrollment_request.status != "pending":
        return jsonify({"msg": f"Request is already {enrollment_request.status}"}), 400

    # Check if teacher owns the course
    course = Course.get_by_id(enrollment_request.courseID)
    if course.teacherID != teacher.id:
        return jsonify({"msg": "You are not authorized to approve this request"}), 403

    # Approve the request
    enrollment_request.approve()

    # Notify the student
    student = User.get_by_id(enrollment_request.studentID)
    message = f"Your request to join {course.name} has been approved!"
    Notification.create_notification(
        user_id=student.id,
        type="enrollment_approved",
        related_id=enrollment_request.id,
        message=message
    )

    return jsonify({
        "msg": "Enrollment request approved successfully",
        "request": enrollment_request_schema.dump(enrollment_request)
    }), 200


@bp.route("/<int:request_id>/reject", methods=["POST"])
@jwt_teacher_required
def reject_enrollment_request(request_id):
    """
    Reject an enrollment request.
    Only the course teacher can reject requests for their courses.
    """
    email = get_jwt_identity()
    teacher = User.get_by_email(email)
    if not teacher:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    notes = data.get("notes")

    enrollment_request = EnrollmentRequest.get_by_id(request_id)
    if not enrollment_request:
        return jsonify({"msg": "Enrollment request not found"}), 404

    if enrollment_request.status != "pending":
        return jsonify({"msg": f"Request is already {enrollment_request.status}"}), 400

    # Check if teacher owns the course
    course = Course.get_by_id(enrollment_request.courseID)
    if course.teacherID != teacher.id:
        return jsonify({"msg": "You are not authorized to reject this request"}), 403

    # Reject the request
    enrollment_request.reject(notes=notes)

    # Notify the student
    student = User.get_by_id(enrollment_request.studentID)
    message = f"Your request to join {course.name} has been rejected."
    if notes:
        message += f" Notes: {notes}"
    Notification.create_notification(
        user_id=student.id,
        type="enrollment_rejected",
        related_id=enrollment_request.id,
        message=message
    )

    return jsonify({
        "msg": "Enrollment request rejected successfully",
        "request": enrollment_request_schema.dump(enrollment_request)
    }), 200


# ============================================================
# NOTIFICATION ENDPOINTS
# ============================================================


@notification_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    """
    Get all notifications for the current user.
    Returns notifications ordered by most recent first.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    notifications = Notification.get_for_user(user.id)
    return jsonify(notifications_schema.dump(notifications)), 200


@notification_bp.route("/unread", methods=["GET"])
@jwt_required()
def get_unread_notifications():
    """
    Get all unread notifications for the current user.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    notifications = Notification.get_unread_for_user(user.id)
    return jsonify(notifications_schema.dump(notifications)), 200


@notification_bp.route("/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_notification_as_read(notification_id):
    """
    Mark a notification as read.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    notification = Notification.get_by_id(notification_id)
    if not notification:
        return jsonify({"msg": "Notification not found"}), 404

    # Check if notification belongs to the user
    if notification.userID != user.id:
        return jsonify({"msg": "You are not authorized to modify this notification"}), 403

    notification.mark_as_read()
    return jsonify({
        "msg": "Notification marked as read",
        "notification": notification_schema.dump(notification)
    }), 200
