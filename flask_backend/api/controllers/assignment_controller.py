import os
import uuid
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

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


def allowed_document_file(filename):
    """Check if file has an allowed extension for assignment documents"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"]


@bp.route("/upload_file/<int:assignment_id>", methods=["POST"])
@jwt_teacher_required
def upload_assignment_file(assignment_id):
    """Upload a file (PDF, DOCX, TXT) to an assignment (teachers only)"""
    # Check if file is in request
    if "file" not in request.files:
        return jsonify({"msg": "No file provided"}), 400

    file = request.files["file"]

    # Check if file was selected
    if file.filename == "":
        return jsonify({"msg": "No file selected"}), 400

    # Validate file type
    if not allowed_document_file(file.filename):
        return jsonify({
            "msg": "Invalid file type. Allowed types: pdf, docx, txt"
        }), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    # Generate unique filename to avoid collisions
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{assignment_id}_{uuid.uuid4().hex}.{ext}"
    
    # Delete old attachment if it exists
    if assignment.attachment_path:
        old_file_path = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], assignment.attachment_path)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except OSError:
                pass  # Ignore errors when deleting old file

    # Save new file
    filepath = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], unique_filename)
    file.save(filepath)

    # Update assignment with file information
    assignment.attachment_filename = secure_filename(file.filename)  # Store original filename
    assignment.attachment_path = unique_filename  # Store unique filename
    assignment.update()

    return jsonify({
        "msg": "File uploaded successfully",
        "attachment_filename": assignment.attachment_filename,
        "attachment_path": assignment.attachment_path
    }), 200


@bp.route("/download_file/<int:assignment_id>", methods=["GET"])
@jwt_required()
def download_assignment_file(assignment_id):
    """Download the file attached to an assignment (available to enrolled students and teachers)"""
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

    # Check if user has access to this assignment
    is_teacher = course.teacherID == user.id
    is_enrolled = any(student.id == user.id for student in course.students)
    
    if not (is_teacher or is_enrolled):
        return jsonify({"msg": "Unauthorized: You do not have access to this assignment"}), 403

    # Check if file exists
    if not assignment.attachment_path:
        return jsonify({"msg": "No file attached to this assignment"}), 404

    # Serve the file with original filename for download
    return send_from_directory(
        current_app.config["ASSIGNMENT_UPLOAD_FOLDER"],
        assignment.attachment_path,
        as_attachment=True,
        download_name=assignment.attachment_filename
    )


@bp.route("/delete_file/<int:assignment_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_assignment_file(assignment_id):
    """Delete the file attached to an assignment (teachers only)"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    # Check if file exists
    if not assignment.attachment_path:
        return jsonify({"msg": "No file attached to this assignment"}), 404

    # Delete file from filesystem
    file_path = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], assignment.attachment_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError as e:
            return jsonify({"msg": f"Error deleting file: {str(e)}"}), 500

    # Clear file fields in database
    assignment.attachment_filename = None
    assignment.attachment_path = None
    assignment.update()

    return jsonify({"msg": "File deleted successfully"}), 200