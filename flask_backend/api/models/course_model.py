"""
Course model for the peer evaluation app.
"""

from sqlalchemy.orm import joinedload

from .db import db


class Course(db.Model):
    """Course model"""

    __tablename__ = "Course"

    id = db.Column(db.Integer, primary_key=True)
    teacherID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=True)
    is_archived = db.Column(db.Boolean, default=False, nullable=False)

    # relationships
    teacher = db.relationship("User", back_populates="teaching_courses", foreign_keys=[teacherID])
    assignments = db.relationship(
        "Assignment", back_populates="course", cascade="all, delete-orphan", lazy="dynamic"
    )
    user_courses = db.relationship(
        "User_Course",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="dynamic",
        overlaps="students",
    )
    # Note: students uses lazy='selectin' instead of 'dynamic' to support eager loading for serialization
    students = db.relationship(
        "User",
        secondary="User_Courses",
        back_populates="courses",
        lazy="selectin",
        overlaps="user_courses",
    )
    groups = db.relationship(
        "CourseGroup", back_populates="course", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(self, teacherID, name):
        self.teacherID = teacherID
        self.name = name

    def __repr__(self):
        return f"<Course id={self.id} name={self.name}>"

    @classmethod
    def get_by_id(cls, course_id):
        """Get course by ID"""
        return db.session.get(cls, int(course_id))

    @classmethod
    def get_by_id_with_relations(cls, course_id):
        """Get course by ID with teacher eagerly loaded.
        Students are automatically loaded via lazy='selectin'."""
        return cls.query.options(joinedload(cls.teacher)).filter_by(id=int(course_id)).first()

    @classmethod
    def get_all_with_relations(cls):
        """Get all courses with teacher eagerly loaded.
        Students are automatically loaded via lazy='selectin'."""
        return cls.query.options(joinedload(cls.teacher)).all()

    @classmethod
    def get_all_courses(cls):
        """Get all non-archived courses"""
        return cls.query.filter_by(is_archived=False).all()

    @classmethod
    def get_courses_by_teacher(cls, teacher_id):
        """Get all non-archived courses taught by a specific teacher"""
        return cls.query.filter_by(teacherID=teacher_id, is_archived=False).all()

    @classmethod
    def get_by_name(cls, name):
        """Get course by name"""
        return cls.query.filter_by(name=name).first()

    @classmethod
    def get_by_name_teacher(cls, name, teacher_id):
        """Get course by name and teacher ID"""
        return cls.query.filter_by(name=name, teacherID=teacher_id).first()

    @classmethod
    def create_course(cls, course):
        """Add a new course to the database"""
        db.session.add(course)
        db.session.commit()
        return course

    def update(self):
        """Update course in the database"""
        db.session.commit()

    def archive(self):
        """Archive course (hide from teacher dashboard without deleting data)"""
        self.is_archived = True
        db.session.commit()

    def delete(self):
        """Delete course from the database"""
        db.session.delete(self)
        db.session.commit()

    def get_student_count(self):
        """Get the number of students enrolled in this course"""
        from .user_course_model import User_Course
        return User_Course.query.filter_by(courseID=self.id).count()

    def get_next_due_date(self):
        """Get the earliest upcoming assignment due date for this course"""
        from datetime import datetime, timezone
        from .assignment_model import Assignment
        
        # Get all assignments for this course with due dates
        assignments = self.assignments.filter(
            Assignment.due_date.isnot(None)
        ).all()
        
        if not assignments:
            return None
        
        # Find the earliest due date that is in the future
        now = datetime.now(timezone.utc)
        future_due_dates = [a.due_date for a in assignments if a.due_date and a.due_date > now]
        
        if future_due_dates:
            return min(future_due_dates)
        
        # If no future dates, return the latest past date
        return max([a.due_date for a in assignments])

    def get_pending_reviews_count(self):
        """Get the count of incomplete peer reviews for this course"""
        from sqlalchemy import func
        from .criterion_model import Criterion
        from .assignment_model import Assignment
        from .review_model import Review
        
        # A review is incomplete if it has criteria with NULL grades
        # Get all reviews for assignments in this course
        incomplete_reviews = db.session.query(
            func.count(db.distinct(Criterion.reviewID))
        ).join(
            Review, Criterion.reviewID == Review.id
        ).join(
            Assignment, Review.assignmentID == Assignment.id
        ).filter(
            Assignment.courseID == self.id,
            Criterion.grade.is_(None)  # Incomplete: grade not set
        ).scalar()
        
        return incomplete_reviews or 0
