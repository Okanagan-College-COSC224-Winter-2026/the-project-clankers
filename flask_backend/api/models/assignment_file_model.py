"""
Assignment file model for storing multiple file attachments per assignment.
"""

from datetime import datetime, timezone
from .db import db


class AssignmentFile(db.Model):
    """Model for files attached to assignments."""

    __tablename__ = "AssignmentFile"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("Assignment.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)  # Original filename
    file_path = db.Column(db.String(500), nullable=False)  # Server-side unique path
    uploaded_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    uploaded_by = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False)

    # Relationships
    assignment = db.relationship("Assignment", back_populates="files")
    uploader = db.relationship("User", foreign_keys=[uploaded_by])

    def __init__(self, assignment_id, filename, file_path, uploaded_by):
        self.assignment_id = assignment_id
        self.filename = filename
        self.file_path = file_path
        self.uploaded_by = uploaded_by

    def __repr__(self):
        return f"<AssignmentFile id={self.id} filename={self.filename}>"

    @classmethod
    def get_by_id(cls, file_id):
        """Get file by ID"""
        return db.session.get(cls, int(file_id))

    @classmethod
    def get_by_assignment_id(cls, assignment_id):
        """Get all files for an assignment"""
        return cls.query.filter_by(assignment_id=assignment_id).order_by(cls.uploaded_at.desc()).all()

    @classmethod
    def create(cls, assignment_file):
        """Add a new file to the database"""
        db.session.add(assignment_file)
        db.session.commit()
        return assignment_file

    def delete(self):
        """Delete file from the database"""
        db.session.delete(self)
        db.session.commit()
