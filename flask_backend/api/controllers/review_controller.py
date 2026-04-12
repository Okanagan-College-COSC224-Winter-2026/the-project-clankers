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
    Group_Members,
    CourseGroup,
    StudentSubmission,
    User_Course,
)
from ..models.db import db


def _has_submission(assignment_id, student_id):
    """Check if a student has at least one submission for the assignment."""
    return (
        StudentSubmission.query.filter_by(
            assignment_id=assignment_id, student_id=student_id
        ).first()
        is not None
    )


def _has_group_submission(assignment_id, group_id):
    """Check if any member of a group has submitted for the assignment."""
    member_ids = [
        m.userID for m in Group_Members.query.filter_by(groupID=group_id).all()
    ]
    if not member_ids:
        return False
    return (
        StudentSubmission.query.filter(
            StudentSubmission.assignment_id == assignment_id,
            StudentSubmission.student_id.in_(member_ids),
        ).first()
        is not None
    )


def _is_late_submission(assignment_id, student_id, due_date):
    """Check if ALL of a student's submissions were after the due date."""
    if due_date is None:
        return False
    submissions = StudentSubmission.query.filter_by(
        assignment_id=assignment_id, student_id=student_id
    ).all()
    if not submissions:
        return False
    # If at least one submission was on time, it's not considered late
    from datetime import timezone as tz
    for sub in submissions:
        sub_time = sub.submitted_at
        if sub_time.tzinfo is None:
            from datetime import timezone as tz2
            sub_time = sub_time.replace(tzinfo=tz2.utc)
        due_aware = due_date
        if due_aware.tzinfo is None:
            due_aware = due_aware.replace(tzinfo=tz2.utc)
        if sub_time <= due_aware:
            return False
    return True

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
    reviewer_type = data.get("reviewerType", "user")  # Default to 'user'

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required fields"}), 400

    # Validate types
    if reviewee_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid reviewee_type. Must be 'user' or 'group'"}), 400
    if reviewer_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid reviewer_type. Must be 'user' or 'group'"}), 400

    # Verify the assignment exists
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    # Check if peer review period is available
    if not assignment.is_peer_review_available():
        if not assignment.is_peer_review_started():
            msg = "Peer reviews are not yet available for this assignment"
            resp = {"msg": msg}
            if assignment.peer_review_start_date:
                resp["peer_review_start_date"] = assignment.peer_review_start_date.isoformat()
            return jsonify(resp), 403
        else:
            return jsonify({"msg": "Peer review deadline has passed"}), 403

    # Verify the authenticated user matches the reviewer
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # For group external reviews, verify user is in the reviewer group
    if reviewer_type == 'group':
        group_membership = Group_Members.get(user.id, reviewer_id)
        if not group_membership:
            return jsonify({"msg": "User is not a member of the reviewer group"}), 403
    else:
        # For user reviews, verify authenticated user matches reviewer
        if user.id != reviewer_id:
            return jsonify({"msg": "Unauthorized"}), 403

    # ── Submission-based guards ──────────────────────────────────
    # 1. Reviewer must have submitted (individual) or their group
    #    must have a submission (group) to be allowed to review.
    if reviewer_type == 'group':
        if not _has_group_submission(assignment_id, reviewer_id):
            return jsonify({"msg": "Your group has not submitted this assignment. You must submit before reviewing others."}), 403
    else:
        # For user reviewers, check submission status based on assignment type
        is_group_assignment = assignment.submission_type == 'group'
        if is_group_assignment:
            # For group assignments, reviewer's GROUP must have submitted
            group_member = Group_Members.query.join(
                CourseGroup, Group_Members.groupID == CourseGroup.id
            ).filter(
                Group_Members.userID == user.id,
                CourseGroup.courseID == assignment.courseID
            ).first()
            if group_member:
                if not _has_group_submission(assignment_id, group_member.groupID):
                    return jsonify({"msg": "Your group has not submitted this assignment. You must submit before reviewing others."}), 403
            else:
                # User is not in a group, which shouldn't happen for group assignments
                return jsonify({"msg": "You are not part of a group for this assignment."}), 403
        else:
            # For individual assignments, check individual submission
            if not _has_submission(assignment_id, user.id):
                return jsonify({"msg": "You have not submitted this assignment. You must submit before reviewing others."}), 403

    # 2. Reviewee must have submitted — you cannot review someone
    #    who has not submitted.
    if reviewee_type == 'group':
        if not _has_group_submission(assignment_id, reviewee_id):
            return jsonify({"msg": "This group has not submitted the assignment and cannot be reviewed."}), 403
    else:
        # For individual reviewees, we need to check if they're in a group assignment
        # For group assignments, check if their group has submitted (not just the individual)
        is_group_assignment = assignment.submission_type == 'group'

        if is_group_assignment:
            # Get the reviewee's group for this assignment (must be from the same course)
            group_member = Group_Members.query.join(
                CourseGroup, Group_Members.groupID == CourseGroup.id
            ).filter(
                Group_Members.userID == reviewee_id,
                CourseGroup.courseID == assignment.courseID
            ).first()
            if group_member:
                # Check if the group has submitted
                if not _has_group_submission(assignment_id, group_member.groupID):
                    return jsonify({"msg": "This student's group has not submitted the assignment and cannot be reviewed."}), 403
            else:
                # Reviewee is not in a group, which shouldn't happen for group assignments
                return jsonify({"msg": "This student is not part of a group assignment."}), 403
        else:
            # For individual assignments, check individual submission
            if not _has_submission(assignment_id, reviewee_id):
                return jsonify({"msg": "This student has not submitted the assignment and cannot be reviewed."}), 403

    # Check if a review already exists for this combination
    existing_review = Review.query.filter_by(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type,
        reviewer_type=reviewer_type
    ).first()

    if existing_review:
        # Return existing review instead of creating duplicate
        return jsonify(ReviewSchema().dump(existing_review)), 200

    # Create new review
    new_review = Review(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type,
        reviewer_type=reviewer_type
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
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Check permission based on reviewer type
    if review.reviewer_type == 'group':
        # For group reviews, check if user is a member of the reviewer group
        group_membership = Group_Members.get(user.id, review.reviewerID)
        if not group_membership:
            return jsonify({"msg": "Unauthorized"}), 403
    else:
        # For user reviews, check if user is the reviewer
        if user.id != review.reviewerID:
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
        reviewerID: ID of the reviewer (user ID or group ID based on reviewerType)
        revieweeID: ID of the reviewee
        revieweeType: Type of reviewee ('user' or 'group'), defaults to 'user'
        reviewerType: Type of reviewer ('user' or 'group'), defaults to 'user'
        reviewType: Type of review ('internal' or 'external') for filtering criteria

    Returns:
        - grades: array of grades indexed by criteria row position
        - comments: array of comments indexed by criteria row position
        - review: full review object with criteria
    """
    assignment_id = request.args.get("assignmentID", type=int)
    reviewer_id = request.args.get("reviewerID", type=int)
    reviewee_id = request.args.get("revieweeID", type=int)
    reviewee_type = request.args.get("revieweeType", "user")  # Default to 'user' for backwards compatibility
    reviewer_type = request.args.get("reviewerType", "user")  # Default to 'user'
    review_type = request.args.get("reviewType", None)  # 'internal' or 'external'

    if not all([assignment_id, reviewer_id, reviewee_id]):
        return jsonify({"msg": "Missing required query parameters"}), 400

    # Validate types
    if reviewee_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid revieweeType. Must be 'user' or 'group'"}), 400
    if reviewer_type not in ['user', 'group']:
        return jsonify({"msg": "Invalid reviewerType. Must be 'user' or 'group'"}), 400

    # Find the review
    review = Review.query.filter_by(
        assignmentID=assignment_id,
        reviewerID=reviewer_id,
        revieweeID=reviewee_id,
        reviewee_type=reviewee_type,
        reviewer_type=reviewer_type
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

    is_teacher = (user.is_teacher() and assignment.course.teacherID == user.id) or user.is_admin()
    is_participant = False

    # Check if user is the reviewer
    if review.reviewer_type == 'group':
        # For group reviews, check if user is a member of the reviewer group
        group_membership = Group_Members.get(user.id, reviewer_id)
        if group_membership:
            is_participant = True
    else:
        # For user reviews, check if user is the reviewer
        if user.id == reviewer_id:
            is_participant = True

    # Check if user is the reviewee
    if review.reviewee_type == 'group':
        # For group assignments, check if user is a member of the reviewee group
        group_membership = Group_Members.get(user.id, reviewee_id)
        if group_membership:
            is_participant = True
    else:
        # For user assignments, check if user is the reviewee
        if user.id == reviewee_id:
            is_participant = True

    if not (is_teacher or is_participant):
        return jsonify({"msg": "Unauthorized"}), 403

    # Get all criteria for this assignment's rubric
    rubric = assignment.rubrics.first()
    if not rubric:
        return jsonify({"grades": [], "comments": [], "review": ReviewSchema().dump(review)}), 200

    # Get criteria descriptions in order, filtered by review type if specified
    criteria_descriptions = rubric.criteria_descriptions.order_by(
        CriteriaDescription.id
    ).all()

    # Filter criteria based on review type
    if review_type in ['internal', 'external']:
        criteria_descriptions = [
            c for c in criteria_descriptions
            if c.criteria_type == 'both' or c.criteria_type == review_type
        ]

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


@bp.route("/reviews/submitted", methods=["GET"])
@jwt_required()
def get_submitted_reviews():
    """Get all reviews submitted by the current user (or their group) for an assignment

    Query params:
        assignmentID: ID of the assignment

    Returns:
        Array of reviews with grades, reviewee info, and type (internal/external)
    """
    assignment_id = request.args.get("assignmentID", type=int)

    if not assignment_id:
        return jsonify({"msg": "assignmentID is required"}), 400

    # Get current user
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Get assignment details
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course_id = assignment.courseID
    is_group_assignment = assignment.submission_type == 'group'

    # Find user's group if this is a group assignment
    user_group_id = None
    if is_group_assignment:
        membership = Group_Members.query.filter_by(userID=user.id).join(
            CourseGroup
        ).filter(CourseGroup.courseID == course_id).first()
        if membership:
            user_group_id = membership.groupID

    # Build list of reviews to fetch
    reviews_data = []

    # Get internal reviews (user reviewing teammates) - only for group assignments
    if is_group_assignment and assignment.internal_review:
        internal_reviews = Review.query.filter_by(
            assignmentID=assignment_id,
            reviewerID=user.id,
            reviewer_type='user',
            reviewee_type='user'
        ).all()

        for review in internal_reviews:
            review_info = _build_review_response(review, 'internal', assignment)
            if review_info:
                reviews_data.append(review_info)

    # Get external reviews
    if assignment.external_review:
        if is_group_assignment and user_group_id:
            # Group external reviews (group reviewing other groups)
            external_reviews = Review.query.filter_by(
                assignmentID=assignment_id,
                reviewerID=user_group_id,
                reviewer_type='group',
                reviewee_type='group'
            ).all()
        else:
            # Individual external reviews
            external_reviews = Review.query.filter_by(
                assignmentID=assignment_id,
                reviewerID=user.id,
                reviewer_type='user',
                reviewee_type='user'
            ).all()

        for review in external_reviews:
            review_info = _build_review_response(review, 'external', assignment)
            if review_info:
                reviews_data.append(review_info)

    return jsonify(reviews_data), 200


@bp.route("/reviews/received", methods=["GET"])
@jwt_required()
def get_received_reviews():
    """Get all reviews received by the current user (or their group) for an assignment

    Query params:
        assignmentID: ID of the assignment

    Returns:
        Array of reviews with grades, reviewer info (or "Anonymous"), and type
    """
    assignment_id = request.args.get("assignmentID", type=int)

    if not assignment_id:
        return jsonify({"msg": "assignmentID is required"}), 400

    # Get current user
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Get assignment details
    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course_id = assignment.courseID
    is_group_assignment = assignment.submission_type == 'group'
    is_anonymous = assignment.anonymous_review

    # Find user's group if this is a group assignment
    user_group_id = None
    if is_group_assignment:
        membership = Group_Members.query.filter_by(userID=user.id).join(
            CourseGroup
        ).filter(CourseGroup.courseID == course_id).first()
        if membership:
            user_group_id = membership.groupID

    reviews_data = []

    # Get internal reviews received (teammates reviewing user)
    if is_group_assignment and assignment.internal_review:
        internal_reviews = Review.query.filter_by(
            assignmentID=assignment_id,
            revieweeID=user.id,
            reviewer_type='user',
            reviewee_type='user'
        ).all()

        for review in internal_reviews:
            review_info = _build_received_review_response(review, 'internal', assignment, is_anonymous)
            if review_info:
                reviews_data.append(review_info)

    # Get external reviews received
    if assignment.external_review:
        if is_group_assignment and user_group_id:
            # Group external reviews (other groups reviewing user's group)
            external_reviews = Review.query.filter_by(
                assignmentID=assignment_id,
                revieweeID=user_group_id,
                reviewer_type='group',
                reviewee_type='group'
            ).all()
        else:
            # Individual external reviews
            external_reviews = Review.query.filter_by(
                assignmentID=assignment_id,
                revieweeID=user.id,
                reviewer_type='user',
                reviewee_type='user'
            ).all()

        for review in external_reviews:
            review_info = _build_received_review_response(review, 'external', assignment, is_anonymous)
            if review_info:
                reviews_data.append(review_info)

    return jsonify(reviews_data), 200


def _build_review_response(review, review_type, assignment):
    """Helper to build review response with grades"""
    # Get reviewee name
    if review.reviewee_type == 'group':
        group = CourseGroup.get_by_id(review.revieweeID)
        reviewee_name = group.name if group else f"Group {review.revieweeID}"
    else:
        reviewee = User.get_by_id(review.revieweeID)
        reviewee_name = reviewee.name if reviewee else f"User {review.revieweeID}"

    # Calculate grade
    grade = _calculate_review_grade(review, assignment)

    return {
        "reviewId": review.id,
        "revieweeId": review.revieweeID,
        "revieweeName": reviewee_name,
        "type": review_type,
        "grade": grade
    }


def _build_received_review_response(review, review_type, assignment, is_anonymous):
    """Helper to build received review response with grades"""
    # Get reviewer name (anonymous if enabled)
    if is_anonymous:
        reviewer_name = "Anonymous"
    elif review.reviewer_type == 'group':
        group = CourseGroup.get_by_id(review.reviewerID)
        reviewer_name = group.name if group else f"Group {review.reviewerID}"
    else:
        reviewer = User.get_by_id(review.reviewerID)
        reviewer_name = reviewer.name if reviewer else f"User {review.reviewerID}"

    # Calculate grade
    grade = _calculate_review_grade(review, assignment)

    return {
        "reviewerId": review.reviewerID,
        "reviewerName": reviewer_name,
        "type": review_type,
        "grade": grade
    }


def _calculate_review_grade(review, assignment):
    """Calculate average grade percentage for a review"""
    rubric = assignment.rubrics.first()
    if not rubric:
        return None

    criteria_descriptions = rubric.criteria_descriptions.order_by(CriteriaDescription.id).all()
    if not criteria_descriptions:
        return None

    total_percentage = 0
    count = 0

    for criteria_desc in criteria_descriptions:
        criterion = Criterion.query.filter_by(
            reviewID=review.id,
            criterionRowID=criteria_desc.id
        ).first()

        if criterion and criterion.grade is not None:
            # Normalize to percentage
            max_score = criteria_desc.scoreMax if criteria_desc.hasScore and criteria_desc.scoreMax > 0 else 100
            percentage = (criterion.grade / max_score) * 100
            total_percentage += percentage
            count += 1

    if count == 0:
        return None

    return total_percentage / count


@bp.route("/review-targets/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_review_targets(assignment_id):
    """Return filtered review targets that have submitted, plus reviewer eligibility."""
    email = get_jwt_identity()
    user = User.get_by_email(email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment:
        return jsonify({"msg": "Assignment not found"}), 404

    course_id = assignment.courseID
    is_group = assignment.submission_type == "group"

    # Check if the current user/group has submitted
    reviewer_eligible = True
    user_group_id = None

    if is_group:
        membership = Group_Members.query.filter_by(userID=user.id).join(
            CourseGroup, CourseGroup.id == Group_Members.groupID
        ).filter(CourseGroup.courseID == course_id).first()
        if membership:
            user_group_id = membership.groupID
            if not _has_group_submission(assignment_id, user_group_id):
                reviewer_eligible = False
        else:
            reviewer_eligible = False
    else:
        if not _has_submission(assignment_id, user.id):
            reviewer_eligible = False

    due_date = assignment.due_date

    # Build internal targets (group members, excluding self)
    internal_targets = []
    if is_group and user_group_id:
        # For group assignments, check if the GROUP has submitted (not individual members)
        # If the group has submitted, all members are eligible for internal review
        group_has_sub = _has_group_submission(assignment_id, user_group_id)

        members = Group_Members.query.filter_by(groupID=user_group_id).all()
        for m in members:
            if m.userID == user.id:
                continue
            member_user = User.get_by_id(m.userID)
            internal_targets.append({
                "id": m.userID,
                "name": member_user.name if member_user else f"User {m.userID}",
                "has_submitted": group_has_sub,
                "is_late": _is_late_submission(assignment_id, m.userID, due_date) if group_has_sub else False,
            })

    # Build external targets
    external_targets = []
    if is_group:
        # External targets are other groups in the course
        groups = CourseGroup.query.filter_by(courseID=course_id).all()
        for g in groups:
            if g.id == user_group_id:
                continue
            has_sub = _has_group_submission(assignment_id, g.id)
            external_targets.append({
                "id": g.id,
                "name": g.name or f"Group {g.id}",
                "has_submitted": has_sub,
                "is_late": False,  # Group-level late check is complex; omit for now
            })
    else:
        # External targets are other students enrolled in the course
        enrollments = User_Course.query.filter_by(courseID=course_id).all()
        for uc in enrollments:
            if uc.userID == user.id:
                continue
            target_user = User.get_by_id(uc.userID)
            if not target_user or target_user.role != "student":
                continue
            has_sub = _has_submission(assignment_id, uc.userID)
            external_targets.append({
                "id": uc.userID,
                "name": target_user.name or target_user.email,
                "has_submitted": has_sub,
                "is_late": _is_late_submission(assignment_id, uc.userID, due_date) if has_sub else False,
            })

    return jsonify({
        "reviewer_eligible": reviewer_eligible,
        "internal_targets": internal_targets,
        "external_targets": external_targets,
    }), 200
