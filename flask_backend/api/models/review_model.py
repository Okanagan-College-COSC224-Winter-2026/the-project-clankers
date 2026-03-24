"""
Review model for the peer evaluation app.
"""

from sqlalchemy.orm import joinedload

from .db import db


class Review(db.Model):
    """Review model representing peer evaluations"""

    __tablename__ = "Review"

    id = db.Column(db.Integer, primary_key=True)
    assignmentID = db.Column(db.Integer, db.ForeignKey("Assignment.id"), nullable=False, index=True)
    reviewerID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    revieweeID = db.Column(db.Integer, db.ForeignKey("User.id"), nullable=False, index=True)
    reviewee_type = db.Column(db.String(10), nullable=False, default='user', server_default='user')
    reviewer_type = db.Column(db.String(10), nullable=False, default='user', server_default='user')

    # relationships - using lazy='joined' for commonly accessed foreign entities
    assignment = db.relationship("Assignment", back_populates="reviews", lazy="joined")
    reviewer = db.relationship(
        "User", foreign_keys=[reviewerID], back_populates="reviews_made", lazy="joined"
    )
    reviewee = db.relationship(
        "User", foreign_keys=[revieweeID], back_populates="reviews_received", lazy="joined"
    )
    criteria = db.relationship(
        "Criterion", back_populates="review", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(self, assignmentID, reviewerID, revieweeID, reviewee_type='user', reviewer_type='user'):
        self.assignmentID = assignmentID
        self.reviewerID = reviewerID
        self.revieweeID = revieweeID
        self.reviewee_type = reviewee_type
        self.reviewer_type = reviewer_type

    def __repr__(self):
        return f"<Review id={self.id} assignmentID={self.assignmentID}>"

    @classmethod
    def get_by_id(cls, review_id):
        """Get review by ID (relationships are eagerly loaded via lazy='joined')"""
        return db.session.get(cls, int(review_id))

    @classmethod
    def get_by_id_with_relations(cls, review_id):
        """Get review by ID with all relationships explicitly loaded.
        Use this when you need to ensure assignment's course is also loaded."""
        return (
            cls.query.options(joinedload(cls.assignment).joinedload("course"))
            .filter_by(id=int(review_id))
            .first()
        )

    @classmethod
    def get_all_with_relations(cls):
        """Get all reviews with relationships loaded.
        Assignment relationships (reviewer, reviewee, assignment) are
        automatically loaded via lazy='joined'."""
        return cls.query.options(joinedload(cls.assignment).joinedload("course")).all()

    @classmethod
    def create_review(cls, review):
        """Add a new review to the database"""
        db.session.add(review)
        db.session.commit()
        return review

    def update(self):
        """Update review in the database"""
        db.session.commit()

    def delete(self):
        """Delete review from the database"""
        db.session.delete(self)
        db.session.commit()
