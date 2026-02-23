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
    CriterionSchema
)
from ..models.db import db

bp = Blueprint("review", __name__, url_prefix="")


@bp.route("/create_review", methods=["POST"])
@jwt_required()
def create_review():
    """Create a new review for an assignment"""
    data = request.get_json()
    assignment_id = data.get("assignmentID")
    reviewer_id = data.get("reviewerID")
    reviewee_id = data.get("revieweeID")

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required fields"}), 400

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
        revieweeID=reviewee_id
    ).first()

    if existing_review:
        # Return existing review instead of creating duplicate
        return jsonify(ReviewSchema().dump(existing_review)), 200

    # Create new review
    new_review = Review(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id
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
    """Get a review with its criteria grades
    
    Query params:
        assignmentID: ID of the assignment
        reviewerID: ID of the reviewer
        revieweeID: ID of the reviewee
    
    Returns:
        - grades: array of grades indexed by criteria row position
        - review: full review object with criteria
    """
    assignment_id = request.args.get("assignmentID", type=int)
    reviewer_id = request.args.get("reviewerID", type=int)
    reviewee_id = request.args.get("revieweeID", type=int)

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required query parameters"}), 400

    # Find the review
    review = Review.query.filter_by(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id
    ).first()

    if not review:
        # No review exists yet - return empty grades array
        return jsonify({"grades": [], "review": None}), 200

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
    
    if not (is_teacher or is_participant):
        return jsonify({"msg": "Unauthorized"}), 403

    # Get all criteria for this assignment's rubric
    rubric = assignment.rubrics.first()
    if not rubric:
        return jsonify({"grades": [], "review": ReviewSchema().dump(review)}), 200

    # Get criteria descriptions in order
    criteria_descriptions = rubric.criteria_descriptions.order_by(
        CriteriaDescription.id
    ).all()

    # Build grades array: grades[row_index] = grade_value
    grades = []
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

    review_data = ReviewSchema().dump(review)
    review_data["grades"] = grades

    return jsonify(review_data), 200
