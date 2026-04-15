from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.security import generate_password_hash

from ..models import Course, User, User_Course
from .auth_controller import jwt_teacher_required
import re
import csv
import io
import secrets
import string
from typing import List, Dict, Tuple

bp = Blueprint("class", __name__, url_prefix="/class")


@bp.route("/create_class", methods=["POST"])
@jwt_teacher_required
def create_class():
    """Create a new class where the authenticated user is the teacher"""
    data = request.get_json()
    class_name = data.get("name")
    if not class_name:
        return jsonify({"msg": "Class name is required"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    new_class = Course(teacherID=user.id, name=class_name)
    Course.create_course(new_class)
    return jsonify({"msg": "Class created", "class": {"id": new_class.id}}), 201


@bp.route("/browse_classes", methods=["GET"])
@jwt_required()
def get_classes():
    """Retrieve all classes"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    classes = Course.get_all_courses()
    return jsonify([{"id": c.id, "name": c.name, "teacher_name": c.teacher.name if c.teacher else None} for c in classes]), 200


@bp.route("/classes", methods=["GET"])
@jwt_required()
def get_user_classes():
    """Retrieve classes for the authenticated user (if user is a student look up User_Course, if teacher look up Course, else return empty)"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if user.is_teacher():
        courses = Course.get_courses_by_teacher(user.id)
    elif user.is_admin():
        courses = Course.get_all_courses()
    elif user.is_student():
        # Students only see visible (not hidden) courses
        user_courses = User_Course.get_visible_courses_by_student(user.id)
        courses = [Course.get_by_id(uc.courseID) for uc in user_courses]
    else:
        courses = []

    # Return courses with aggregated metrics
    course_data = []
    for course in courses:
        course_info = {
            "id": course.id,
            "name": course.name,
            "student_count": course.get_student_count(),
            "next_due_date": course.get_next_due_date().isoformat() if course.get_next_due_date() else None,
            "pending_reviews_count": course.get_pending_reviews_count()
        }
        course_data.append(course_info)
    
    return jsonify(course_data), 200


@bp.route("/members", methods=["POST"])
@jwt_required()
def get_class_members():
    """Get all members (teacher and students) in a specific class"""
    data = request.get_json()
    class_id = data.get("id")
    
    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400
    
    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404
    
    # Check if current user is teacher or admin to determine what info to show
    current_user_email = get_jwt_identity()
    current_user = User.get_by_email(current_user_email)
    show_sensitive_info = current_user and (current_user.is_teacher() or current_user.is_admin())
    
    members = []
    
    # Add the teacher first
    teacher = User.get_by_id(course.teacherID)
    if teacher:
        member_data = {
            "id": teacher.id,
            "name": teacher.name,
            "role": teacher.role,
            "profile_picture_url": teacher.profile_picture_url,
        }
        if show_sensitive_info:
            member_data["email"] = teacher.email
            member_data["student_id"] = teacher.student_id
        members.append(member_data)
    
    # Get all user-course associations for this course (enrolled students)
    user_courses = User_Course.query.filter_by(courseID=class_id).all()
    
    # Get user details for each enrolled student
    for uc in user_courses:
        user = User.get_by_id(uc.userID)
        if user:
            member_data = {
                "id": user.id,
                "name": user.name,
                "role": user.role,
                "profile_picture_url": user.profile_picture_url,
            }
            if show_sensitive_info:
                member_data["email"] = user.email
                member_data["student_id"] = user.student_id
            members.append(member_data)
    
    return jsonify(members), 200

REQUIRED_HEADERS = {"id", "name", "email"}
def csv_to_list(csv_text):
    """Convert CSV text to a list of emails"""
    rows: List[Dict[str, str]] = []
    errors: List[str] = []
    
    if not csv_text or not csv_text.strip():
        return rows, ["CSV text empty"]
    
    stream = io.StringIO(csv_text.strip())
    try:
        reader = csv.DictReader(stream)
    except Exception as e:
        return rows, [f"Failed to read CSV: {e}"]
    
    headers = {h.strip() for h in reader.fieldnames or []}
    missing = REQUIRED_HEADERS - headers
    if missing:
        errors.append(
            f"Invalid CSV format. Missing required headers: {', '.join(sorted(missing))}. "
            f"Your CSV must have these headers in the first row: id, name, email"
        )
        return rows, errors
    
    for line_num, row in enumerate(reader, start=2):
        if row is None:
            continue
        normalized = {k.strip(): (v.strip() if isinstance(v, str) else "") for k, v in row.items()}
        if not any(normalized.values()):
            continue

        if any(not normalized[field] for field in REQUIRED_HEADERS):
            errors.append(f"Line {line_num}: Missing required fields")
            continue

        rows.append({
            "id": normalized["id"],
            "name": normalized["name"],
            "email": normalized["email"]
        })
    
    return rows, errors

def generate_temporary_password(length=10):
    """Generate a unique temporary password using secrets module"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@bp.route("/enroll_students", methods=["POST"])
@jwt_teacher_required
def enroll_students():
    """
    Enroll students into a class by class ID and roster CSV.
    CSV format: id, name, email
    - If student_id exists in system, add them to course (if not already enrolled)
    - If student_id doesn't exist, create new user with temporary password and enroll
    - Temporary passwords are unique and students must change them on first login
    """

    data = request.get_json()
    class_id = data.get("class_id")
    student_emails_csv = data.get("students", "")

    if not class_id or not student_emails_csv:
        return jsonify({"msg": "Class ID and student roster are required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404
    
    # check if the authenticated user is the teacher of the class
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if course.teacherID != user.id:
        return jsonify({"msg": "You are not authorized to enroll students in this class"}), 403

    students, parse_errors = csv_to_list(student_emails_csv)
    if parse_errors:
        error_message = "\n".join(parse_errors)
        return jsonify({"msg": error_message}), 400

    # Check for duplicate student IDs within the CSV
    student_ids_in_csv = [s["id"] for s in students]
    duplicate_ids = [sid for sid in student_ids_in_csv if student_ids_in_csv.count(sid) > 1]
    if duplicate_ids:
        unique_duplicates = list(set(duplicate_ids))
        return jsonify({
            "msg": f"Duplicate student IDs found in CSV: {', '.join(unique_duplicates)}. "
                   "Each student ID must be unique."
        }), 400

    enrolled_students = []
    created_students = []
    existing_students = []  # Students who were already enrolled in this course
    enrolled_existing_students = []  # Existing accounts newly enrolled in this course
    
    for student_info in students:
        student_id = student_info["id"]
        email = student_info["email"]
        name = student_info["name"]
        
        # validate email format with regex
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"msg": f"Invalid email format: {email}"}), 400
        
        # Check if student_id is already used by another student
        existing_by_id = User.get_by_student_id(student_id)
        existing_by_email = User.get_by_email(email)
        
        # Prevent student_id conflicts
        if existing_by_id and existing_by_email and existing_by_id.id != existing_by_email.id:
            return jsonify({
                "msg": f"Student ID {student_id} is already assigned to {existing_by_id.email}, "
                       f"but email {email} belongs to a different student"
            }), 400
        
        # Prevent reusing a student_id with a different email
        if existing_by_id and not existing_by_email:
            return jsonify({
                "msg": f"Student ID {student_id} is already assigned to {existing_by_id.email}. "
                       f"Cannot use the same student ID for {email}."
            }), 400
        
        # Prevent using an existing email with a different student_id
        if existing_by_email and existing_by_email.student_id and existing_by_email.student_id != student_id:
            return jsonify({
                "msg": f"Email {email} is already registered with student ID {existing_by_email.student_id}. "
                       f"Cannot assign different student ID {student_id} to the same email."
            }), 400
        
        # Determine which student record to use
        student = existing_by_id or existing_by_email
        student_already_existed = student is not None
        
        if not student:
            # Create new student with unique temporary password
            temp_password = generate_temporary_password()
            student = User(
                name=name,
                email=email,
                hash_pass=generate_password_hash(temp_password),
                role="student",
                must_change_password=True,
                student_id=student_id
            )
            try:
                User.create_user(student)
                created_students.append({
                    "email": email,
                    "student_id": student_id,
                    "temp_password": temp_password
                })
            except Exception as e:
                return jsonify({"msg": f"Error creating user {email}: {str(e)}"}), 500

        # Check if already enrolled
        enrollment = User_Course.get(student.id, class_id)
        if not enrollment:
            # Enroll student
            User_Course.add(student.id, class_id)
            enrolled_students.append(email)
            
            # Track existing students who are newly enrolled in this course
            if student_already_existed:
                enrolled_existing_students.append({
                    "email": email,
                    "student_id": student_id,
                    "name": name
                })
        else:
            # Track students who were already enrolled in this course
            existing_students.append({
                "email": email,
                "student_id": student_id,
                "name": name
            })

    response_data = {
        "msg": f"{len(enrolled_students)} students added to course {course.name}",
        "enrolled_count": len(enrolled_students),
        "created_count": len(created_students),
        "existing_count": len(existing_students)
    }
    
    # Include temporary passwords in response for teacher to distribute
    if created_students:
        response_data["new_students"] = created_students
    
    # Include existing accounts that were newly enrolled
    if enrolled_existing_students:
        response_data["enrolled_existing_students"] = enrolled_existing_students
    
    # Include students who were already enrolled in this course
    if existing_students:
        response_data["existing_students"] = existing_students
    
    return jsonify(response_data), 200


@bp.route("/<int:class_id>", methods=["GET"])
@jwt_required()
def get_class_details(class_id):
    """Get details of a specific class by ID"""
    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    # Get the current user to check permissions
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Check if user has access to this class
    # Teachers can see their own classes, students can see classes they're enrolled in, admins can see all
    has_access = False
    if user.is_admin():
        has_access = True
    elif user.is_teacher() and course.teacherID == user.id:
        has_access = True
    elif user.is_student():
        enrollment = User_Course.get(user.id, class_id)
        has_access = enrollment is not None

    if not has_access:
        return jsonify({"msg": "You do not have access to this class"}), 403

    # Get teacher info
    teacher = User.get_by_id(course.teacherID)

    # Get enrolled students count
    student_count = User_Course.query.filter_by(courseID=class_id).count()

    # Get assignments count
    assignments_count = course.assignments.count()

    return jsonify({
        "id": course.id,
        "name": course.name,
        "teacher": {
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email if (user.is_teacher() or user.is_admin()) else None
        },
        "student_count": student_count,
        "assignments_count": assignments_count
    }), 200


@bp.route("/update_class", methods=["PUT"])
@jwt_teacher_required
def update_class():
    """Update class details (currently only name)"""
    data = request.get_json()
    class_id = data.get("id")
    new_name = data.get("name")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    if not new_name or not new_name.strip():
        return jsonify({"msg": "Class name is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    # Check if the authenticated user is the teacher of the class
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "You are not authorized to update this class"}), 403

    # Update the class name
    course.name = new_name.strip()
    course.update()

    return jsonify({
        "msg": "Class updated successfully",
        "class": {
            "id": course.id,
            "name": course.name
        }
    }), 200


@bp.route("/delete_class", methods=["DELETE"])
@jwt_teacher_required
def delete_class():
    """Delete a class (only if no assignments and no enrolled students, or user is admin)"""
    data = request.get_json()
    class_id = data.get("id")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    # Check if the authenticated user is the teacher of the class or an admin
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "You are not authorized to delete this class"}), 403

    if not user.is_admin():
        # Block deletion if assignments exist
        assignments_count = course.assignments.count()
        if assignments_count > 0:
            return jsonify({
                "msg": f"Cannot delete class with {assignments_count} assignment(s). Please delete all assignments first or archive the class."
            }), 400

        # Block deletion if students are enrolled
        student_count = User_Course.query.filter_by(courseID=class_id).count()
        if student_count > 0:
            return jsonify({
                "msg": f"Cannot delete class with {student_count} enrolled student(s). Please remove all students first or archive the class."
            }), 400

    class_name = course.name
    course.delete()

    return jsonify({
        "msg": f"Class '{class_name}' deleted successfully"
    }), 200


@bp.route("/archive_class", methods=["PUT"])
@jwt_teacher_required
def archive_class():
    """Archive a class so it no longer appears in the teacher's dashboard"""
    data = request.get_json()
    class_id = data.get("id")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "You are not authorized to archive this class"}), 403

    class_name = course.name
    course.archive()

    return jsonify({
        "msg": f"Class '{class_name}' archived successfully"
    }), 200


@bp.route("/archived_classes", methods=["GET"])
@jwt_teacher_required
def get_archived_classes():
    """Get all archived classes for the authenticated teacher or all archived classes for admin"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if user.is_admin():
        # Admins can see all archived classes
        archived_courses = Course.query.filter_by(is_archived=True).all()
    else:
        # Teachers can only see their own archived classes
        archived_courses = Course.query.filter_by(teacherID=user.id, is_archived=True).all()

    courses_data = []
    for course in archived_courses:
        # Get teacher info
        teacher = User.get_by_id(course.teacherID)
        # Get student count
        student_count = User_Course.query.filter_by(courseID=course.id).count()
        # Get assignments count
        assignments_count = course.assignments.count()

        courses_data.append({
            "id": course.id,
            "name": course.name,
            "teacher": {
                "id": teacher.id,
                "name": teacher.name,
                "email": teacher.email if user.is_admin() else None
            },
            "student_count": student_count,
            "assignments_count": assignments_count
        })

    return jsonify(courses_data), 200


@bp.route("/unarchive_class", methods=["PUT"])
@jwt_teacher_required
def unarchive_class():
    """Unarchive a class to restore it to the teacher's dashboard"""
    data = request.get_json()
    class_id = data.get("id")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "You are not authorized to unarchive this class"}), 403

    class_name = course.name
    course.is_archived = False
    course.update()

    return jsonify({
        "msg": f"Class '{class_name}' restored successfully"
    }), 200


@bp.route("/hide_class", methods=["PUT"])
@jwt_required()
def hide_class():
    """Hide a class from a student's dashboard view"""
    data = request.get_json()
    class_id = data.get("id")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Only students can hide classes
    if not user.is_student():
        return jsonify({"msg": "Only students can hide classes"}), 403

    # Check if student is enrolled in this class
    enrollment = User_Course.get(user.id, class_id)
    if not enrollment:
        return jsonify({"msg": "You are not enrolled in this class"}), 403

    enrollment.hide()

    return jsonify({
        "msg": f"Class '{course.name}' removed from view"
    }), 200


@bp.route("/unhide_class", methods=["PUT"])
@jwt_required()
def unhide_class():
    """Restore a hidden class to a student's dashboard view"""
    data = request.get_json()
    class_id = data.get("id")

    if not class_id:
        return jsonify({"msg": "Class ID is required"}), 400

    course = Course.get_by_id(class_id)
    if not course:
        return jsonify({"msg": "Class not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Only students can unhide classes
    if not user.is_student():
        return jsonify({"msg": "Only students can unhide classes"}), 403

    # Check if student is enrolled in this class
    enrollment = User_Course.get(user.id, class_id)
    if not enrollment:
        return jsonify({"msg": "You are not enrolled in this class"}), 403

    enrollment.unhide()

    return jsonify({
        "msg": f"Class '{course.name}' restored to view"
    }), 200


@bp.route("/hidden_classes", methods=["GET"])
@jwt_required()
def get_hidden_classes():
    """Get all hidden classes for the authenticated student"""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Only students can view their hidden classes
    if not user.is_student():
        return jsonify({"msg": "Only students can view hidden classes"}), 403

    hidden_user_courses = User_Course.get_hidden_courses_by_student(user.id)
    hidden_courses = []

    for uc in hidden_user_courses:
        course = Course.get_by_id(uc.courseID)
        if course:
            # Get assignments count
            assignments_count = course.assignments.count()
            hidden_courses.append({
                "id": course.id,
                "name": course.name,
                "assignments_count": assignments_count
            })

    return jsonify(hidden_courses), 200


@bp.route("/<int:course_id>/registered_students", methods=["GET"])
@jwt_teacher_required
def get_registered_students_for_course(course_id):
    """
    Get all registered students NOT enrolled in the given course.
    Supports optional ?search= query param to filter by name, email, or student_id.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "Not authorized"}), 403

    # Collect IDs of already-enrolled students
    enrolled_ids = {uc.userID for uc in User_Course.query.filter_by(courseID=course_id).all()}

    search = (request.args.get("search") or "").strip().lower()

    all_students = User.query.filter_by(role="student").order_by(User.name).all()
    result = []
    for s in all_students:
        if s.id in enrolled_ids:
            continue
        if search and not (
            search in s.name.lower()
            or search in s.email.lower()
            or (s.student_id and search in s.student_id.lower())
        ):
            continue
        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "student_id": s.student_id,
        })

    return jsonify(result), 200


@bp.route("/<int:course_id>/enroll_direct", methods=["POST"])
@jwt_teacher_required
def enroll_direct(course_id):
    """
    Directly enroll one or more registered students into a course by user ID.
    Expects JSON: { "student_ids": [1, 2, 3] }
    Idempotent — already-enrolled students are counted but not duplicated.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "Not authorized"}), 403

    data = request.get_json() or {}
    student_ids = data.get("student_ids", [])
    if not student_ids:
        return jsonify({"msg": "No student IDs provided"}), 400

    enrolled_count = 0
    already_enrolled_count = 0
    not_found_count = 0

    for sid in student_ids:
        student = User.get_by_id(sid)
        if not student or not student.is_student():
            not_found_count += 1
            continue
        if User_Course.get(student.id, course_id):
            already_enrolled_count += 1
            continue
        User_Course.add(student.id, course_id)
        enrolled_count += 1

    return jsonify({
        "msg": "Enrollment complete",
        "enrolled_count": enrolled_count,
        "already_enrolled_count": already_enrolled_count,
        "not_found_count": not_found_count,
    }), 200


@bp.route("/<int:course_id>/members/<int:student_id>", methods=["DELETE"])
@jwt_teacher_required
def unenroll_student(course_id, student_id):
    """
    Remove (unenroll) a student from a course.
    Only the course owner or an admin may perform this action.
    """
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.teacherID != user.id and not user.is_admin():
        return jsonify({"msg": "Not authorized"}), 403

    student = User.get_by_id(student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    enrollment = User_Course.get(student_id, course_id)
    if not enrollment:
        return jsonify({"msg": "Student is not enrolled in this course"}), 404

    enrollment.delete()

    return jsonify({"msg": f"{student.name} has been removed from the course"}), 200
