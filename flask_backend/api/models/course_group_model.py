"""
CourseGroup model for the peer evaluation app.
"""

from .db import db


class CourseGroup(db.Model):
    """CourseGroup model representing groups of courses"""

    __tablename__ = "CourseGroup"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=True)
    assignmentID = db.Column(db.Integer, db.ForeignKey("Assignment.id"), nullable=False, index=True)

    # relationships
    assignment = db.relationship("Assignment", back_populates="groups")
    members = db.relationship(
        "Group_Members", back_populates="group", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(self, name, assignmentID):
        self.name = name
        self.assignmentID = assignmentID

    def __repr__(self):
        return f"<CourseGroup id={self.id} name={self.name}>"

    @classmethod
    def get_by_id(cls, group_id):
        """Get CourseGroup by ID"""
        return db.session.get(cls, int(group_id))

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
