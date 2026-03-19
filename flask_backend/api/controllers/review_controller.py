"""
Review controller for managing peer reviews and criteria
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import (
    Review,
    Criterion,
    Assignment,
    User,
    CriteriaDescription,
    ReviewSchema,
    CriterionSchema,
    Group_Members
)
from ..models.db import db

bp = Blueprint("review", __name__, url_prefix="")


@bp.route("/user_id", methods=["GET"])
@jwt_required()
def get_current_user_id():
    """Get current authenticated user's ID"""
    email = get_jwt_identity()
    user = User.get_by_email(email)

    if not user:
        return jsonify({"msg": "User not found"}), 404
    return jsonify({"id": user.id}), 200


@bp.route("/create_review", methods=["POST"])
@jwt_required()
def create_review():
    """Create a new review for an assignment"""
    data = request.get_json()
    assignment_id = data.get("assignmentID")
    reviewer_id = data.get("reviewerID")
    reviewee_id = data.get("revieweeID")
    reviewee_type = data.get("revieweeType", "user")  # Default to 'user' for backwards compatibility

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required fields"}), 400

    # Validate reviewee_type
    if reviewee_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid reviewee_type. Must be 'user' or 'group'"}), 400

    # Verify the assignment exists
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    # Verify the authenticated user matches the reviewer
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or user.id != reviewer_id:
        return jsonify({"msg": "Unauthorized"}), 403

    # Check if a review already exists for this combination
    existing_review = Review.query.filter_by(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type
    ).first()

    if existing_review:
        # Return existing review instead of creating duplicate
        return jsonify(ReviewSchema().dump(existing_review)), 200

    # Create new review
    new_review = Review(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type
    )
    Review.create_review(new_review)

    return jsonify(ReviewSchema().dump(new_review)), 201


@bp.route("/create_criterion", methods=["POST"])
@jwt_required()
def create_criterion():
    """Create or update a criterion for a review"""
    data = request.get_json()
    review_id = data.get("reviewID")
    criterion_row_id = data.get("criterionRowID")
    grade = data.get("grade")
    comments = data.get("comments", "")

    if not all([review_id is not None, criterion_row_id is not None]):
        return jsonify({"msg": "Missing required fields"}), 400

    # Verify the review exists and user has permission
    review = Review.get_by_id(review_id)
    if not review:
        return jsonify({"msg": "Review not found"}), 404

    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user or user.id != review.reviewerID:
        return jsonify({"msg": "Unauthorized"}), 403

    # Verify the criterion row exists
    criteria_desc = CriteriaDescription.get_by_id(criterion_row_id)
    if not criteria_desc:
        return jsonify({"msg": "Criterion row not found"}), 404

    # Check if criterion already exists for this review and row
    existing_criterion = Criterion.query.filter_by(
        reviewID=review_id,
        criterionRowID=criterion_row_id
    ).first()

    if existing_criterion:
        # Update existing criterion
        existing_criterion.grade = grade
        existing_criterion.comments = comments
        existing_criterion.update()
        return jsonify(CriterionSchema().dump(existing_criterion)), 200

    # Create new criterion
    new_criterion = Criterion(
        reviewID=review_id,
        criterionRowID=criterion_row_id,
        grade=grade,
        comments=comments
    )
    Criterion.create_criterion(new_criterion)

    return jsonify(CriterionSchema().dump(new_criterion)), 201


@bp.route("/review", methods=["GET"])
@jwt_required()
def get_review():
    """Get a review with its criteria grades and comments

    Query params:
        assignmentID: ID of the assignment
        reviewerID: ID of the reviewer
        revieweeID: ID of the reviewee
        revieweeType: Type of reviewee ('user' or 'group'), defaults to 'user'

    Returns:
        - grades: array of grades indexed by criteria row position
        - comments: array of comments indexed by criteria row position
        - review: full review object with criteria
    """
    assignment_id = request.args.get("assignmentID", type=int)
    reviewer_id = request.args.get("reviewerID", type=int)
    reviewee_id = request.args.get("revieweeID", type=int)
    reviewee_type = request.args.get("revieweeType", "user")  # Default to 'user' for backwards compatibility

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required query parameters"}), 400

    # Validate reviewee_type
    if reviewee_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid revieweeType. Must be 'user' or 'group'"}), 400

    # Find the review
    review = Review.query.filter_by(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type
    ).first()

    if not review:
        # No review exists yet - return empty grades array
        return jsonify({"grades": [], "comments": [], "review": None}), 200

    # Verify user has permission to view this review
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # User can view if they are the reviewer, reviewee, or a teacher
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    is_teacher = user.is_teacher() and assignment.course.teacherID == user.id
    is_participant = user.id in [reviewer_id, reviewee_id]

    # For group assignments, check if the user is a member of the reviewee group
    if not is_participant and assignment.submission_type == 'group':
        # Check if revieweeID is a group and user is a member of it
        group_membership = Group_Members.get(user.id, reviewee_id)
        if group_membership:
            is_participant = True

    if not (is_teacher or is_participant):
        return jsonify({"msg": "Unauthorized"}), 403

    # Get all criteria for this assignment's rubric
    rubric = assignment.rubrics.first()
    if not rubric:
        return jsonify({"grades": [], "comments": [], "review": ReviewSchema().dump(review)}), 200

    # Get criteria descriptions in order
    criteria_descriptions = rubric.criteria_descriptions.order_by(
        CriteriaDescription.id
    ).all()

    # Build grades array: grades[row_index] = grade_value
    # Build comments array: comments[row_index] = comment_text
    grades = []
    comments = []
    for criteria_desc in criteria_descriptions:
        # Find the criterion for this criteria description in the review
        criterion = Criterion.query.filter_by(
            reviewID=review.id,
            criterionRowID=criteria_desc.id
        ).first()

        if criterion and criterion.grade is not None:
            grades.append(criterion.grade)
        else:
            grades.append(None)  # No grade selected for this row

        if criterion and criterion.comments:
            comments.append(criterion.comments)
        else:
            comments.append("")  # No comment for this row

    review_data = ReviewSchema().dump(review)
    review_data["grades"] = grades
    review_data["comments"] = comments

    return jsonify(review_data), 200
