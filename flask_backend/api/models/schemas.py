from marshmallow import fields, validate

from .assignment_model import Assignment
from .assignment_file_model import AssignmentFile
from .course_group_model import CourseGroup
from .course_model import Course
from .criteria_description_model import CriteriaDescription
from .criterion_model import Criterion
from .db import db, ma
from .group_members_model import Group_Members
from .review_model import Review
from .rubric_model import Rubric
from .student_submission_model import StudentSubmission
from .submission_model import Submission
from .user_course_model import User_Course
from .user_model import User

# ============================================================
# USER SCHEMAS
# ============================================================


class UserSchema(ma.SQLAlchemyAutoSchema):
    """Full user schema for serialization (excludes password)"""

    class Meta:
        model = User
        load_instance = True
        include_fk = False  # Don't expose raw foreign keys
        sqla_session = db.session
        exclude = ("hash_pass",)

    # Explicit fields for clarity and validation
    id = fields.Int(dump_only=True)
    student_id = fields.Str(allow_none=True, validate=validate.Length(max=50))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    email = fields.Email(required=True)
    role = fields.Str(
        dump_default="student", validate=validate.OneOf(["student", "teacher", "admin"])
    )
    must_change_password = fields.Bool(dump_default=False)
    profile_picture_url = fields.Str(allow_none=True, validate=validate.Length(max=500))


class UserRegistrationSchema(ma.Schema):
    """Schema for user registration input"""

    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=6))


class UserLoginSchema(ma.Schema):
    """Schema for login credentials"""

    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)


class UserListSchema(ma.SQLAlchemyAutoSchema):
    """Lightweight user schema for lists (minimal fields)"""

    class Meta:
        model = User
        fields = ("id", "name", "email", "role")
        dump_only = ("id",)


# ============================================================
# COURSE SCHEMAS
# ============================================================


class CourseSchema(ma.SQLAlchemyAutoSchema):
    """Full course schema with nested teacher and students.

    Note: To avoid N+1 queries, use Course.get_by_id_with_relations() or
    Course.get_all_with_relations() when fetching courses for serialization.
    """

    class Meta:
        model = Course
        load_instance = True
        include_fk = False
        sqla_session = db.session

    teacher = fields.Nested(UserListSchema, dump_only=True)
    students = fields.List(fields.Nested(UserListSchema), dump_only=True)


class CourseListSchema(ma.SQLAlchemyAutoSchema):
    """Lightweight course schema for lists"""

    class Meta:
        model = Course
        fields = ("id", "name", "teacherID")
        dump_only = ("id",)
        include_fk = True  # Allow teacherID to be serialized


# ============================================================
# ASSIGNMENT SCHEMAS
# ============================================================


class AssignmentSchema(ma.SQLAlchemyAutoSchema):
    """Full assignment schema"""

    class Meta:
        model = Assignment
        load_instance = True
        include_fk = True  # Include courseID for assignment → course navigation
        sqla_session = db.session

    course = fields.Nested(CourseListSchema, dump_only=True)


class AssignmentFileSchema(ma.SQLAlchemyAutoSchema):
    """Schema for assignment file attachments"""

    class Meta:
        model = AssignmentFile
        load_instance = True
        include_fk = True
        sqla_session = db.session

    uploaded_at = fields.DateTime(dump_only=True)


class StudentSubmissionSchema(ma.SQLAlchemyAutoSchema):
    """Schema for student submissions"""

    class Meta:
        model = StudentSubmission
        load_instance = True
        include_fk = True
        sqla_session = db.session

    submitted_at = fields.DateTime(dump_only=True)
    student_name = fields.Method("get_student_name")

    def get_student_name(self, obj):
        """Get the student's name for display"""
        return obj.student.name if obj.student else "Unknown"


# ============================================================
# RUBRIC & CRITERIA SCHEMAS
# ============================================================


class RubricSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Rubric
        load_instance = True
        include_fk = False
        sqla_session = db.session


class CriteriaDescriptionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = CriteriaDescription
        load_instance = True
        include_fk = False
        sqla_session = db.session


class CriterionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Criterion
        load_instance = True
        include_fk = False
        sqla_session = db.session


# ============================================================
# REVIEW SCHEMAS
# ============================================================


class ReviewSchema(ma.SQLAlchemyAutoSchema):
    """Full review schema with nested relationships.

    Note: To avoid N+1 queries, use Review.get_by_id_with_relations() or
    Review.get_all_with_relations() when fetching reviews for serialization.
    """

    class Meta:
        model = Review
        load_instance = True
        include_fk = False
        sqla_session = db.session

    reviewer = fields.Nested(UserListSchema, dump_only=True)
    reviewee = fields.Nested(UserListSchema, dump_only=True)
    assignment = fields.Nested(AssignmentSchema, dump_only=True)


class ReviewListSchema(ma.SQLAlchemyAutoSchema):
    """Lightweight review schema for list endpoints.

    Uses minimal nested data to reduce query complexity.
    For list views, we don't need full assignment details with nested course.

    Note: Only includes assignmentID as FK since reviewer/reviewee provide their own IDs.
    This avoids redundancy while giving clients the assignment link they need.
    """

    class Meta:
        model = Review
        fields = ("id", "assignmentID", "reviewer", "reviewee")
        dump_only = ("id",)
        include_fk = True  # Allows assignmentID to be serialized

    reviewer = fields.Nested(UserListSchema, dump_only=True)
    reviewee = fields.Nested(UserListSchema, dump_only=True)


# ============================================================
# GROUP SCHEMAS
# ============================================================


class CourseGroupSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = CourseGroup
        load_instance = True
        include_fk = True  # Include courseID
        sqla_session = db.session


class GroupMembersSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Group_Members
        load_instance = True
        include_fk = False
        sqla_session = db.session


# ============================================================
# JUNCTION TABLE SCHEMAS
# ============================================================


class UserCourseSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User_Course
        load_instance = True
        include_fk = False
        sqla_session = db.session


class SubmissionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Submission
        load_instance = True
        include_fk = False
        sqla_session = db.session
