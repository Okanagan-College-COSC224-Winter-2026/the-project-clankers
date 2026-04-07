"""
Grade override model for instructor-controlled grade adjustments.
"""

from datetime import datetime, timezone

from sqlalchemy.exc import OperationalError

from .db import db


class GradeOverride(db.Model):
    """Manual grade override for a specific student-assignment pair."""

    __tablename__ = "GradeOverride"

    id = db.Column(db.Integer, primary_key=True)
    assignmentID = db.Column(db.Integer, db.ForeignKey("Assignment.id"), nullable=False, index=True)
    studentID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    teacherID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    override_grade = db.Column(db.Float, nullable=False)
    # Legacy columns kept for compatibility with existing databases.
    late_penalty_percent = db.Column(db.Float, nullable=False, default=0.0)
    incomplete_review_penalty_percent = db.Column(db.Float, nullable=False, default=0.0)
    notes = db.Column(db.String(500), nullable=True)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def reason(self):
        return self.notes

    @reason.setter
    def reason(self, value):
        self.notes = value

    @property
    def updated_by(self):
        return self.teacherID

    @updated_by.setter
    def updated_by(self, value):
        self.teacherID = value

    @classmethod
    def _ensure_table_exists(cls):
        cls.__table__.create(bind=db.engine, checkfirst=True)

    @classmethod
    def get_for_assignment_student(cls, assignment_id, student_id):
        try:
            return cls.query.filter_by(assignmentID=assignment_id, studentID=student_id).first()
        except OperationalError as exc:
            # Supports existing SQLite DBs created before this model existed.
            if "no such table" not in str(exc).lower():
                raise
            db.session.rollback()
            cls._ensure_table_exists()
            return cls.query.filter_by(assignmentID=assignment_id, studentID=student_id).first()
