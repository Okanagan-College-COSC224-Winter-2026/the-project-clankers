"""
Review controller for peer review endpoints.

Handles:
- Listing reviews assigned to a student
- Retrieving review details with submission
- Submitting peer feedback
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import (
    User,
    Review,
    Assignment,
    Submission,
    Criterion,
    CriteriaDescription,
    User_Course,
    ReviewListSchema,
    ReviewSchema,
    SubmissionSchema,
    CriteriaDescriptionSchema,
    CriterionSchema,
)
from ..models.db import db

bp = Blueprint("review", __name__, url_prefix="/review")


# ============================================================================
# ENDPOINT 1: GET /review/my-reviews/<assignment_id>
# ============================================================================
@bp.route("/my-reviews/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_my_reviews(assignment_id):
    """
    Get all peer reviews assigned to the current student for a specific assignment.
    
    Returns a list of reviews where the current user is the reviewer (peer evaluator).
    Includes submission data, reviewee info, and review window status.
    
    Args:
        assignment_id: ID of the assignment to fetch reviews for
    
    Returns:
        {
            "reviews": [ReviewData, ...],
            "reviewWindowOpen": boolean,
            "reviewWindowClosesAt": "ISO-8601 timestamp"
        }
    
    Status Codes:
        200: Success
        401: Unauthorized (no valid JWT)
        403: Forbidden (not enrolled in course)
        404: Assignment not found
    """
    # Get current user from JWT
    email = get_jwt_identity()
    current_user = User.get_by_email(email)
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    # Verify assignment exists
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    # Verify user is enrolled in the course
    enrollment = User_Course.query.filter(
        User_Course.userID == current_user.id,
        User_Course.courseID == assignment.courseID,
    ).first()
    if not enrollment:
        return jsonify({"msg": "You are not enrolled in this course"}), 403

    # Query all reviews where current user is the reviewer
    # Use eager loading to prevent N+1 queries
    reviews = (
        Review.query.options(
            db.joinedload(Review.assignment).joinedload("course"),
            db.joinedload(Review.reviewee),
            db.joinedload(Review.reviewer),
        )
        .filter(
            Review.assignmentID == assignment_id,
            Review.reviewerID == current_user.id,
        )
        .all()
    )

    # Serialize reviews
    reviews_data = ReviewListSchema(many=True).dump(reviews)

    # Add submission data to each review
    for i, review in enumerate(reviews):
        submission = Submission.query.filter(
            Submission.assignmentID == assignment_id,
            Submission.studentID == review.revieweeID,
        ).first()
        if submission:
            reviews_data[i]["submission"] = SubmissionSchema().dump(submission)
        
        # Add completion status
        review_is_complete = review.is_complete()
        reviews_data[i]["isCompleted"] = review_is_complete

    # Check if review window is open
    window_open = assignment.is_review_window_open()

    response_data = {
        "reviews": reviews_data,
        "reviewWindowOpen": window_open,
        "reviewWindowClosesAt": assignment.due_date.isoformat()
        if assignment.due_date
        else None,
    }

    return jsonify(response_data), 200


# ============================================================================
# ENDPOINT 2: GET /review/<review_id>
# ============================================================================
@bp.route("/<int:review_id>", methods=["GET"])
@jwt_required()
def get_review(review_id):
    """
    Get a specific peer review with all details needed for the review form.
    
    Includes:
    - Review metadata (reviewer, reviewee, assignment)
    - Submission content (what student submitted)
    - Rubric criteria (what to score)
    - Current review criteria responses (existing feedback if any)
    
    Args:
        review_id: ID of the review to fetch
    
    Returns:
        {
            "review": ReviewData,
            "submission": SubmissionData,
            "rubric": RubricData,
            "criteria": [CriteriaDescriptionData, ...],
            "reviewWindowOpen": boolean,
            "reviewWindowClosesAt": "ISO-8601 timestamp"
        }
    
    Status Codes:
        200: Success
        401: Unauthorized (no valid JWT)
        403: Forbidden (not the assigned reviewer or not enrolled)
        404: Review or submission not found
    """
    # Get current user from JWT
    email = get_jwt_identity()
    current_user = User.get_by_email(email)
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    # Get review with eager-loaded relationships
    review = Review.get_by_id_with_relations(review_id)
    if not review:
        return jsonify({"msg": "Review not found"}), 404

    # Verify current user is the assigned reviewer
    if review.reviewerID != current_user.id:
        return jsonify({"msg": "You are not assigned to review this submission"}), 403

    # Verify user is enrolled in the course
    enrollment = User_Course.query.filter(
        User_Course.userID == current_user.id,
        User_Course.courseID == review.assignment.courseID,
    ).first()
    if not enrollment:
        return jsonify({"msg": "You are not enrolled in this course"}), 403

    # Get submission
    submission = Submission.query.filter(
        Submission.assignmentID == review.assignmentID,
        Submission.studentID == review.revieweeID,
    ).first()
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    # Get rubric and criteria for this assignment
    # For now, use the first rubric (can be extended for multiple rubrics)
    rubric = review.assignment.rubrics.first()
    if not rubric:
        criteria_list = []
    else:
        criteria_list = (
            CriteriaDescription.query.filter(
                CriteriaDescription.rubricID == rubric.id
            )
            .all()
        )

    # Get existing criteria responses for this review
    existing_criteria = Criterion.query.filter(
        Criterion.reviewID == review_id
    ).all()

    # Serialize data
    review_data = ReviewSchema().dump(review)
    submission_data = SubmissionSchema().dump(submission)
    criteria_data = CriteriaDescriptionSchema(many=True).dump(criteria_list)
    existing_criteria_data = CriterionSchema(many=True).dump(existing_criteria)

    # Check if review window is open
    window_open = review.assignment.is_review_window_open()

    response_data = {
        "review": review_data,
        "submission": submission_data,
        "rubric": {
            "id": rubric.id if rubric else None,
            "canComment": rubric.canComment if rubric else True,
        },
        "criteria": criteria_data,
        "existingCriteria": existing_criteria_data,
        "reviewWindowOpen": window_open,
        "reviewWindowClosesAt": review.assignment.due_date.isoformat()
        if review.assignment.due_date
        else None,
    }

    return jsonify(response_data), 200


# ============================================================================
# ENDPOINT 3: POST /review/<review_id>/submit
# ============================================================================
@bp.route("/<int:review_id>/submit", methods=["POST"])
@jwt_required()
def submit_review(review_id):
    """
    Submit peer review feedback.
    
    Saves criteria responses (scores and comments) for each rubric row.
    Marks the review as complete once all required criteria have grades.
    
    Request body:
    {
        "criteria": [
            {
                "criterionRowID": 3,
                "grade": 4,
                "comments": "Great implementation"
            },
            ...
        ]
    }
    
    Args:
        review_id: ID of the review to submit
    
    Returns:
        {
            "msg": "Review submitted successfully",
            "review": ReviewData,
            "markedComplete": boolean
        }
    
    Status Codes:
        200: Success
        400: Review window closed or validation error
        401: Unauthorized (no valid JWT)
        403: Forbidden (not the assigned reviewer)
        404: Review or submission not found
        422: Unprocessable entity (validation failed)
    """
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    # Get current user from JWT
    email = get_jwt_identity()
    current_user = User.get_by_email(email)
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    # Get review with relationships
    review = Review.get_by_id_with_relations(review_id)
    if not review:
        return jsonify({"msg": "Review not found"}), 404

    # Verify current user is the assigned reviewer
    if review.reviewerID != current_user.id:
        return jsonify({"msg": "You are not assigned to review this submission"}), 403

    # Verify user is enrolled in the course
    enrollment = User_Course.query.filter(
        User_Course.userID == current_user.id,
        User_Course.courseID == review.assignment.courseID,
    ).first()
    if not enrollment:
        return jsonify({"msg": "You are not enrolled in this course"}), 403

    # Check if review window is open
    if not review.assignment.is_review_window_open():
        return (
            jsonify({
                "msg": "Review window has closed",
                "type": "REVIEW_WINDOW_CLOSED",
                "closedAt": review.assignment.due_date.isoformat() if review.assignment.due_date else None,
            }),
            400,
        )

    # Verify submission exists
    submission = Submission.query.filter(
        Submission.assignmentID == review.assignmentID,
        Submission.studentID == review.revieweeID,
    ).first()
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    # Parse request data
    data = request.get_json()
    criteria_input = data.get("criteria", [])

    if not criteria_input:
        return jsonify({"msg": "No criteria provided"}), 422

    # Validate and process each criterion
    errors = []
    for criterion_input in criteria_input:
        criterion_row_id = criterion_input.get("criterionRowID")
        grade = criterion_input.get("grade")
        comments = criterion_input.get("comments", "")

        # Validate required fields
        if criterion_row_id is None:
            errors.append({"field": "criterionRowID", "msg": "criterionRowID is required"})
            continue

        if grade is None:
            errors.append({
                "criterionRowID": criterion_row_id,
                "msg": "Grade is required",
            })
            continue

        # Get the criteria description to validate grade range
        criteria_desc = CriteriaDescription.get_by_id(criterion_row_id)
        if not criteria_desc:
            errors.append({
                "criterionRowID": criterion_row_id,
                "msg": "Criteria description not found",
            })
            continue

        # Validate grade is within range
        if not (0 <= grade <= criteria_desc.scoreMax):
            errors.append({
                "criterionRowID": criterion_row_id,
                "msg": f"Grade must be between 0 and {criteria_desc.scoreMax}",
            })
            continue

    # If there are errors, return them
    if errors:
        return jsonify({
            "msg": "Validation failed",
            "type": "VALIDATION_ERROR",
            "errors": errors,
        }), 422

    # Save/update criteria responses
    try:
        for criterion_input in criteria_input:
            criterion_row_id = criterion_input["criterionRowID"]
            grade = criterion_input["grade"]
            comments = criterion_input.get("comments", "")

            # Check if criterion response already exists
            existing = Criterion.query.filter(
                Criterion.reviewID == review_id,
                Criterion.criterionRowID == criterion_row_id,
            ).first()

            if existing:
                # Update existing
                existing.grade = grade
                existing.comments = comments
            else:
                # Create new
                new_criterion = Criterion(
                    reviewID=review_id,
                    criterionRowID=criterion_row_id,
                    grade=grade,
                    comments=comments,
                )
                db.session.add(new_criterion)

        # Commit all changes
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "msg": "Failed to save criteria",
            "type": "DATABASE_ERROR",
            "error": str(e),
        }), 500

    # Refresh review to get updated relationships
    review = Review.get_by_id_with_relations(review_id)
    marked_complete = review.is_complete()

    # Serialize and return
    review_data = ReviewSchema().dump(review)

    response_data = {
        "msg": "Review submitted successfully",
        "review": review_data,
        "markedComplete": marked_complete,
    }

    return jsonify(response_data), 200
