"""
Admin management endpoints
Only admin users can access these endpoints
"""

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
    """Update user details (name, email, role) - admin only"""
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

    # Update name if provided
    if name is not None and name != "":
        user.name = name

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

    # Save changes
    user.update()

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

    user.delete()

    return jsonify({"msg": "User deleted successfully"}), 200
