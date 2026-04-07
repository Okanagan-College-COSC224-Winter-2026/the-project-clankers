"""
Assignment model for the peer evaluation app.
"""

from .db import db
from datetime import datetime, timezone


class Assignment(db.Model):
    """Assignment model representing assignments in the peer evaluation app."""

    __tablename__ = "Assignment"

    id = db.Column(db.Integer, primary_key=True)
    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), index=True)
    name = db.Column(db.String(255), nullable=True)
    rubric_text = db.Column("rubric", db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)  # Assignment description/details with markdown support

    # NEW: start date field (assignment not visible to students before this date)
    start_date = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    # NEW: due date field (acceptance criteria: edit/delete allowed before due date)
    due_date = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    
    # Submission type: 'individual' or 'group'
    submission_type = db.Column(db.String(20), default='individual', nullable=False)

    # Peer review options
    internal_review = db.Column(db.Boolean, default=False, nullable=False)  # Group only: teammates review each other
    external_review = db.Column(db.Boolean, default=False, nullable=False)  # Group: groups review other groups; Individual: classmates review each other
    anonymous_review = db.Column(db.Boolean, default=False, nullable=False)  # Hide reviewer names from students
    peer_review_start_date = db.Column(db.DateTime(timezone=True), nullable=True, index=True)  # When peer reviews become available
    peer_review_due_date = db.Column(db.DateTime(timezone=True), nullable=True, index=True)  # Deadline for submitting peer reviews

    # File attachment fields
    attachment_filename = db.Column(db.String(255), nullable=True)  # Original filename
    attachment_path = db.Column(db.String(500), nullable=True)  # Server-side path

    # relationships
    course = db.relationship("Course", back_populates="assignments", lazy="joined")
    rubrics = db.relationship(
        "Rubric", back_populates="assignment", cascade="all, delete-orphan", lazy="dynamic"
    )
    submissions = db.relationship(
        "Submission", back_populates="assignment", cascade="all, delete-orphan", lazy="dynamic"
    )
    reviews = db.relationship(
        "Review", back_populates="assignment", cascade="all, delete-orphan", lazy="dynamic"
    )
    files = db.relationship(
        "AssignmentFile", back_populates="assignment", cascade="all, delete-orphan", lazy="dynamic"
    )
    student_submissions = db.relationship(
        "StudentSubmission", back_populates="assignment", cascade="all, delete-orphan", lazy="dynamic"
    )
    grade_overrides = db.relationship(
        "GradeOverride", cascade="all, delete-orphan", lazy="dynamic",
        primaryjoin="Assignment.id == foreign(GradeOverride.assignmentID)"
    )

    def __init__(self, courseID, name, rubric_text, start_date=None, due_date=None, submission_type='individual', internal_review=False, external_review=False, anonymous_review=False, attachment_filename=None, attachment_path=None, description=None, peer_review_start_date=None, peer_review_due_date=None):
        self.courseID = courseID
        self.name = name
        self.rubric_text = rubric_text
        self.description = description
        self.start_date = start_date
        self.due_date = due_date
        self.submission_type = submission_type
        self.internal_review = internal_review
        self.external_review = external_review
        self.anonymous_review = anonymous_review
        self.attachment_filename = attachment_filename
        self.attachment_path = attachment_path
        self.peer_review_start_date = peer_review_start_date
        self.peer_review_due_date = peer_review_due_date

    def __repr__(self):
        return f"<Assignment id={self.id} name={self.name}>"

    @classmethod
    def get_by_id(cls, assignment_id):
        """Get assignment by ID"""
        return db.session.get(cls, int(assignment_id))
    
    @classmethod
    def get_by_class_id(cls, class_id):
        """Get assignments by class ID"""
        return cls.query.filter_by(courseID=class_id).all()

    @classmethod
    def create(cls, assignment):
        """Add a new assignment to the database"""
        db.session.add(assignment)
        db.session.commit()
        return assignment

    def _get_current_utc_time(self):
        return datetime.now(timezone.utc)
    
    def _ensure_timezone_aware(self, dt):
        if dt is None:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    
    def can_modify(self):
        """Check if the assignment can be modified (edited/deleted) at the given time."""
        due = self._ensure_timezone_aware(self.due_date)
        now = self._get_current_utc_time()
        return (due is None) or (now < due)
    
    def is_peer_review_available(self):
        """Check if peer reviews are available based on the start and due dates."""
        start = self._ensure_timezone_aware(self.peer_review_start_date)
        due = self._ensure_timezone_aware(self.peer_review_due_date)
        now = self._get_current_utc_time()

        # If no start date, only check due date
        if start is None:
            return (due is None) or (now <= due)

        # If no due date, only check start date
        if due is None:
            return now >= start

        # Both dates exist: check if now is between start and due
        return start <= now <= due

    def is_peer_review_started(self):
        """Check if peer review period has started."""
        if self.peer_review_start_date is None:
            return True  # No start date means it's always available
        start = self._ensure_timezone_aware(self.peer_review_start_date)
        now = self._get_current_utc_time()
        return now >= start

    def is_visible_to_students(self):
        """Check if the assignment is visible to students based on start date."""
        if self.start_date is None:
            return True  # No start date means it's always visible
        start = self._ensure_timezone_aware(self.start_date)
        now = self._get_current_utc_time()
        return now >= start

    def update(self):
        """Update assignment in the database"""
        db.session.commit()

    def delete(self):
        """Delete assignment from the database"""
        db.session.delete(self)
        db.session.commit()
