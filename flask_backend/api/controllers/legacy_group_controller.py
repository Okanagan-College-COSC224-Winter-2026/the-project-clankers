"""
Legacy group endpoints for backward compatibility.
These endpoints maintain the old API structure expected by the frontend,
but now work with course-scoped groups instead of assignment-scoped groups.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import Assignment, Course, CourseGroup, Group_Members, User, UserSchema

bp = Blueprint("legacy_groups", __name__)


@bp.route("/list_stu_groups/<int:assignment_id>/<int:student_id>", methods=["GET"])
@jwt_required()
def list_student_groups(assignment_id, student_id):
    """Get group members for a student in the context of an assignment (for peer review)
    
    Returns students in the same group as the requesting student.
    Groups are course-scoped, but this endpoint is called from assignment context.
    """
    # Get assignment to find the course
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404
    
    # Verify requesting user has access
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Verify user is enrolled in the course or is the teacher
    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    is_enrolled = any(s.id == user.id for s in course.students)
    is_teacher = course.teacherID == user.id
    
    if not (is_enrolled or is_teacher or user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Find the student's group in this course
    student_membership = Group_Members.query.filter_by(userID=student_id).first()

    if not student_membership:
        # Student is not in any group
        return jsonify([]), 200

    # Get the group
    group = CourseGroup.get_by_id(student_membership.groupID)
    if not group or group.courseID != course.id:
        # Group doesn't belong to this course
        return jsonify([]), 200

    # Get all members of this group (excluding the student themselves for peer review)
    group_members = Group_Members.query.filter_by(groupID=group.id).all()
    member_users = []

    for membership in group_members:
        if membership.userID != student_id:  # Exclude the student themselves
            member_user = User.get_by_id(membership.userID)
            if member_user:
                member_users.append(member_user)

    # Return user data without passwords
    return jsonify(UserSchema(many=True).dump(member_users)), 200


@bp.route("/list_all_groups/<int:assignment_id>", methods=["GET"])
@jwt_required()
def list_all_groups(assignment_id):
    """Get all groups for an assignment's course (teacher view)
    
    Groups are now course-scoped. This returns all groups in the course
    associated with the assignment.
    """
    # Get assignment to find the course
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404
    
    # Verify requesting user is a teacher
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "Unauthorized: Teacher access required"}), 403
    
    # Get all groups for this course
    groups = CourseGroup.get_by_course_id(course.id)
    
    # Format response with member details
    result = []
    for group in groups:
        group_data = {
            "id": group.id,
            "name": group.name,
            "courseID": group.courseID,
            "members": []
        }
        
        # Get all members of this group
        members = Group_Members.query.filter_by(groupID=group.id).all()
        for membership in members:
            member_user = User.get_by_id(membership.userID)
            if member_user:
                group_data["members"].append({
                    "id": member_user.id,
                    "name": member_user.name,
                    "email": member_user.email
                })
        
        result.append(group_data)
    
    return jsonify(result), 200
