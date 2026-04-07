"""Course total override model for instructor-adjusted final course totals."""

from datetime import datetime, timezone

from sqlalchemy.exc import OperationalError

from .db import db


class CourseTotalOverride(db.Model):
    """Manual course total override for a specific student in a course."""

    __tablename__ = "CourseTotalOverride"
    __table_args__ = (
        db.UniqueConstraint("courseID", "studentID", name="uq_course_total_override_course_student"),
    )

    id = db.Column(db.Integer, primary_key=True)
    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), nullable=False, index=True)
    studentID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    override_total = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(500), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @classmethod
    def _ensure_table_exists(cls):
        cls.__table__.create(bind=db.engine, checkfirst=True)

    @classmethod
    def get_for_course_student(cls, course_id, student_id):
        try:
            return cls.query.filter_by(courseID=course_id, studentID=student_id).first()
        except OperationalError as exc:
            if "no such table" not in str(exc).lower():
                raise
            db.session.rollback()
            cls._ensure_table_exists()
            return cls.query.filter_by(courseID=course_id, studentID=student_id).first()
