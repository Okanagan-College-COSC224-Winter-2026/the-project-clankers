from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Course, Assignment, User, AssignmentSchema
from .auth_controller import jwt_teacher_required

bp = Blueprint("assignment", __name__, url_prefix="/assignment")

@bp.route("/create_assignment", methods=["POST"])
@jwt_teacher_required
def create_assignment():
    """Create a new assignment for a class where the authenticated user is the teacher"""
    data = request.get_json()
    course_id = data.get("courseID")
    assignment_name = data.get("name")
    rubric_text = data.get("rubric")
    
    start_date = data.get("start_date")
    if not start_date:
        start_date = None
    else:
        start_date = datetime.fromisoformat(start_date)
    
    due_date = data.get("due_date")
    if not due_date:
        due_date = None
    else:
        due_date = datetime.fromisoformat(due_date)

    if not course_id:
        return jsonify({"msg": "Course ID is required"}), 400
    if not assignment_name:
        return jsonify({"msg": "Assignment name is required"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404
    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    new_assignment = Assignment(courseID=course_id, name=assignment_name, rubric_text=rubric_text, start_date=start_date, due_date=due_date)
    Assignment.create(new_assignment)
    return (
        jsonify(
            {
                "msg": "Assignment created",
                "assignment": AssignmentSchema().dump(new_assignment),
            }
        ),
        201,
    )

@bp.route("/edit_assignment/<int:assignment_id>", methods=["PATCH"])
@jwt_teacher_required
def edit_assignment(assignment_id):
    """Edit an existing assignment if the authenticated user is the teacher of the class"""
    data = request.get_json()
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if course is None:
        return jsonify({"msg": "Course not found"}), 404
    
    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    # Check if assignment can still be modified (before due date)
    if not assignment.can_modify():
        return jsonify({"msg": "Assignment cannot be modified after its due date"}), 400

    assignment.name = data.get("name", assignment.name)
    assignment.rubric_text = data.get("rubric", assignment.rubric_text)
    
    start_date = data.get("start_date")
    if start_date:
        assignment.start_date = datetime.fromisoformat(start_date)
    
    due_date = data.get("due_date")
    if due_date:
        assignment.due_date = datetime.fromisoformat(due_date)

    assignment.update()
    return (
        jsonify(
            {
                "msg": "Assignment updated",
                "assignment": AssignmentSchema().dump(assignment),
            }
        ),
        200,
    )
@bp.route("/delete_assignment/<int:assignment_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_assignment(assignment_id):
    """Delete an existing assignment if the authenticated user is the teacher of the class and the due date has not passed"""
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404
    
    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    if not assignment.can_modify():
        return jsonify({"msg": "Assignment cannot be deleted after its due date"}), 400

    assignment.delete()
    return jsonify({"msg": "Assignment deleted"}), 200
    

# the following routes are for getting the assignments for a given course
@bp.route("/<int:class_id>", methods=["GET"])
@jwt_required()
def get_assignments(class_id):
    """Get all assignments for a given class"""
    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    is_teacher = course.teacherID == user.id
    assignments = Assignment.get_by_class_id(class_id)
    
    # Filter out assignments that haven't started yet for students
    if not is_teacher:
        assignments = [a for a in assignments if a.is_visible_to_students()]
    
    assignments_data = AssignmentSchema(many=True).dump(assignments)
    return jsonify(assignments_data), 200


@bp.route("/details/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment_details(assignment_id):
    """Get detailed information for a single assignment including peer review settings"""
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    # Check if user has access to this assignment (is teacher of class or student enrolled)
    is_teacher = course.teacherID == user.id
    is_enrolled = any(student.id == user.id for student in course.students)
    
    if not (is_teacher or is_enrolled):
        return jsonify({"msg": "Unauthorized: You do not have access to this assignment"}), 403
    
    # Check if assignment has started (for students only)
    if not is_teacher and not assignment.is_visible_to_students():
        return jsonify({"msg": "This assignment is not available yet"}), 403

    # Serialize assignment with course data
    assignment_data = AssignmentSchema().dump(assignment)
    
    # Add peer review settings (rubrics)
    from ..models import RubricSchema
    rubrics = assignment.rubrics.all()
    assignment_data["rubrics"] = RubricSchema(many=True).dump(rubrics)
    
    # Add review counts for teachers
    if is_teacher:
        review_count = assignment.reviews.count()
        assignment_data["review_count"] = review_count
        assignment_data["group_count"] = assignment.groups.count()
    
    return jsonify(assignment_data), 200