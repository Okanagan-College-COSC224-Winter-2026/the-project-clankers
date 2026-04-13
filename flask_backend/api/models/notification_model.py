"""
Notification model for notifying teachers about pending enrollment requests.
"""

from datetime import datetime

from .db import db


class Notification(db.Model):
    """Model for notifications sent to users"""

    __tablename__ = "Notification"

    id = db.Column(db.Integer, primary_key=True)
    userID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)  # enrollment_request, etc.
    related_id = db.Column(db.Integer, nullable=False)  # ID of related object (e.g., EnrollmentRequest.id)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # relationships
    user = db.relationship("User", back_populates="notifications", foreign_keys=[userID])

    def __init__(self, userID, type, related_id, message):
        self.userID = userID
        self.type = type
        self.related_id = related_id
        self.message = message
        self.is_read = False

    def __repr__(self):
        return f"<Notification id={self.id} user={self.userID} type={self.type} read={self.is_read}>"

    @classmethod
    def get_by_id(cls, notification_id):
        """Get notification by ID"""
        return db.session.get(cls, int(notification_id))

    @classmethod
    def get_for_user(cls, user_id):
        """Get all notifications for a user"""
        return cls.query.filter_by(userID=user_id).order_by(cls.created_at.desc()).all()

    @classmethod
    def get_unread_for_user(cls, user_id):
        """Get unread notifications for a user"""
        return cls.query.filter_by(userID=user_id, is_read=False).order_by(
            cls.created_at.desc()
        ).all()

    @classmethod
    def create_notification(cls, user_id, type, related_id, message):
        """Create a new notification"""
        notification = cls(userID=user_id, type=type, related_id=related_id, message=message)
        db.session.add(notification)
        db.session.commit()
        return notification

    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        db.session.commit()

    def update(self):
        """Update notification in the database"""
        db.session.commit()

    def delete(self):
        """Delete notification from the database"""
        db.session.delete(self)
        db.session.commit()
