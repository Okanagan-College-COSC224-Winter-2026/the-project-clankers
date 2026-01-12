"""
User-Course association model for the peer evaluation app.
"""

from .db import db


class User_Course(db.Model):
    """Association model between users and courses"""

    __tablename__ = "User_Courses"

    userID = db.Column(db.Integer, db.ForeignKey("User.id"), primary_key=True)
    courseID = db.Column(db.Integer, db.ForeignKey("Course.id"), primary_key=True)

    # relationships
    user = db.relationship("User", back_populates="user_courses", overlaps="courses, students")
    course = db.relationship("Course", back_populates="user_courses", overlaps="courses, students")

    def __init__(self, userID, courseID):
        self.userID = userID
        self.courseID = courseID

    def __repr__(self):
        return f"<User_Course user={self.userID} course={self.courseID}>"

    @classmethod
    def get(cls, userID, courseID):
        return cls.query.filter_by(userID=userID, courseID=courseID).first()
    
    @classmethod
    def get_courses_by_student(cls, user_id):
        return cls.query.filter_by(userID=user_id).all()

    @classmethod
    def add(cls, user_id, course_id):
        assoc = cls(userID=int(user_id), courseID=int(course_id))
        db.session.add(assoc)
        db.session.commit()
        return assoc

    def delete(self):
        db.session.delete(self)
        db.session.commit()
