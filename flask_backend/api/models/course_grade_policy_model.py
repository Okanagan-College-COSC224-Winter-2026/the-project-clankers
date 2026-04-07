"""
Course grade policy model for class-level penalty safeguards.
"""

from datetime import datetime, timezone

from sqlalchemy.exc import OperationalError

from .db import db


class CourseGradePolicy(db.Model):
    """Penalty policy settings for a course."""

    __tablename__ = "CourseGradePolicy"

    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), primary_key=True)
    late_penalty_percent = db.Column(db.Float, nullable=False, default=0.0)
    incomplete_evaluation_penalty_percent = db.Column(db.Float, nullable=False, default=0.0)
    updated_by = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=True)
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
    def get_or_create(cls, course_id):
        try:
            policy = cls.query.filter_by(courseID=course_id).first()
        except OperationalError as exc:
            # Supports existing SQLite DBs created before this model existed.
            if "no such table" not in str(exc).lower():
                raise
            db.session.rollback()
            cls._ensure_table_exists()
            policy = cls.query.filter_by(courseID=course_id).first()

        if policy:
            return policy

        policy = cls(courseID=course_id)
        db.session.add(policy)
        db.session.commit()
        return policy
