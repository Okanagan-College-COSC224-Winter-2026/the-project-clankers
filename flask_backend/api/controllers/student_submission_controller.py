"""
Student submission controller - handles student file uploads for assignments
"""

import os
import uuid
from datetime import datetime, timezone
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

    # Check if course is archived
    if course.is_archived:
        return jsonify({"msg": "Cannot submit to an archived class"}), 403

    # Check if student is enrolled in the course
    enrollment = User_Course.query.filter_by(userID=user.id, courseID=course.id).first()
    if not enrollment:
        return jsonify({"msg": "Unauthorized: You are not enrolled in this course"}), 403

    # Build a single submission with text and/or file
    submission_text = None
    filename = None
    file_path_val = None

    if has_text:
        submission_text = request.form["submissionText"].strip()

    if has_file:
        file = request.files["file"]

        if not allowed_submission_file(file.filename):
            return jsonify({
                "msg": "Invalid file type. Allowed types: pdf, docx, txt, zip"
            }), 400

        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"submission_{assignment_id}_{user.id}_{uuid.uuid4().hex}.{ext}"

        submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
        os.makedirs(submission_folder, exist_ok=True)

        filepath = os.path.join(submission_folder, unique_filename)
        file.save(filepath)

        filename = file.filename
        file_path_val = unique_filename

    new_submission = StudentSubmission(
        assignment_id=assignment_id,
        student_id=user.id,
        filename=filename,
        file_path=file_path_val,
        submission_text=submission_text,
    )
    StudentSubmission.create(new_submission)

    return jsonify({
        "msg": "Submission uploaded successfully"
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

    # Teachers/admins skip enrollment check; students must be enrolled
    enrollment = None
    if not is_teacher:
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


@bp.route("/<int:submission_id>", methods=["PUT"])
@jwt_required()
def edit_submission(submission_id):
    """Edit an existing submission (students can only edit their own)
    - For text submissions: update the submission_text field
    - For file submissions: replace the file with a new upload
    """
    submission = StudentSubmission.get_by_id(submission_id)
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if submission.student_id != user.id:
        return jsonify({"msg": "Unauthorized: You can only edit your own submissions"}), 403

    # Check if course/assignment is archived
    assignment = Assignment.get_by_id(submission.assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.is_archived:
        return jsonify({"msg": "Cannot edit submissions in an archived class"}), 403

    has_file = "file" in request.files and request.files["file"].filename != ""
    has_text = "submissionText" in request.form
    remove_file = request.form.get("removeFile") == "true"

    if not has_file and not has_text and not remove_file:
        return jsonify({"msg": "No changes provided"}), 400

    # Update text (can be set or cleared)
    if has_text:
        text_val = request.form["submissionText"].strip()
        submission.submission_text = text_val if text_val else None

    # Remove existing file if requested
    if remove_file and not has_file:
        if submission.file_path:
            submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
            old_file = os.path.join(submission_folder, submission.file_path)
            if os.path.exists(old_file):
                os.remove(old_file)
        submission.filename = None
        submission.file_path = None

    # Replace file if a new one is uploaded
    if has_file:
        file = request.files["file"]
        if not allowed_submission_file(file.filename):
            return jsonify({"msg": "Invalid file type. Allowed types: pdf, docx, txt, zip"}), 400

        submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
        os.makedirs(submission_folder, exist_ok=True)

        # Delete old file if it exists
        if submission.file_path:
            old_file = os.path.join(submission_folder, submission.file_path)
            if os.path.exists(old_file):
                os.remove(old_file)

        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"submission_{submission.assignment_id}_{user.id}_{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(submission_folder, unique_filename)
        file.save(filepath)

        submission.filename = file.filename
        submission.file_path = unique_filename

    # Ensure at least text or file remains
    if not submission.submission_text and not submission.file_path:
        return jsonify({"msg": "Submission must have at least text or a file"}), 400

    submission.submitted_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"msg": "Submission updated successfully"}), 200


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

    # Check if course/assignment is archived
    assignment = Assignment.get_by_id(submission.assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course = Course.get_by_id(assignment.courseID)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.is_archived:
        return jsonify({"msg": "Cannot delete submissions in an archived class"}), 403

    # Delete file from filesystem
    if submission.file_path:
        submission_folder = os.path.join(current_app.config["ASSIGNMENT_UPLOAD_FOLDER"], "submissions")
        file_path = os.path.join(submission_folder, submission.file_path)

        if os.path.exists(file_path):
            os.remove(file_path)

    # Delete database record
    StudentSubmission.delete(submission)

    return jsonify({"msg": "Submission deleted successfully"}), 200
