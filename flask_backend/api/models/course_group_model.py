"""
CourseGroup model for the peer evaluation app.
"""

from .db import db


class CourseGroup(db.Model):
    """CourseGroup model representing groups within a course"""

    __tablename__ = "CourseGroup"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=True)
    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), nullable=False, index=True)

    # relationships
    course = db.relationship("Course", back_populates="groups")
    members = db.relationship(
        "Group_Members", back_populates="group", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(self, name, courseID):
        self.name = name
        self.courseID = courseID

    def __repr__(self):
        return f"<CourseGroup id={self.id} name={self.name}>"

    @classmethod
    def get_by_id(cls, group_id):
        """Get CourseGroup by ID"""
        return db.session.get(cls, int(group_id))

    @classmethod
    def get_by_course_id(cls, course_id):
        """Get all groups for a specific course"""
        return cls.query.filter_by(courseID=int(course_id)).all()

    @classmethod
    def create_group(cls, group):
        """Add a new CourseGroup to the database"""
        db.session.add(group)
        db.session.commit()
        return group

    def update(self):
        """Update CourseGroup in the database"""
        db.session.commit()

    def delete(self):
        """Delete CourseGroup from the database"""
        db.session.delete(self)
        db.session.commit()
