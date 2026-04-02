"""
User management endpoints
"""

import os
import uuid
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, ValidationError, fields, validate
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from ..models import User, UserSchema

bp = Blueprint("user", __name__, url_prefix="/user")

# Create schema instances once (reusable)
user_schema = UserSchema()


class UserUpdateSchema(Schema):
    """Schema for updating user information"""

    name = fields.Str(validate=validate.Length(min=1, max=255))
    profile_picture_url = fields.Str(allow_none=True, validate=validate.Length(max=500))


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

    # Students can only view their own profile, teachers/admins can view anyone
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
    
    if "profile_picture_url" in data:
        user.profile_picture_url = data["profile_picture_url"]

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
    """Change current user's password"""
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

    # Verify current password
    if not check_password_hash(user.hash_pass, current_password):
        return jsonify({"msg": "Current password is incorrect"}), 401

    # Prevent setting password to same value
    if check_password_hash(user.hash_pass, new_password):
        return jsonify({"msg": "New password cannot be the same as current password"}), 401

    # Update password and clear must_change_password flag if set
    user.hash_pass = generate_password_hash(new_password)
    if user.must_change_password:
        user.must_change_password = False
    user.update()

    return jsonify({"msg": "Password updated successfully"}), 200


def allowed_file(filename):
    """Check if file has an allowed extension"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


@bp.route("/profile-picture", methods=["POST"])
@jwt_required()
def upload_profile_picture():
    """Upload a profile picture for the current user"""
    # Check if file is in request
    if "file" not in request.files:
        return jsonify({"msg": "No file provided"}), 400

    file = request.files["file"]

    # Check if file was selected
    if file.filename == "":
        return jsonify({"msg": "No file selected"}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            "msg": "Invalid file type. Allowed types: png, jpg, jpeg, gif, webp"
        }), 400

    email = get_jwt_identity()
    user = User.get_by_email(email)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Generate unique filename to avoid collisions
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{user.id}_{uuid.uuid4().hex}.{ext}"
    
    # Delete old profile picture if it exists and is not a URL
    if user.profile_picture_url and not user.profile_picture_url.startswith("http"):
        old_file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], user.profile_picture_url)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except OSError:
                pass  # Ignore errors when deleting old file

    # Save new file
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    # Update user's profile picture URL to the filename
    user.profile_picture_url = filename
    user.update()

    return jsonify({
        "msg": "Profile picture uploaded successfully",
        "profile_picture_url": filename
    }), 200


@bp.route("/profile-picture/<filename>", methods=["GET"])
def serve_profile_picture(filename):
    """Serve a profile picture file"""
    # Secure the filename to prevent directory traversal attacks
    safe_filename = secure_filename(filename)
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], safe_filename)
