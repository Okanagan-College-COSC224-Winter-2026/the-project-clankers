"""
GroupMembers model for the peer evaluation app.
"""

from .db import db


class Group_Members(db.Model):
    """Group_Members model representing members of a group"""

    __tablename__ = "Group_Members"

    userID = db.Column(db.Integer, db.ForeignKey("User.id"), primary_key=True)
    groupID = db.Column(db.Integer, db.ForeignKey("CourseGroup.id"), primary_key=True)

    # relationships
    user = db.relationship("User", back_populates="group_memberships")
    group = db.relationship("CourseGroup", back_populates="members")

    def __init__(self, userID, groupID):
        self.userID = userID
        self.groupID = groupID

    def __repr__(self):
        return f"<Group_Members user={self.userID} group={self.groupID}>"

    @classmethod
    def get(cls, userID, groupID):
        """Get group member by userID and groupID"""
        return db.session.get(cls, (int(userID), int(groupID)))

    @classmethod
    def create_group_member(cls, userID, groupID):
        """Add a new group member to the database"""
        group_member = cls(
            userID=int(userID),
            groupID=int(groupID),
        )
        db.session.add(group_member)
        db.session.commit()
        return group_member

    def delete(self):
        """Delete group member from the database"""
        db.session.delete(self)
        db.session.commit()
