"""
User management endpoints
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, ValidationError, fields, validate
from werkzeug.security import check_password_hash, generate_password_hash

from ..models import User, UserSchema

bp = Blueprint("user", __name__, url_prefix="/user")

# Create schema instances once (reusable)
user_schema = UserSchema()


class UserUpdateSchema(Schema):
    """Schema for updating user information"""

    name = fields.Str(validate=validate.Length(min=1, max=255))


user_update_schema = UserUpdateSchema()


@bp.route("/", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current authenticated user information"""
    email = get_jwt_identity()
    user = User.get_by_email(email)

    if not user:
        return jsonify({"msg": "User not found"}), 404
    return jsonify(user_schema.dump(user)), 200


@bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_by_id(user_id):
    """Get user by ID (users can view their own info, teachers/admins can view anyone)"""
    current_email = get_jwt_identity()
    current_user = User.get_by_email(current_email)

    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Users can view their own info, teachers and admins can view anyone
    if current_user.id != user_id and not current_user.has_role("teacher", "admin"):
        return jsonify({"msg": "Insufficient permissions"}), 403

    return jsonify(user_schema.dump(user)), 200


@bp.route("/", methods=["PUT"])
@jwt_required()
def update_current_user():
    """Update current user information"""
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    # Validate input with Marshmallow
    try:
        data = user_update_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"msg": "Validation error", "errors": err.messages}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Update allowed fields
    if "name" in data:
        user.name = data["name"]

    user.update()

    return jsonify(user_schema.dump(user)), 200


@bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    """Delete user (admin only or own account)"""
    current_email = get_jwt_identity()
    current_user = User.get_by_email(current_email)

    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Users can delete their own account, admins can delete anyone
    if current_user.id != user_id and not current_user.is_admin():
        return jsonify({"msg": "Insufficient permissions"}), 403

    user.delete()

    return jsonify({"msg": "User deleted successfully"}), 200


@bp.route("/password", methods=["PATCH"])
@jwt_required()
def change_password():
    """Change current user's password (only if must_change_password is True)"""
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    current_password = request.json.get("current_password", None)
    new_password = request.json.get("new_password", None)

    if not current_password:
        return jsonify({"msg": "Current password is required"}), 400
    if not new_password:
        return jsonify({"msg": "New password is required"}), 400
    if len(new_password) < 6:
        return jsonify({"msg": "New password must be at least 6 characters"}), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Security: Only allow password changes if must_change_password is True
    if not user.must_change_password:
        return jsonify({"msg": "Password change not required for this account"}), 403

    # Verify current password
    if not check_password_hash(user.hash_pass, current_password):
        return jsonify({"msg": "Current password is incorrect"}), 401

    # Update password and clear must_change_password flag
    user.hash_pass = generate_password_hash(new_password)
    user.must_change_password = False
    user.update()

    return jsonify({"msg": "Password updated successfully"}), 200
