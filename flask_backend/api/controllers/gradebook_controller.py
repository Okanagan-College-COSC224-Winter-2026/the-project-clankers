"""Gradebook controller for instructor progress view and student course-grade summaries."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import (
    Assignment,
    Course,
    CourseGradePolicy,
    CourseTotalOverride,
    CourseGroup,
    Criterion,
    CriteriaDescription,
    GradeOverride,
    Group_Members,
    Review,
    Rubric,
    StudentSubmission,
    User,
    User_Course,
    db,
)

bp = Blueprint("gradebook", __name__, url_prefix="/class")


def _to_utc(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _submission_status(assignment, latest_submission):
    if not latest_submission:
        return "no submission"

    due = _to_utc(assignment.due_date)
    submitted_at = _to_utc(latest_submission.submitted_at)
    if due and submitted_at and submitted_at > due:
        return "submitted late"
    return "submitted"


def _is_review_complete(review, criteria_ids, review_type=None):
    if not criteria_ids:
        return True

    # Filter criteria by review type if specified
    # review_type can be 'internal', 'external', or None (for all)
    applicable_criteria = criteria_ids
    if review_type:
        applicable_criteria = [
            c_id for c_id in criteria_ids
            if _criteria_applies_to_review_type(c_id, review_type)
        ]

    if not applicable_criteria:
        return True

    graded_ids = {
        c.criterionRowID
        for c in Criterion.query.filter_by(reviewID=review.id).all()
        if c.grade is not None
    }
    return all(criteria_id in graded_ids for criteria_id in applicable_criteria)


def _criteria_applies_to_review_type(criteria_id, review_type):
    """Check if a criteria description applies to the given review type."""
    criteria_desc = CriteriaDescription.get_by_id(criteria_id)
    if not criteria_desc:
        return False
    # Criteria applies if it's marked as 'both', or if it matches the review type
    return criteria_desc.criteria_type == 'both' or criteria_desc.criteria_type == review_type


def _calculate_review_grade(review, criteria_map):
    if not criteria_map:
        return None

    percentages = []
    for criteria_id, score_max in criteria_map.items():
        criterion = Criterion.query.filter_by(reviewID=review.id, criterionRowID=criteria_id).first()
        if not criterion or criterion.grade is None:
            continue

        max_score = score_max if score_max and score_max > 0 else 100
        percentages.append((criterion.grade / max_score) * 100)

    if not percentages:
        return None
    return sum(percentages) / len(percentages)


def _current_user():
    email = get_jwt_identity()
    return User.get_by_email(email) if email else None


def _ensure_course_access(course_id, require_teacher=False):
    user = _current_user()
    if not user:
        return None, None, (jsonify({"msg": "User not found"}), 404)

    course = Course.get_by_id(course_id)
    if not course:
        return None, None, (jsonify({"msg": "Class not found"}), 404)

    if user.is_admin():
        return user, course, None

    if require_teacher:
        if not user.is_teacher() or course.teacherID != user.id:
            return None, None, (jsonify({"msg": "Unauthorized"}), 403)
        return user, course, None

    if user.is_teacher() and course.teacherID == user.id:
        return user, course, None

    if user.is_student():
        enrollment = User_Course.get(user.id, course_id)
        if enrollment:
            return user, course, None

    return None, None, (jsonify({"msg": "Unauthorized"}), 403)


def _course_students(course_id):
    enrollments = User_Course.query.filter_by(courseID=course_id).all()
    students = [User.get_by_id(enrollment.userID) for enrollment in enrollments]
    return [student for student in students if student and student.is_student()]


def _latest_submission_for_student(assignment_id, student_id, assignment=None, group_id=None):
    # For group assignments, check if the group has submitted (not just the individual)
    if assignment and assignment.submission_type == 'group' and group_id:
        # Get all submissions from group members
        group_members = Group_Members.query.filter_by(groupID=group_id).all()
        member_ids = [m.userID for m in group_members]
        if member_ids:
            submissions = StudentSubmission.query.filter(
                StudentSubmission.assignment_id == assignment_id,
                StudentSubmission.student_id.in_(member_ids)
            ).order_by(StudentSubmission.submitted_at.desc()).all()
            return submissions[0] if submissions else None

    # For individual assignments, check only this student
    submissions = StudentSubmission.get_by_student_and_assignment(student_id, assignment_id)
    return submissions[0] if submissions else None


def _student_group(course_id, student_id):
    membership = (
        Group_Members.query.filter_by(userID=student_id)
        .join(CourseGroup, Group_Members.groupID == CourseGroup.id)
        .filter(CourseGroup.courseID == course_id)
        .first()
    )
    return membership.groupID if membership else None


def _assignment_context(assignment):
    rubric = Rubric.query.filter_by(assignmentID=assignment.id).first()
    criteria = (
        CriteriaDescription.query.filter_by(rubricID=rubric.id).order_by(CriteriaDescription.id).all()
        if rubric
        else []
    )
    criteria_ids = [c.id for c in criteria]
    criteria_map = {c.id: c.scoreMax for c in criteria}
    return criteria_ids, criteria_map


def _student_peer_completion(assignment, student, class_students, group_id, criteria_ids):
    expected = 0
    completed = 0

    if assignment.submission_type == "group" and assignment.internal_review and group_id:
        teammate_ids = [
            m.userID
            for m in Group_Members.query.filter_by(groupID=group_id).all()
            if m.userID != student.id
        ]
        expected += len(teammate_ids)
        reviews = Review.query.filter_by(
            assignmentID=assignment.id,
            reviewerID=student.id,
            reviewer_type="user",
            reviewee_type="user",
        ).all()
        completed += sum(1 for review in reviews if review.revieweeID in teammate_ids and _is_review_complete(review, criteria_ids, 'internal'))

    if assignment.external_review:
        if assignment.submission_type == "group":
            if group_id:
                all_group_ids = [group.id for group in CourseGroup.query.filter_by(courseID=assignment.courseID).all()]
                expected_targets = [gid for gid in all_group_ids if gid != group_id]
                expected += len(expected_targets)
                group_reviews = Review.query.filter_by(
                    assignmentID=assignment.id,
                    reviewerID=group_id,
                    reviewer_type="group",
                    reviewee_type="group",
                ).all()
                completed += sum(
                    1
                    for review in group_reviews
                    if review.revieweeID in expected_targets and _is_review_complete(review, criteria_ids, 'external')
                )
        else:
            student_ids = [s.id for s in class_students]
            expected_targets = [sid for sid in student_ids if sid != student.id]
            expected += len(expected_targets)
            user_reviews = Review.query.filter_by(
                assignmentID=assignment.id,
                reviewerID=student.id,
                reviewer_type="user",
                reviewee_type="user",
            ).all()
            completed += sum(
                1
                for review in user_reviews
                if review.revieweeID in expected_targets and _is_review_complete(review, criteria_ids, 'external')
            )

    ratio = (completed / expected) if expected > 0 else 1.0
    if expected == 0:
        status = "not required"
    elif completed >= expected:
        status = "complete"
    else:
        status = "incomplete"

    return {"completed": completed, "expected": expected, "ratio": ratio, "status": status}


def _received_reviews_for_grade(assignment, student_id, group_id):
    reviews = []
    if assignment.submission_type == "group" and assignment.internal_review:
        reviews.extend(
            Review.query.filter_by(
                assignmentID=assignment.id,
                revieweeID=student_id,
                reviewer_type="user",
                reviewee_type="user",
            ).all()
        )

    if assignment.external_review:
        if assignment.submission_type == "group" and group_id:
            reviews.extend(
                Review.query.filter_by(
                    assignmentID=assignment.id,
                    revieweeID=group_id,
                    reviewer_type="group",
                    reviewee_type="group",
                ).all()
            )
        elif assignment.submission_type != "group":
            reviews.extend(
                Review.query.filter_by(
                    assignmentID=assignment.id,
                    revieweeID=student_id,
                    reviewer_type="user",
                    reviewee_type="user",
                ).all()
            )

    return reviews


def _grade_entry(policy, assignment, student, class_students):
    criteria_ids, criteria_map = _assignment_context(assignment)
    group_id = _student_group(assignment.courseID, student.id)
    latest_submission = _latest_submission_for_student(assignment.id, student.id, assignment, group_id)
    submission_status = _submission_status(assignment, latest_submission)
    peer_completion = _student_peer_completion(
        assignment, student, class_students, group_id, criteria_ids
    )

    received_reviews = _received_reviews_for_grade(assignment, student.id, group_id)
    review_grades = []
    for review in received_reviews:
        # Determine review type
        review_type = None
        if assignment.submission_type == "group":
            if review.reviewer_type == "user" and review.reviewee_type == "user":
                review_type = "internal"
            elif review.reviewer_type == "group" and review.reviewee_type == "group":
                review_type = "external"
        else:
            # Individual assignment - all reviews are external
            review_type = "external"

        if _is_review_complete(review, criteria_ids, review_type):
            grade = _calculate_review_grade(review, criteria_map)
            if grade is not None:
                review_grades.append(grade)

    computed_grade = (sum(review_grades) / len(review_grades)) if review_grades else None

    penalty_percent = 0.0
    if submission_status == "submitted late":
        penalty_percent += float(policy.late_penalty_percent or 0.0)
    if peer_completion["status"] == "incomplete":
        penalty_percent += float(policy.incomplete_evaluation_penalty_percent or 0.0)

    penalized_grade = None
    if computed_grade is not None:
        penalized_grade = max(0.0, computed_grade * (1.0 - (penalty_percent / 100.0)))

    override = GradeOverride.get_for_assignment_student(assignment.id, student.id)
    effective_grade = override.override_grade if override else penalized_grade
    grade_source = "override" if override else ("computed" if penalized_grade is not None else "pending")

    return {
        "assignment_id": assignment.id,
        "assignment_name": assignment.name,
        "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
        "submission_status": submission_status,
        "submission": {
            "id": latest_submission.id,
            "filename": latest_submission.filename,
            "submitted_at": latest_submission.submitted_at.isoformat() if latest_submission else None,
        }
        if latest_submission
        else None,
        "peer_evaluation": peer_completion,
        "computed_grade": round(computed_grade, 2) if computed_grade is not None else None,
        "penalty_applied_percent": round(penalty_percent, 2),
        "effective_grade": round(effective_grade, 2) if effective_grade is not None else None,
        "override_grade": round(override.override_grade, 2) if override else None,
        "override_reason": override.reason if override else None,
        "grade_source": grade_source,
    }


def _course_total_from_entries(entries):
    grades = [entry["effective_grade"] for entry in entries if entry["effective_grade"] is not None]
    if not grades:
        return None
    return round(sum(grades) / len(grades), 2)


def _effective_course_total(course_id, student_id, entries):
    computed = _course_total_from_entries(entries)
    override = CourseTotalOverride.get_for_course_student(course_id, student_id)
    effective = override.override_total if override else computed
    return {
        "computed": computed,
        "effective": round(effective, 2) if effective is not None else None,
        "override": round(override.override_total, 2) if override else None,
        "reason": override.reason if override else None,
        "source": "override" if override else ("computed" if computed is not None else "pending"),
    }


@bp.route("/<int:class_id>/gradebook", methods=["GET"])
@jwt_required()
def get_gradebook(class_id):
    user, course, error = _ensure_course_access(class_id, require_teacher=True)
    if error:
        return error

    policy = CourseGradePolicy.get_or_create(class_id)
    students = _course_students(class_id)
    assignments = Assignment.query.filter_by(courseID=class_id).order_by(Assignment.id).all()

    student_rows = []
    assignment_aggregates = {
        assignment.id: {
            "assignment_id": assignment.id,
            "assignment_name": assignment.name,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "submitted_count": 0,
            "late_count": 0,
            "missing_count": 0,
            "average_grade": None,
            "_grade_values": [],
        }
        for assignment in assignments
    }

    for student in students:
        entries = [_grade_entry(policy, assignment, student, students) for assignment in assignments]
        for entry in entries:
            aggregate = assignment_aggregates[entry["assignment_id"]]
            status = entry["submission_status"]
            if status == "submitted":
                aggregate["submitted_count"] += 1
            elif status == "submitted late":
                aggregate["late_count"] += 1
            else:
                aggregate["missing_count"] += 1

            if entry["effective_grade"] is not None:
                aggregate["_grade_values"].append(entry["effective_grade"])

        student_rows.append(
            {
                "student_id": student.id,
                "student_name": student.name,
                "student_number": student.student_id,
                "email": student.email,
                "course_total": _effective_course_total(course.id, student.id, entries),
                "course_total_grade": _effective_course_total(course.id, student.id, entries)["effective"],
                "assignments": entries,
            }
        )

    aggregates = []
    for assignment in assignments:
        aggregate = assignment_aggregates[assignment.id]
        grade_values = aggregate.pop("_grade_values")
        aggregate["average_grade"] = (
            round(sum(grade_values) / len(grade_values), 2) if grade_values else None
        )
        aggregates.append(aggregate)

    return jsonify(
        {
            "class": {"id": course.id, "name": course.name},
            "policy": {
                "late_penalty_percent": round(float(policy.late_penalty_percent or 0.0), 2),
                "incomplete_evaluation_penalty_percent": round(
                    float(policy.incomplete_evaluation_penalty_percent or 0.0), 2
                ),
            },
            "assignment_aggregates": aggregates,
            "students": student_rows,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    ), 200


@bp.route("/<int:class_id>/gradebook/student/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_gradebook_detail(class_id, student_id):
    user, course, error = _ensure_course_access(class_id, require_teacher=False)
    if error:
        return error

    if user.is_student() and user.id != student_id:
        return jsonify({"msg": "Unauthorized"}), 403

    enrollment = User_Course.get(student_id, class_id)
    if not enrollment:
        return jsonify({"msg": "Student is not enrolled in this class"}), 404

    student = User.get_by_id(student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    policy = CourseGradePolicy.get_or_create(class_id)
    classmates = _course_students(class_id)
    assignments = Assignment.query.filter_by(courseID=class_id).order_by(Assignment.id).all()

    details = []
    for assignment in assignments:
        entry = _grade_entry(policy, assignment, student, classmates)
        criteria_ids, criteria_map = _assignment_context(assignment)
        group_id = _student_group(class_id, student.id)
        received_reviews = _received_reviews_for_grade(assignment, student.id, group_id)

        review_items = []
        for review in received_reviews:
            if review.reviewer_type == "group":
                reviewer_group = CourseGroup.get_by_id(review.reviewerID)
                reviewer_name = reviewer_group.name if reviewer_group else f"Group {review.reviewerID}"
            else:
                reviewer = User.get_by_id(review.reviewerID)
                reviewer_name = reviewer.name if reviewer else f"User {review.reviewerID}"

            review_items.append(
                {
                    "review_id": review.id,
                    "review_type": "external" if review.reviewer_type == "group" else "internal",
                    "reviewer_id": review.reviewerID,
                    "reviewer_name": reviewer_name,
                    "is_complete": _is_review_complete(review, criteria_ids),
                    "grade": _calculate_review_grade(review, criteria_map),
                }
            )

        details.append(
            {
                **entry,
                "all_submissions": [
                    {
                        "id": sub.id,
                        "filename": sub.filename,
                        "submitted_at": sub.submitted_at.isoformat(),
                    }
                    for sub in StudentSubmission.get_by_student_and_assignment(student.id, assignment.id)
                ],
                "received_reviews": review_items,
            }
        )

    return jsonify(
        {
            "class": {"id": course.id, "name": course.name},
            "student": {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "student_number": student.student_id,
            },
            "course_total": _effective_course_total(class_id, student.id, details),
            "course_total_grade": _effective_course_total(class_id, student.id, details)["effective"],
            "assignments": details,
        }
    ), 200


@bp.route("/<int:class_id>/gradebook/policy", methods=["PUT"])
@jwt_required()
def update_gradebook_policy(class_id):
    user, _course, error = _ensure_course_access(class_id, require_teacher=True)
    if error:
        return error

    data = request.get_json() or {}
    late = data.get("late_penalty_percent")
    incomplete = data.get("incomplete_evaluation_penalty_percent")

    if late is None and incomplete is None:
        return jsonify({"msg": "No policy fields provided"}), 400

    policy = CourseGradePolicy.get_or_create(class_id)

    if late is not None:
        late_value = float(late)
        if late_value < 0 or late_value > 100:
            return jsonify({"msg": "late_penalty_percent must be between 0 and 100"}), 400
        policy.late_penalty_percent = late_value

    if incomplete is not None:
        incomplete_value = float(incomplete)
        if incomplete_value < 0 or incomplete_value > 100:
            return jsonify(
                {"msg": "incomplete_evaluation_penalty_percent must be between 0 and 100"}
            ), 400
        policy.incomplete_evaluation_penalty_percent = incomplete_value

    policy.updated_by = user.id
    db.session.commit()

    return jsonify(
        {
            "msg": "Grade policy updated",
            "policy": {
                "late_penalty_percent": round(float(policy.late_penalty_percent or 0.0), 2),
                "incomplete_evaluation_penalty_percent": round(
                    float(policy.incomplete_evaluation_penalty_percent or 0.0), 2
                ),
            },
        }
    ), 200


@bp.route("/<int:class_id>/gradebook/overrides", methods=["PUT"])
@jwt_required()
def upsert_grade_override(class_id):
    user, _course, error = _ensure_course_access(class_id, require_teacher=True)
    if error:
        return error

    data = request.get_json() or {}
    assignment_id = data.get("assignment_id")
    student_id = data.get("student_id")
    reason = data.get("reason")
    override_grade = data.get("override_grade")

    if assignment_id is None or student_id is None:
        return jsonify({"msg": "assignment_id and student_id are required"}), 400

    assignment = Assignment.get_by_id(assignment_id)
    if not assignment or assignment.courseID != class_id:
        return jsonify({"msg": "Assignment not found for this class"}), 404

    enrollment = User_Course.get(student_id, class_id)
    if not enrollment:
        return jsonify({"msg": "Student is not enrolled in this class"}), 404

    existing = GradeOverride.get_for_assignment_student(assignment_id, student_id)

    if override_grade is None:
        if existing:
            db.session.delete(existing)
            db.session.commit()
        return jsonify({"msg": "Grade override cleared"}), 200

    grade_value = float(override_grade)
    if grade_value < 0:
        return jsonify({"msg": "override_grade must be 0 or greater"}), 400

    if existing:
        existing.override_grade = grade_value
        existing.notes = reason
        existing.teacherID = user.id
    else:
        db.session.add(
            GradeOverride(
                assignmentID=assignment_id,
                studentID=student_id,
                teacherID=user.id,
                override_grade=grade_value,
                notes=reason,
            )
        )

    db.session.commit()
    return jsonify({"msg": "Grade override updated"}), 200


@bp.route("/<int:class_id>/gradebook/course-total-overrides", methods=["PUT"])
@jwt_required()
def upsert_course_total_override(class_id):
    user, _course, error = _ensure_course_access(class_id, require_teacher=True)
    if error:
        return error

    data = request.get_json() or {}
    student_id = data.get("student_id")
    override_total = data.get("override_total")
    reason = data.get("reason")

    if student_id is None:
        return jsonify({"msg": "student_id is required"}), 400

    enrollment = User_Course.get(student_id, class_id)
    if not enrollment:
        return jsonify({"msg": "Student is not enrolled in this class"}), 404

    existing = CourseTotalOverride.get_for_course_student(class_id, student_id)

    if override_total is None:
        if existing:
            db.session.delete(existing)
            db.session.commit()
        return jsonify({"msg": "Course total override cleared"}), 200

    total_value = float(override_total)
    if total_value < 0 or total_value > 100:
        return jsonify({"msg": "override_total must be between 0 and 100"}), 400

    if existing:
        existing.override_total = total_value
        existing.reason = reason
        existing.updated_by = user.id
    else:
        db.session.add(
            CourseTotalOverride(
                courseID=class_id,
                studentID=student_id,
                override_total=total_value,
                reason=reason,
                updated_by=user.id,
            )
        )

    db.session.commit()
    return jsonify({"msg": "Course total override updated"}), 200


@bp.route("/<int:class_id>/my-grade", methods=["GET"])
@jwt_required()
def get_my_course_grade(class_id):
    user, course, error = _ensure_course_access(class_id, require_teacher=False)
    if error:
        return error

    if not user.is_student() and not user.is_admin() and not (user.is_teacher() and course.teacherID == user.id):
        return jsonify({"msg": "Unauthorized"}), 403

    # Teacher/admin may inspect own course grade endpoint with explicit student_id query.
    target_student_id = request.args.get("student_id", type=int)
    if user.is_student():
        target_student_id = user.id

    if target_student_id is None:
        return jsonify({"msg": "student_id is required for non-student users"}), 400

    enrollment = User_Course.get(target_student_id, class_id)
    if not enrollment:
        return jsonify({"msg": "Student is not enrolled in this class"}), 404

    student = User.get_by_id(target_student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404

    policy = CourseGradePolicy.get_or_create(class_id)
    classmates = _course_students(class_id)
    assignments = Assignment.query.filter_by(courseID=class_id).order_by(Assignment.id).all()
    entries = [_grade_entry(policy, assignment, student, classmates) for assignment in assignments]
    total_info = _effective_course_total(class_id, student.id, entries)
    course_total = total_info["effective"]

    return jsonify(
        {
            "class": {"id": course.id, "name": course.name},
            "student": {"id": student.id, "name": student.name},
            "course_total_grade": course_total,
            "course_total": total_info,
            "status": "available" if course_total is not None else "pending evaluations",
            "assignments": entries,
        }
    ), 200
