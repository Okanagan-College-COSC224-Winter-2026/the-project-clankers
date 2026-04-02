"""
Student submission controller - handles student file uploads for assignments
"""

import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import (
    db,
    User,
    Assignment,
    Course,
    StudentSubmission,
    StudentSubmissionSchema,
    User_Course,
    CourseGroup,
    Group_Members,
)
from .auth_controller import jwt_role_required

bp = Blueprint("student_submission", __name__, url_prefix="/submissions")


def allowed_submission_file(filename):
    """Check if file has an allowed extension for student submissions"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"]


@bp.route("/upload/<int:assignment_id>", methods=["POST"])
@jwt_required()
def upload_student_submission(assignment_id):
    """Upload a file submission or text submission to an assignment (students only)"""
    # Check if either file or text is provided
    has_file = "file" in request.files and request.files["file"].filename != ""
    has_text = "submissionText" in request.form and request.form["submissionText"].strip() != ""

    if not has_file and not has_text:
        return jsonify({"msg": "No file or text provided"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Check if user is a student (not teacher/admin)
    if user.is_teacher() or user.is_admin():
        return jsonify({"msg": "Only students can submit to assignments"}), 403

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    # Check if student is enrolled in the course
    enrollment = User_Course.query.filter_by(userID=user.id, courseID=course.id).first()
    if not enrollment:
        return jsonify({"msg": "Unauthorized: You are not enrolled in this course"}), 403

    if has_text:
        # Handle text submission
        submission_text = request.form["submissionText"].strip()
        new_submission = StudentSubmission(
            assignment_id=assignment_id,
            student_id=user.id,
            submission_text=submission_text,
        )
        StudentSubmission.create(new_submission)
        return jsonify({
            "msg": "Text submitted successfully",
            "submission": StudentSubmissionSchema().dump(new_submission)
        }), 200
    else:
        # Handle file submission
        file = request.files["file"]

        # Validate file type
        if not allowed_submission_file(file.filename):
            return jsonify({
                "msg": "Invalid file type. Allowed types: pdf, docx, txt, zip"
            }), 400

        # Generate unique filename to avoid collisions
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"submission_{assignment_id}_{user.id}_{uuid.uuid4().hex}.{ext}"

        # Ensure submission folder exists
        submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
        os.makedirs(submission_folder, exist_ok=True)

        # Save new file
        filepath = os.path.join(submission_folder, unique_filename)
        file.save(filepath)

        # Create new StudentSubmission record
        # Store original filename for display (unique_filename ensures filesystem safety)
        new_submission = StudentSubmission(
            assignment_id=assignment_id,
            student_id=user.id,
            filename=file.filename,  # Keep original filename with spaces
            file_path=unique_filename,
        )
        StudentSubmission.create(new_submission)

        return jsonify({
            "msg": "File submitted successfully",
            "submission": StudentSubmissionSchema().dump(new_submission)
        }), 200


@bp.route("/assignment/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment_submissions(assignment_id):
    """Get submissions for an assignment
    - Teachers: get all student submissions
    - Students: get only their own submissions
    """
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

    # Check authorization
    if user.is_teacher():
        # Teacher must own the course
        if course.teacherID != user.id:
            return jsonify({"msg": "Unauthorized: You are not the teacher of this course"}), 403
        # Get all submissions for this assignment
        submissions = StudentSubmission.get_by_assignment_id(assignment_id)
    else:
        # Student must be enrolled
        enrollment = User_Course.query.filter_by(userID=user.id, courseID=course.id).first()
        if not enrollment:
            return jsonify({"msg": "Unauthorized: You are not enrolled in this course"}), 403
        
        # Check if this is a group assignment
        if assignment.submission_type == 'group':
            # Find the student's group in this course
            student_group_membership = Group_Members.query.filter_by(userID=user.id).join(
                CourseGroup
            ).filter(CourseGroup.courseID == course.id).first()
            
            if student_group_membership:
                # Get all members of this group
                group_id = student_group_membership.groupID
                group_member_ids = [member.userID for member in Group_Members.query.filter_by(groupID=group_id).all()]
                
                # Get submissions from any group member
                submissions = StudentSubmission.query.filter(
                    StudentSubmission.assignment_id == assignment_id,
                    StudentSubmission.student_id.in_(group_member_ids)
                ).all()
            else:
                # Student is not in a group, return only their own submissions
                submissions = StudentSubmission.get_by_student_and_assignment(user.id, assignment_id)
        else:
            # Individual assignment - get only their own submissions
            submissions = StudentSubmission.get_by_student_and_assignment(user.id, assignment_id)

    return jsonify({
        "submissions": StudentSubmissionSchema(many=True).dump(submissions)
    }), 200


@bp.route("/download/<int:submission_id>", methods=["GET"])
@jwt_required()
def download_submission(submission_id):
    """Download a student submission file
    - Teachers can download any submission from their courses
    - Students can download their own submissions
    - For group assignments: group members can download from their group
    - For peer review: students can download if the assignment has reviews enabled
    - Note: Text submissions cannot be downloaded, only viewed
    """
    submission = StudentSubmission.get_by_id(submission_id)
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    # Check if this is a text submission
    if submission.submission_text:
        return jsonify({"msg": "Text submissions cannot be downloaded"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    assignment = Assignment.get_by_id(submission.assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    # Authorization check
    is_teacher = (user.is_teacher() and course.teacherID == user.id) or user.is_admin()
    is_owner = submission.student_id == user.id
    is_group_member = False
    is_peer_reviewer = False

    # Check if user is enrolled in the course
    enrollment = User_Course.query.filter_by(userID=user.id, courseID=course.id).first()
    if not enrollment:
        return jsonify({"msg": "Unauthorized: You are not enrolled in this course"}), 403

    # Check if this is a group assignment and user is in same group
    if not is_owner and assignment.submission_type == 'group':
        # Find the user's group
        user_group_membership = Group_Members.query.filter_by(userID=user.id).join(
            CourseGroup
        ).filter(CourseGroup.courseID == course.id).first()

        # Find the submitter's group
        submitter_group_membership = Group_Members.query.filter_by(userID=submission.student_id).join(
            CourseGroup
        ).filter(CourseGroup.courseID == course.id).first()

        # If both are in a group and it's the same group, allow access
        if user_group_membership and submitter_group_membership and user_group_membership.groupID == submitter_group_membership.groupID:
            is_group_member = True

    # Check if user is a peer reviewer (enrolled and peer review is enabled)
    if not is_owner and not is_group_member and enrollment:
        if assignment.internal_review or assignment.external_review:
            is_peer_reviewer = True

    if not (is_teacher or is_owner or is_group_member or is_peer_reviewer):
        return jsonify({"msg": "Unauthorized: You cannot access this submission"}), 403

    # Send file
    submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
    file_path = os.path.join(submission_folder, submission.file_path)

    if not os.path.exists(file_path):
        return jsonify({"msg": "File not found on server"}), 404

    return send_from_directory(
        submission_folder,
        submission.file_path,
        as_attachment=True,
        download_name=submission.filename  # Use original filename for download
    )


@bp.route("/peer-review/<int:assignment_id>/<int:target_id>", methods=["GET"])
@jwt_required()
def get_peer_review_submissions(assignment_id, target_id):
    """Get submissions for peer review
    For individual assignments: get submissions from the target student
    For group assignments: get submissions from all members of the target group
    """
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

    # Check if user is enrolled in the course
    enrollment = User_Course.query.filter_by(userID=user.id, courseID=course.id).first()
    if not enrollment:
        return jsonify({"msg": "Unauthorized: You are not enrolled in this course"}), 403

    # Get query parameter to determine if target is a student or group
    target_type = request.args.get('type', 'user')  # 'user' or 'group'

    if target_type == 'group':
        # Get all members of the target group
        group_member_ids = [member.userID for member in Group_Members.query.filter_by(groupID=target_id).all()]
        if not group_member_ids:
            return jsonify({"submissions": []}), 200

        # Get submissions from any group member
        submissions = StudentSubmission.query.filter(
            StudentSubmission.assignment_id == assignment_id,
            StudentSubmission.student_id.in_(group_member_ids)
        ).all()
    else:
        # Get submissions from the specific student
        submissions = StudentSubmission.get_by_student_and_assignment(target_id, assignment_id)

    return jsonify({
        "submissions": StudentSubmissionSchema(many=True).dump(submissions)
    }), 200


@bp.route("/<int:submission_id>", methods=["DELETE"])
@jwt_required()
def delete_submission(submission_id):
    """Delete a student submission (students can only delete their own)"""
    submission = StudentSubmission.get_by_id(submission_id)
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Only the student who submitted can delete (or maybe teacher later?)
    if submission.student_id != user.id:
        return jsonify({"msg": "Unauthorized: You can only delete your own submissions"}), 403

    # Delete file from filesystem
    submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
    file_path = os.path.join(submission_folder, submission.file_path)

    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete database record
    StudentSubmission.delete(submission)

    return jsonify({"msg": "Submission deleted successfully"}), 200
