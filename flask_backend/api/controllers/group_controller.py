"""
Group controller for managing course-level groups
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import (
    CourseGroup,
    Group_Members,
    Course,
    User,
    User_Course,
    CourseGroupSchema,
    UserSchema
)
from ..models.db import db

bp = Blueprint("group", __name__, url_prefix="/classes")


def jwt_teacher_required(fn):
    """Decorator to require teacher or admin role"""
    @jwt_required()
    def wrapper(*args, **kwargs):
        email = get_jwt_identity()
        user = User.get_by_email(email)
        if not user or not user.has_role('teacher', 'admin'):
            return jsonify({"msg": "Teacher or admin access required"}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


@bp.route("/<int:course_id>/groups", methods=["GET"])
@jwt_required()
def list_class_groups(course_id):
    """Get all groups for a course
    
    Returns:
        Array of groups with their members
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user has access (teacher or enrolled student)
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Check if user is teacher or enrolled
    is_teacher = user.is_teacher() and course.teacherID == user.id
    is_enrolled = User_Course.query.filter_by(courseID=course_id, userID=user.id).first() is not None
    
    if not (is_teacher or is_enrolled or user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get all groups for this course
    groups = CourseGroup.get_by_course_id(course_id)
    
    # Include member count for each group
    result = []
    for group in groups:
        group_data = CourseGroupSchema().dump(group)
        group_data['member_count'] = group.members.count()
        result.append(group_data)
    
    return jsonify(result), 200


@bp.route("/<int:course_id>/groups", methods=["POST"])
@jwt_teacher_required
def create_class_group(course_id):
    """Create a new group in a course
    
    Body:
        {
            "name": "Group 1"
        }
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    data = request.get_json()
    name = data.get("name")
    
    if not name:
        return jsonify({"msg": "Group name is required"}), 400
    
    # Create the group
    new_group = CourseGroup(name=name, courseID=course_id)
    CourseGroup.create_group(new_group)
    
    return jsonify(CourseGroupSchema().dump(new_group)), 201


@bp.route("/<int:course_id>/groups/<int:group_id>", methods=["PUT"])
@jwt_teacher_required
def update_group(course_id, group_id):
    """Update a group (rename)
    
    Body:
        {
            "name": "New Group Name"
        }
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get the group and verify it belongs to this course
    group = CourseGroup.get_by_id(group_id)
    if not group or group.courseID != course_id:
        return jsonify({"msg": "Group not found"}), 404
    
    data = request.get_json()
    name = data.get("name")
    
    if not name:
        return jsonify({"msg": "Group name is required"}), 400
    
    group.name = name
    group.update()
    
    return jsonify(CourseGroupSchema().dump(group)), 200


@bp.route("/<int:course_id>/groups/<int:group_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_group(course_id, group_id):
    """Delete a group (members become unassigned)"""
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get the group and verify it belongs to this course
    group = CourseGroup.get_by_id(group_id)
    if not group or group.courseID != course_id:
        return jsonify({"msg": "Group not found"}), 404
    
    # Delete the group (cascade will remove Group_Members entries)
    group.delete()
    
    return jsonify({"msg": "Group deleted successfully"}), 200


@bp.route("/<int:course_id>/groups/<int:group_id>/members", methods=["GET"])
@jwt_required()
def get_group_members(course_id, group_id):
    """Get members of a specific group
    
    Returns:
        Array of users in the group
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user has access
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    is_teacher = user.is_teacher() and course.teacherID == user.id
    is_enrolled = User_Course.query.filter_by(courseID=course_id, userID=user.id).first() is not None
    
    if not (is_teacher or is_enrolled or user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get the group and verify it belongs to this course
    group = CourseGroup.get_by_id(group_id)
    if not group or group.courseID != course_id:
        return jsonify({"msg": "Group not found"}), 404
    
    # Get members
    members = Group_Members.query.filter_by(groupID=group_id).all()
    users = [User.get_by_id(member.userID) for member in members]
    users = [u for u in users if u is not None]  # Filter out None values
    
    return jsonify(UserSchema(many=True).dump(users)), 200


@bp.route("/<int:course_id>/groups/<int:group_id>/members", methods=["POST"])
@jwt_teacher_required
def add_group_member(course_id, group_id):
    """Add a student to a group
    
    Body:
        {
            "userID": 123
        }
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get the group and verify it belongs to this course
    group = CourseGroup.get_by_id(group_id)
    if not group or group.courseID != course_id:
        return jsonify({"msg": "Group not found"}), 404
    
    data = request.get_json()
    user_id = data.get("userID")
    
    if not user_id:
        return jsonify({"msg": "userID is required"}), 400
    
    # Verify the student exists and is enrolled in the course
    student = User.get_by_id(user_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404
    
    enrollment = User_Course.query.filter_by(courseID=course_id, userID=user_id).first()
    if not enrollment:
        return jsonify({"msg": "Student not enrolled in this course"}), 400
    
    # Check if already in a group for this course
    existing_membership = Group_Members.query.filter_by(userID=user_id).join(
        CourseGroup
    ).filter(CourseGroup.courseID == course_id).first()
    
    if existing_membership:
        # Remove from old group first
        existing_membership.delete()
    
    # Add to new group
    new_member = Group_Members.create_group_member(userID=user_id, groupID=group_id)
    
    return jsonify({"msg": "Member added successfully", "userID": user_id, "groupID": group_id}), 201


@bp.route("/<int:course_id>/groups/<int:group_id>/members/<int:user_id>", methods=["DELETE"])
@jwt_teacher_required
def remove_group_member(course_id, group_id, user_id):
    """Remove a student from a group"""
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get the group and verify it belongs to this course
    group = CourseGroup.get_by_id(group_id)
    if not group or group.courseID != course_id:
        return jsonify({"msg": "Group not found"}), 404
    
    # Get the membership
    member = Group_Members.get(userID=user_id, groupID=group_id)
    if not member:
        return jsonify({"msg": "Member not found in group"}), 404
    
    member.delete()
    
    return jsonify({"msg": "Member removed successfully"}), 200


@bp.route("/<int:course_id>/members/unassigned", methods=["GET"])
@jwt_teacher_required
def get_unassigned_students(course_id):
    """Get students enrolled in course but not in any group
    
    Returns:
        Array of users not assigned to any group
    """
    # Verify course exists
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    # Verify user is the teacher of this course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or (course.teacherID != user.id and not user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get all enrolled students
    enrollments = User_Course.query.filter_by(courseID=course_id).all()
    enrolled_user_ids = [e.userID for e in enrollments]
    
    # Get all students in groups for this course
    assigned_user_ids = db.session.query(Group_Members.userID).join(
        CourseGroup
    ).filter(CourseGroup.courseID == course_id).all()
    assigned_user_ids = [uid[0] for uid in assigned_user_ids]
    
    # Find unassigned students
    unassigned_user_ids = set(enrolled_user_ids) - set(assigned_user_ids)
    
    # Get user objects
    unassigned_users = [User.get_by_id(uid) for uid in unassigned_user_ids]
    unassigned_users = [u for u in unassigned_users if u is not None and u.has_role('student')]
    
    return jsonify(UserSchema(many=True).dump(unassigned_users)), 200
