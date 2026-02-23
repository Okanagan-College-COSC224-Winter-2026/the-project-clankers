"""
Rubric controller for managing rubrics and criteria descriptions
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import (
    Rubric, 
    CriteriaDescription, 
    Assignment,
    User,
    RubricSchema,
    CriteriaDescriptionSchema
)
from .auth_controller import jwt_teacher_required

bp = Blueprint("rubric", __name__, url_prefix="")


@bp.route("/rubric", methods=["GET"])
@jwt_required()
def get_rubric():
    """Get a rubric by ID or assignmentID
    
    Query params:
        rubricID: ID of the rubric (optional)
        assignmentID: ID of the assignment (optional)
    
    Returns the rubric with its ID, assignmentID, and canComment flag
    """
    rubric_id = request.args.get("rubricID", type=int)
    assignment_id = request.args.get("assignmentID", type=int)
    
    if rubric_id:
        rubric = Rubric.get_by_id(rubric_id)
    elif assignment_id:
        # Get the first rubric for this assignment
        assignment = Assignment.get_by_id(assignment_id)
        if not assignment:
            return jsonify({"msg": "Assignment not found"}), 404
        rubric = assignment.rubrics.first()
    else:
        return jsonify({"msg": "Either rubricID or assignmentID is required"}), 400
    
    if not rubric:
        return jsonify({"msg": "Rubric not found"}), 404
    
    return jsonify(RubricSchema().dump(rubric)), 200


@bp.route("/create_rubric", methods=["POST"])
@jwt_teacher_required
def create_rubric():
    """Create a new rubric for an assignment
    
    Request body:
        assignmentID: ID of the assignment
        canComment: Whether comments are allowed
        id: Optional specific ID to use (for idempotency)
    
    Returns the created rubric
    """
    try:
        data = request.get_json()
        assignment_id = data.get("assignmentID")
        can_comment = data.get("canComment", False)
        rubric_id = data.get("id")
        
        if not assignment_id:
            return jsonify({"msg": "assignmentID is required"}), 400
        
        # Verify assignment exists
        assignment = Assignment.get_by_id(assignment_id)
        if not assignment:
            return jsonify({"msg": "Assignment not found"}), 404
        
        # Check if assignment has a course
        if not assignment.course:
            return jsonify({"msg": "Assignment has no associated course"}), 500
        
        # Verify user is the teacher of the course
        email = get_jwt_identity()
        user = User.get_by_email(email)
        if not user:
            return jsonify({"msg": "User not found"}), 404
            
        if assignment.course.teacherID != user.id:
            return jsonify({"msg": f"Unauthorized: You are not the teacher of this class (teacherID: {assignment.course.teacherID}, yourID: {user.id})"}), 403
        
        # Check if rubric already exists for this assignment
        existing_rubric = assignment.rubrics.first()
        if existing_rubric:
            # Return existing rubric
            return jsonify(RubricSchema().dump(existing_rubric)), 200
        
        # Create new rubric
        new_rubric = Rubric(
            assignmentID=assignment_id,
            canComment=can_comment
        )
        
        # If a specific ID was provided (for idempotency), try to use it
        if rubric_id:
            new_rubric.id = rubric_id
        
        Rubric.create_rubric(new_rubric)
        
        return jsonify(RubricSchema().dump(new_rubric)), 201
    except Exception as e:
        return jsonify({"msg": f"Server error: {str(e)}"}), 500


@bp.route("/criteria", methods=["GET"])
@jwt_required()
def get_criteria():
    """Get all criteria descriptions for a rubric
    
    Query params:
        rubricID: ID of the rubric
    
    Returns array of criteria descriptions in order
    """
    rubric_id = request.args.get("rubricID", type=int)
    
    if not rubric_id:
        return jsonify({"msg": "rubricID is required"}), 400
    
    rubric = Rubric.get_by_id(rubric_id)
    if not rubric:
        return jsonify({"msg": "Rubric not found"}), 404
    
    # Get criteria descriptions ordered by ID
    criteria = rubric.criteria_descriptions.order_by(CriteriaDescription.id).all()
    
    return jsonify(CriteriaDescriptionSchema(many=True).dump(criteria)), 200


@bp.route("/create_criteria", methods=["POST"])
@jwt_teacher_required
def create_criteria():
    """Create a new criteria description for a rubric
    
    Request body:
        rubricID: ID of the rubric
        question: The criterion question/description
        scoreMax: Maximum score for this criterion
        hasScore: Whether this criterion has a numeric score (default: True)
        canComment: Whether comments are allowed (deprecated, use rubric.canComment)
    
    Returns the created criteria description
    """
    data = request.get_json()
    rubric_id = data.get("rubricID")
    question = data.get("question")
    score_max = data.get("scoreMax")
    has_score = data.get("hasScore", True)
    
    if not all([rubric_id, question, score_max is not None]):
        return jsonify({"msg": "rubricID, question, and scoreMax are required"}), 400
    
    # Verify rubric exists
    rubric = Rubric.get_by_id(rubric_id)
    if not rubric:
        return jsonify({"msg": "Rubric not found"}), 404
    
    # Verify user is the teacher of the course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    assignment = rubric.assignment
    if not user or assignment.course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Create new criteria description
    new_criteria = CriteriaDescription(
        rubricID=rubric_id,
        question=question,
        scoreMax=score_max,
        hasScore=has_score
    )
    CriteriaDescription.create_criteria_description(new_criteria)
    
    return jsonify(CriteriaDescriptionSchema().dump(new_criteria)), 201


@bp.route("/delete_criteria/<int:criteria_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_criteria(criteria_id):
    """Delete a criteria description from a rubric
    
    Path params:
        criteria_id: ID of the criteria description to delete
    
    Returns success message
    """
    # Get the criteria description
    criteria = CriteriaDescription.get_by_id(criteria_id)
    if not criteria:
        return jsonify({"msg": "Criteria not found"}), 404
    
    # Get the rubric and verify permissions
    rubric = Rubric.get_by_id(criteria.rubricID)
    if not rubric:
        return jsonify({"msg": "Rubric not found"}), 404
    
    # Verify user is the teacher of the course
    email = get_jwt_identity()
    user = User.get_by_email(email)
    assignment = rubric.assignment
    if not user or assignment.course.teacherID != user.id:
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Delete the criteria description (cascade will delete related Criterion entries)
    criteria.delete()
    
    return jsonify({"msg": "Criteria deleted successfully"}), 200
