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

    def __init__(self, assignmentID, reviewerID, revieweeID):
        self.assignmentID = assignmentID
        self.reviewerID = reviewerID
        self.revieweeID = revieweeID

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
        from .assignment_model import Assignment
        return (
            cls.query.options(joinedload(cls.assignment).joinedload(Assignment.course))
            .filter_by(id=int(review_id))
            .first()
        )

    @classmethod
    def get_all_with_relations(cls):
        """Get all reviews with relationships loaded.
        Assignment relationships (reviewer, reviewee, assignment) are
        automatically loaded via lazy='joined'."""
        from .assignment_model import Assignment
        return cls.query.options(joinedload(cls.assignment).joinedload(Assignment.course)).all()

    def is_complete(self):
        """Check if all required criteria have been scored.
        
        A review is complete when all criteria with hasScore=True have a grade assigned.
        """
        from .criteria_description_model import CriteriaDescription
        # Get all criteria descriptions that require scoring for this review's assignment
        from .rubric_model import Rubric
        required_criteria = (
            CriteriaDescription.query
            .join(Rubric, CriteriaDescription.rubricID == Rubric.id)
            .filter(
                Rubric.assignmentID == self.assignmentID,
                CriteriaDescription.hasScore == True
            )
            .all()
        )
        
        # Simpler approach: get criteria from the assignment's first rubric
        from .rubric_model import Rubric
        rubric = Rubric.query.filter(
            Rubric.assignmentID == self.assignmentID
        ).first()
        
        if not rubric:
            # No rubric means no scoring required
            return True
        
        required_criteria = CriteriaDescription.query.filter(
            CriteriaDescription.rubricID == rubric.id,
            CriteriaDescription.hasScore == True
        ).all()
        
        if not required_criteria:
            # No required criteria
            return True
        
        # Check that all required criteria have grades in this review
        from .criterion_model import Criterion
        for required in required_criteria:
            criterion_response = Criterion.query.filter(
                Criterion.reviewID == self.id,
                Criterion.criterionRowID == required.id
            ).first()
            
            # If any required criterion is missing or has no grade, not complete
            if not criterion_response or criterion_response.grade is None:
                return False
        
        return True

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
