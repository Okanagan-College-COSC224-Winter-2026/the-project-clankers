"""
Admin management endpoints
Only admin users can access these endpoints
"""

import re
import string
import secrets
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.security import generate_password_hash

from ..models import User, UserSchema
from .auth_controller import jwt_admin_required

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/users", methods=["GET"])
@jwt_admin_required
def list_all_users():
    """List all users (admin only)"""
    users = User.query.all()
    return jsonify(UserSchema(many=True).dump(users)), 200


@bp.route("/users/create", methods=["POST"])
@jwt_admin_required
def create_user():
    """Create a new user with any role (admin only)"""
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    name = request.json.get("name", None)
    password = request.json.get("password", None)
    email = request.json.get("email", None)
    role = request.json.get("role", "student")
    must_change_password = request.json.get("must_change_password", False)

    if not name:
        return jsonify({"msg": "Name is required"}), 400
    if not password:
        return jsonify({"msg": "Password is required"}), 400
    if not email:
        return jsonify({"msg": "Email is required"}), 400

    # Validate role
    if role not in ["student", "teacher", "admin"]:
        return jsonify({"msg": "Invalid role. Must be 'student', 'teacher', or 'admin'"}), 400

    # Check if user already exists
    existing_user = User.get_by_email(email)
    if existing_user:
        return jsonify({"msg": f"User with email {email} is already registered"}), 400

    # Create new user
    new_user = User(
        name=name,
        hash_pass=generate_password_hash(password),
        email=email,
        role=role,
        must_change_password=must_change_password
    )
    User.create_user(new_user)

    return (
        jsonify(
            {
                "msg": f"{role.capitalize()} account created successfully",
                "user": UserSchema().dump(new_user),
            }
        ),
        201,
    )


@bp.route("/users/<int:user_id>/role", methods=["PUT"])
@jwt_admin_required
def update_user_role(user_id):
    """Update a user's role (admin only)"""
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    new_role = request.json.get("role", None)

    if not new_role:
        return jsonify({"msg": "Role is required"}), 400

    # Validate role
    if new_role not in ["student", "teacher", "admin"]:
        return jsonify({"msg": "Invalid role. Must be 'student', 'teacher', or 'admin'"}), 400

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Prevent self-demotion from admin
    current_email = get_jwt_identity()
    current_user = User.get_by_email(current_email)
    if current_user.id == user_id and new_role != "admin":
        return jsonify({"msg": "Cannot demote yourself from admin role"}), 400

    old_role = user.role
    user.role = new_role
    user.update()

    return (
        jsonify(
            {
                "msg": f"User role updated from {old_role} to {new_role}",
                "user": UserSchema().dump(user),
            }
        ),
        200,
    )


@bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_admin_required
def update_user(user_id):
    """Update user details (name, email, role, password, student_id) - admin only"""
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Get current user for permission checks
    current_email = get_jwt_identity()
    current_user = User.get_by_email(current_email)

    # Extract optional fields
    name = request.json.get("name", None)
    email = request.json.get("email", None)
    role = request.json.get("role", None)
    password = request.json.get("password", None)
    student_id = request.json.get("student_id", None)

    # Update name if provided
    if name is not None and name != "":
        user.name = name

    # Update student_id if provided (only for students)
    if student_id is not None:
        # Allow empty string to clear student_id, otherwise require it for students
        if student_id == "":
            user.student_id = None
        else:
            # Check if student_id is already taken by another student
            existing_student = User.query.filter_by(student_id=student_id).first()
            if existing_student and existing_student.id != user_id:
                return jsonify({"msg": f"Student ID {student_id} is already in use by another student"}), 400
            user.student_id = student_id

    # Update email if provided
    if email is not None and email != "":
        # Check if email is already taken by another user
        existing_user = User.get_by_email(email)
        if existing_user and existing_user.id != user_id:
            return jsonify({"msg": f"Email {email} is already in use"}), 400
        user.email = email

    # Update role if provided
    if role is not None:
        # Validate role
        if role not in ["student", "teacher", "admin"]:
            return jsonify({"msg": "Invalid role. Must be 'student', 'teacher', or 'admin'"}), 400

        # Prevent self-demotion from admin
        if current_user.id == user_id and role != "admin":
            return jsonify({"msg": "Cannot demote yourself from admin role"}), 400

        user.role = role

    # Update password if provided
    if password is not None and password != "":
        # Validate password strength
        if len(password) < 8:
            return jsonify({"msg": "Password must be at least 8 characters"}), 400
        if not any(c.isupper() for c in password):
            return jsonify({"msg": "Password must contain an uppercase letter"}), 400
        if not any(c.islower() for c in password):
            return jsonify({"msg": "Password must contain a lowercase letter"}), 400
        if not any(c.isdigit() for c in password):
            return jsonify({"msg": "Password must contain a number"}), 400
        if not any(c in "!@#$%^&*" for c in password):
            return jsonify({"msg": "Password must contain a special character (!@#$%^&*)"}), 400

        user.hash_pass = generate_password_hash(password)

    # Save changes
    try:
        user.update()
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"msg": "Student ID or Email already in use"}), 400
        return jsonify({"msg": f"Error updating user: {str(e)}"}), 500

    return jsonify({
        "msg": "User updated successfully",
        "user": UserSchema().dump(user)
    }), 200


@bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    current_email = get_jwt_identity()
    current_user = User.get_by_email(current_email)

    # Prevent self-deletion
    if current_user.id == user_id:
        return jsonify({"msg": "Cannot delete your own account"}), 400

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Check if teacher has any classes (active or archived)
    if user.role == "teacher":
        from ..models import Course
        has_courses = Course.query.filter_by(teacherID=user_id).first()
        if has_courses:
            return jsonify({"msg": "Cannot delete a teacher with existing classes. Please delete or reassign all their classes first."}), 400

    try:
        # Delete related reviews first (as reviewer and reviewee)
        from ..models import Review
        Review.query.filter((Review.reviewerID == user_id) | (Review.revieweeID == user_id)).delete()

        # Delete the user
        user.delete()
        return jsonify({"msg": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"msg": f"Error deleting user: {str(e)}"}), 500


def csv_to_list(csv_string):
    """
    Parse CSV string into a list of student dictionaries.
    CSV format: id, name, email
    Returns: (list of dicts, list of error messages)
    """
    REQUIRED_HEADERS = ["id", "name", "email"]
    rows = []
    errors = []

    lines = csv_string.strip().split('\n')

    # Parse header
    if not lines:
        return [], ["CSV file is empty"]

    header_line = lines[0].strip()
    try:
        headers = [h.strip().lower() for h in header_line.split(',')]
    except Exception as e:
        return [], [f"Error parsing header: {str(e)}"]

    # Validate headers
    if headers != REQUIRED_HEADERS:
        return [], [f"Invalid headers. Expected: {', '.join(REQUIRED_HEADERS)}, Got: {', '.join(headers)}"]

    # Parse rows
    for line_num, line in enumerate(lines[1:], start=2):
        line = line.strip()
        if not line:
            continue

        try:
            values = [v.strip() for v in line.split(',')]
        except Exception as e:
            errors.append(f"Line {line_num}: Error parsing row: {str(e)}")
            continue

        if len(values) != len(headers):
            errors.append(f"Line {line_num}: Expected {len(headers)} columns, got {len(values)}")
            continue

        normalized = dict(zip(headers, values))

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


@bp.route("/import_students", methods=["POST"])
@jwt_admin_required
def import_students():
    """
    Import students into the system via CSV (admin only).
    CSV format: id, name, email
    - If student_id exists in system, skip (already in system)
    - If student_id doesn't exist, create new user with temporary password
    - Temporary passwords are unique and students must change them on first login
    - Students are NOT enrolled in any course
    """

    data = request.get_json()
    student_emails_csv = data.get("students", "")

    if not student_emails_csv:
        return jsonify({"msg": "Student roster is required"}), 400

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

    created_students = []
    existing_students = []  # Students who already exist in the system

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
        else:
            # Track students who already exist in the system
            existing_students.append({
                "email": email,
                "student_id": student_id,
                "name": name
            })

    response_data = {
        "msg": f"{len(created_students)} new students added to the system",
        "created_count": len(created_students),
        "existing_count": len(existing_students)
    }

    # Include temporary passwords in response for admin to distribute
    if created_students:
        response_data["new_students"] = created_students

    # Include existing accounts
    if existing_students:
        response_data["existing_students"] = existing_students

    return jsonify(response_data), 200
