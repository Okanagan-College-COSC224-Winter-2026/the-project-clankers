"""
Criterion model for the peer evaluation app.
"""

from .db import db


class Criterion(db.Model):
    """Criterion model representing evaluation criteria"""

    __tablename__ = "Criterion"

    id = db.Column(db.Integer, primary_key=True)
    reviewID = db.Column(db.Integer, db.ForeignKey("Review.id"), nullable=False, index=True)
    criterionRowID = db.Column(
        db.Integer, db.ForeignKey("Criteria_Description.id"), nullable=False, index=True
    )
    grade = db.Column(db.Integer, nullable=True)
    comments = db.Column(db.String(255), nullable=True)

    # relationships
    review = db.relationship("Review", back_populates="criteria")
    criterion_row = db.relationship("CriteriaDescription", back_populates="criteria")

    def __init__(self, reviewID, criterionRowID, grade=None, comments=None):
        self.reviewID = reviewID
        self.criterionRowID = criterionRowID
        self.grade = grade
        self.comments = comments

    def __repr__(self):
        return f"<Criterion id={self.id} review={self.reviewID}>"

    @classmethod
    def get_by_id(cls, criterion_id):
        """Get criterion by ID"""
        return db.session.get(cls, int(criterion_id))

    @classmethod
    def create_criterion(cls, criterion):
        """Add a new criterion to the database"""
        db.session.add(criterion)
        db.session.commit()
        return criterion

    def update(self):
        """Update criterion in the database"""
        db.session.commit()

    def delete(self):
        """Delete criterion from the database"""
        db.session.delete(self)
        db.session.commit()
