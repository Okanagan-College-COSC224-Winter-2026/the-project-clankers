"""
Student submission model for storing student-uploaded files per assignment.
"""

from datetime import datetime, timezone
from .db import db


class StudentSubmission(db.Model):
    """Model for student submissions to assignments."""

    __tablename__ = "StudentSubmission"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("Assignment.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)  # Original filename
    file_path = db.Column(db.String(500), nullable=False)  # Server-side unique path
    submitted_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    assignment = db.relationship("Assignment", back_populates="student_submissions")
    student = db.relationship("User", foreign_keys=[student_id])

    def __init__(self, assignment_id, student_id, filename, file_path):
        self.assignment_id = assignment_id
        self.student_id = student_id
        self.filename = filename
        self.file_path = file_path

    def __repr__(self):
        return f"<StudentSubmission id={self.id} assignment_id={self.assignment_id} student_id={self.student_id} filename={self.filename}>"

    @classmethod
    def get_by_id(cls, submission_id):
        """Get submission by ID"""
        return db.session.get(cls, int(submission_id))

    @classmethod
    def get_by_assignment_id(cls, assignment_id):
        """Get all submissions for an assignment"""
        return cls.query.filter_by(assignment_id=assignment_id).order_by(cls.submitted_at.desc()).all()

    @classmethod
    def get_by_student_and_assignment(cls, student_id, assignment_id):
        """Get all submissions by a specific student for a specific assignment"""
        return cls.query.filter_by(student_id=student_id, assignment_id=assignment_id).order_by(cls.submitted_at.desc()).all()

    @classmethod
    def create(cls, submission):
        """Add a new submission to the database"""
        db.session.add(submission)
        db.session.commit()
        return submission

    @classmethod
    def delete(cls, submission):
        """Delete a submission from the database"""
        db.session.delete(submission)
        db.session.commit()
