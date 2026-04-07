"""
EnrollmentRequest model for pending course enrollments.
When a student requests to join a course, a request is created.
Teachers can approve or reject the request via notifications.
"""

from datetime import datetime, timezone
from sqlalchemy import CheckConstraint

from .db import db


class EnrollmentRequest(db.Model):
    """Model for students requesting to enroll in courses"""

    __tablename__ = "EnrollmentRequest"

    id = db.Column(db.Integer, primary_key=True)
    studentID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), nullable=False, index=True)
    status = db.Column(db.String(50), default="pending", nullable=False)  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    teacher_notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="check_valid_status"),
    )

    # relationships
    student = db.relationship("User", foreign_keys=[studentID], backref="enrollment_requests")
    course = db.relationship("Course", foreign_keys=[courseID], backref="enrollment_requests")

    def __init__(self, studentID, courseID):
        self.studentID = studentID
        self.courseID = courseID
        self.status = "pending"

    def __repr__(self):
        return f"<EnrollmentRequest id={self.id} student={self.studentID} course={self.courseID} status={self.status}>"

    @classmethod
    def get_by_id(cls, request_id):
        """Get enrollment request by ID"""
        return db.session.get(cls, int(request_id))

    @classmethod
    def get_pending_for_course(cls, course_id):
        """Get all pending enrollment requests for a course"""
        return cls.query.filter_by(courseID=course_id, status="pending").all()

    @classmethod
    def get_pending_for_student(cls, student_id):
        """Get all pending enrollment requests for a student"""
        return cls.query.filter_by(studentID=student_id, status="pending").all()

    @classmethod
    def get_existing_request(cls, student_id, course_id):
        """Check if a student already has a pending request for a course"""
        return cls.query.filter_by(
            studentID=student_id, courseID=course_id, status="pending"
        ).first()

    @classmethod
    def create_request(cls, student_id, course_id):
        """Create a new enrollment request"""
        # Check if already exists
        existing = cls.get_existing_request(student_id, course_id)
        if existing:
            return existing

        request = cls(studentID=student_id, courseID=course_id)
        db.session.add(request)
        db.session.commit()
        return request

    def approve(self):
        """Approve the enrollment request"""
        from .user_course_model import User_Course

        # Add student to course
        User_Course.add(self.studentID, self.courseID)

        # Mark request as approved
        self.status = "approved"
        self.resolved_at = datetime.now(timezone.utc)
        db.session.commit()

    def reject(self, notes=None):
        """Reject the enrollment request"""
        self.status = "rejected"
        self.resolved_at = datetime.now(timezone.utc)
        if notes:
            self.teacher_notes = notes
        db.session.commit()

    def update(self):
        """Update enrollment request in the database"""
        db.session.commit()

    def delete(self):
        """Delete enrollment request from the database"""
        db.session.delete(self)
        db.session.commit()
