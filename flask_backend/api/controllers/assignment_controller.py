import os
import uuid
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from ..models import (
    Course,
    Assignment,
    AssignmentFile,
    User,
    AssignmentSchema,
    AssignmentFileSchema,
    CourseGroup,
    Group_Members,
    UserSchema,
    CourseGradePolicy,
    Review,
    Criterion,
    CriteriaDescription,
    Rubric,
    User_Course,
)
from .gradebook_controller import _course_students, _grade_entry
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
    description = data.get("description")
    submission_type = data.get("submission_type", "individual")  # Default to individual
    internal_review = data.get("internal_review", False)  # Default to False
    external_review = data.get("external_review", False)  # Default to False
    anonymous_review = data.get("anonymous_review", False)  # Default to False

    # Validate submission_type
    if submission_type not in ["individual", "group"]:
        return jsonify({"msg": "Invalid submission_type. Must be 'individual' or 'group'"}), 400

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

    peer_review_start_date = data.get("peer_review_start_date")
    if not peer_review_start_date:
        peer_review_start_date = None
    else:
        peer_review_start_date = datetime.fromisoformat(peer_review_start_date)

    peer_review_due_date = data.get("peer_review_due_date")
    if not peer_review_due_date:
        peer_review_due_date = None
    else:
        peer_review_due_date = datetime.fromisoformat(peer_review_due_date)

    if not course_id:
        return jsonify({"msg": "Course ID is required"}), 400
    if not assignment_name:
        return jsonify({"msg": "Assignment name is required"}), 400

    if due_date and peer_review_start_date and peer_review_start_date < due_date:
        return jsonify({"msg": "Peer review start date cannot be before the due date"}), 400
    if due_date and peer_review_due_date and peer_review_due_date < due_date:
        return jsonify({"msg": "Peer review due date cannot be before the due date"}), 400
    if peer_review_start_date and peer_review_due_date and peer_review_due_date < peer_review_start_date:
        return jsonify({"msg": "Peer review due date cannot be before the peer review start date"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404
    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    new_assignment = Assignment(
        courseID=course_id,
        name=assignment_name,
        rubric_text=rubric_text,
        description=description,
        start_date=start_date,
        due_date=due_date,
        submission_type=submission_type,
        internal_review=internal_review,
        external_review=external_review,
        anonymous_review=anonymous_review,
        peer_review_start_date=peer_review_start_date,
        peer_review_due_date=peer_review_due_date
    )
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

    assignment.name = data.get("name", assignment.name)
    assignment.rubric_text = data.get("rubric", assignment.rubric_text)

    if "description" in data:
        assignment.description = data.get("description")

    start_date = data.get("start_date")
    if start_date:
        assignment.start_date = datetime.fromisoformat(start_date)

    due_date = data.get("due_date")
    if due_date:
        assignment.due_date = datetime.fromisoformat(due_date)

    if "submission_type" in data:
        submission_type = data.get("submission_type")
        if submission_type not in ["individual", "group"]:
            return jsonify({"msg": "Invalid submission_type. Must be 'individual' or 'group'"}), 400
        assignment.submission_type = submission_type

    if "internal_review" in data:
        assignment.internal_review = data.get("internal_review", assignment.internal_review)

    if "external_review" in data:
        assignment.external_review = data.get("external_review", assignment.external_review)

    if "anonymous_review" in data:
        assignment.anonymous_review = data.get("anonymous_review", assignment.anonymous_review)

    peer_review_start_date = data.get("peer_review_start_date")
    if peer_review_start_date:
        assignment.peer_review_start_date = datetime.fromisoformat(peer_review_start_date)
    elif "peer_review_start_date" in data and peer_review_start_date is None:
        assignment.peer_review_start_date = None

    peer_review_due_date = data.get("peer_review_due_date")
    if peer_review_due_date:
        assignment.peer_review_due_date = datetime.fromisoformat(peer_review_due_date)
    elif "peer_review_due_date" in data and peer_review_due_date is None:
        assignment.peer_review_due_date = None

    effective_due = assignment.due_date
    effective_pr_start = assignment.peer_review_start_date
    effective_pr_due = assignment.peer_review_due_date
    if effective_due and effective_pr_start and effective_pr_start < effective_due:
        return jsonify({"msg": "Peer review start date cannot be before the due date"}), 400
    if effective_due and effective_pr_due and effective_pr_due < effective_due:
        return jsonify({"msg": "Peer review due date cannot be before the due date"}), 400
    if effective_pr_start and effective_pr_due and effective_pr_due < effective_pr_start:
        return jsonify({"msg": "Peer review due date cannot be before the peer review start date"}), 400

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

    is_teacher = course.teacherID == user.id or user.is_admin()
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
        # Groups are now course-scoped, get count from the course
        course_groups = CourseGroup.get_by_course_id(course.id)
        assignment_data["group_count"] = len(course_groups)
    
    return jsonify(assignment_data), 200


@bp.route("/<int:assignment_id>/gradebook", methods=["GET"])
@jwt_required()
def get_assignment_gradebook(assignment_id):
    """Get gradebook/progress data scoped to a single assignment (teacher/admin only)."""
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

    is_teacher = course.teacherID == user.id
    if not (is_teacher or user.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403

    policy = CourseGradePolicy.get_or_create(course.id)
    students = _course_students(course.id)

    student_rows = []
    grade_values = []
    submitted = 0
    late = 0
    missing = 0

    for student in students:
        entry = _grade_entry(policy, assignment, student, students)
        status = entry["submission_status"]
        if status == "submitted":
            submitted += 1
        elif status == "submitted late":
            late += 1
        else:
            missing += 1

        if entry["effective_grade"] is not None:
            grade_values.append(entry["effective_grade"])

        student_rows.append(
            {
                "student_id": student.id,
                "student_name": student.name,
                "student_number": student.student_id,
                "email": student.email,
                "entry": entry,
            }
        )

    return jsonify(
        {
            "class": {"id": course.id, "name": course.name},
            "assignment": {
                "id": assignment.id,
                "name": assignment.name,
                "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            },
            "policy": {
                "late_penalty_percent": float(policy.late_penalty_percent or 0.0),
                "incomplete_evaluation_penalty_percent": float(
                    policy.incomplete_evaluation_penalty_percent or 0.0
                ),
            },
            "aggregate": {
                "submitted_count": submitted,
                "late_count": late,
                "missing_count": missing,
                "average_grade": round(sum(grade_values) / len(grade_values), 2)
                if grade_values
                else None,
            },
            "students": student_rows,
        }
    ), 200


def allowed_document_file(filename):
    """Check if file has an allowed extension for assignment documents"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"]


@bp.route("/upload_file/<int:assignment_id>", methods=["POST"])
@jwt_teacher_required
def upload_assignment_file(assignment_id):
    """Upload a file (PDF, DOCX, TXT, ZIP) to an assignment (teachers only) - supports multiple files"""
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
            "msg": "Invalid file type. Allowed types: pdf, docx, txt, zip"
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
    
    # Save new file
    filepath = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], unique_filename)
    file.save(filepath)

    # Create new AssignmentFile record
    # Store original filename for display (unique_filename ensures filesystem safety)
    new_file = AssignmentFile(
        assignment_id=assignment_id,
        filename=file.filename,  # Keep original filename with spaces
        file_path=unique_filename,
        uploaded_by=user.id
    )
    AssignmentFile.create(new_file)

    return jsonify({
        "msg": "File uploaded successfully",
        "file": AssignmentFileSchema().dump(new_file)
    }), 200


@bp.route("/files/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment_files(assignment_id):
    """Get all files attached to an assignment (available to enrolled students and teachers)"""
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

    # Get all files for this assignment
    files = AssignmentFile.get_by_assignment_id(assignment_id)
    files_data = AssignmentFileSchema(many=True).dump(files)
    
    return jsonify(files_data), 200


@bp.route("/download_file/<int:file_id>", methods=["GET"])
@jwt_required()
def download_assignment_file(file_id):
    """Download a specific file attached to an assignment (available to enrolled students and teachers)"""
    assignment_file = AssignmentFile.get_by_id(file_id)
    if not assignment_file:
        return jsonify({"msg": "File not found"}), 404

    assignment = Assignment.get_by_id(assignment_file.assignment_id)
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

    # Serve the file with original filename for download
    return send_from_directory(
        current_app.config["ASSIGNMENT_UPLOAD_FOLDER"],
        assignment_file.file_path,
        as_attachment=True,
        download_name=assignment_file.filename
    )


@bp.route("/delete_file/<int:file_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_assignment_file(file_id):
    """Delete a specific file attached to an assignment (teachers only)"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    assignment_file = AssignmentFile.get_by_id(file_id)
    if not assignment_file:
        return jsonify({"msg": "File not found"}), 404

    assignment = Assignment.get_by_id(assignment_file.assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized: You are not the teacher of this class"}), 403

    # Delete file from filesystem
    file_path = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], assignment_file.file_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError as e:
            return jsonify({"msg": f"Error deleting file: {str(e)}"}), 500

    # Delete file record from database
    assignment_file.delete()

    return jsonify({"msg": "File deleted successfully"}), 200


@bp.route("/<int:assignment_id>/student/<int:student_id>/review-summary", methods=["GET"])
@jwt_required()
def get_student_review_summary(assignment_id, student_id):
    """Get a breakdown of reviews given and received by a student for an assignment.
    Teacher/admin only.
    """
    email = get_jwt_identity()
    requester = User.get_by_email(email)
    if not requester:
        return jsonify({"msg": "User not found"}), 404

    if not (requester.is_teacher() or requester.is_admin()):
        return jsonify({"msg": "Unauthorized"}), 403

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    if requester.is_teacher():
        course = Course.get_by_id(assignment.courseID)
        if not course or course.teacherID != requester.id:
            return jsonify({"msg": "Unauthorized"}), 403

    student = User.get_by_id(student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    enrollment = User_Course.get(student_id, assignment.courseID)
    if not enrollment:
        return jsonify({"msg": "Student not enrolled in this course"}), 404

    # Find student's group for this course (if group assignment)
    group_id = None
    if assignment.submission_type == 'group':
        membership = (
            Group_Members.query.filter_by(userID=student_id)
            .join(CourseGroup)
            .filter(CourseGroup.courseID == assignment.courseID)
            .first()
        )
        if membership:
            group_id = membership.groupID

    def calc_grade(review):
        rubric = Rubric.query.filter_by(assignmentID=assignment_id).first()
        if not rubric:
            return None
        criteria = CriteriaDescription.query.filter_by(rubricID=rubric.id).all()
        if not criteria:
            return None
        percentages = []
        for cd in criteria:
            c = Criterion.query.filter_by(reviewID=review.id, criterionRowID=cd.id).first()
            if c and c.grade is not None:
                max_score = cd.scoreMax if cd.hasScore and cd.scoreMax > 0 else 100
                percentages.append((c.grade / max_score) * 100)
        return round(sum(percentages) / len(percentages), 1) if percentages else None

    given_reviews = []
    if assignment.submission_type == 'group' and assignment.internal_review and group_id:
        for r in Review.query.filter_by(assignmentID=assignment_id, reviewerID=student_id, reviewer_type='user', reviewee_type='user').all():
            reviewee = User.get_by_id(r.revieweeID)
            given_reviews.append({"reviewee_name": reviewee.name if reviewee else f"User {r.revieweeID}", "grade": calc_grade(r), "type": "internal"})
    if assignment.external_review:
        if assignment.submission_type == 'group' and group_id:
            for r in Review.query.filter_by(assignmentID=assignment_id, reviewerID=group_id, reviewer_type='group', reviewee_type='group').all():
                g = CourseGroup.get_by_id(r.revieweeID)
                given_reviews.append({"reviewee_name": g.name if g else f"Group {r.revieweeID}", "grade": calc_grade(r), "type": "external"})
        else:
            for r in Review.query.filter_by(assignmentID=assignment_id, reviewerID=student_id, reviewer_type='user', reviewee_type='user').all():
                reviewee = User.get_by_id(r.revieweeID)
                given_reviews.append({"reviewee_name": reviewee.name if reviewee else f"User {r.revieweeID}", "grade": calc_grade(r), "type": "external"})

    received_reviews = []
    if assignment.submission_type == 'group' and assignment.internal_review:
        for r in Review.query.filter_by(assignmentID=assignment_id, revieweeID=student_id, reviewer_type='user', reviewee_type='user').all():
            reviewer = User.get_by_id(r.reviewerID)
            received_reviews.append({"reviewer_name": reviewer.name if reviewer else f"User {r.reviewerID}", "grade": calc_grade(r), "type": "internal"})
    if assignment.external_review:
        if assignment.submission_type == 'group' and group_id:
            for r in Review.query.filter_by(assignmentID=assignment_id, revieweeID=group_id, reviewer_type='group', reviewee_type='group').all():
                g = CourseGroup.get_by_id(r.reviewerID)
                received_reviews.append({"reviewer_name": g.name if g else f"Group {r.reviewerID}", "grade": calc_grade(r), "type": "external"})
        else:
            for r in Review.query.filter_by(assignmentID=assignment_id, revieweeID=student_id, reviewer_type='user', reviewee_type='user').all():
                reviewer = User.get_by_id(r.reviewerID)
                received_reviews.append({"reviewer_name": reviewer.name if reviewer else f"User {r.reviewerID}", "grade": calc_grade(r), "type": "external"})

    def avg(items):
        graded = [i["grade"] for i in items if i["grade"] is not None]
        return round(sum(graded) / len(graded), 1) if graded else None

    return jsonify({
        "student": {"id": student.id, "name": student.name},
        "reviews_given": given_reviews,
        "reviews_received": received_reviews,
        "avg_given": avg(given_reviews),
        "avg_received": avg(received_reviews),
    }), 200