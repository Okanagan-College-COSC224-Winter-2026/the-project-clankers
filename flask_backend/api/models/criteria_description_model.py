"""
CriteriaDescription model for the peer evaluation app.
"""

from .db import db


class CriteriaDescription(db.Model):
    """CriteriaDescription model representing evaluation criteria descriptions"""

    __tablename__ = "Criteria_Description"

    id = db.Column(db.Integer, primary_key=True)
    rubricID = db.Column(db.Integer, db.ForeignKey("Rubric.id"), nullable=False, index=True)
    question = db.Column(db.String(255), nullable=True)
    scoreMax = db.Column(db.Integer, nullable=True)
    hasScore = db.Column(db.Boolean, nullable=False, default=True)
    description = db.Column(db.Text, nullable=True)  # Additional description for no-score criteria

    # relationships
    rubric = db.relationship("Rubric", back_populates="criteria_descriptions")
    criteria = db.relationship(
        "Criterion", back_populates="criterion_row", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(self, rubricID, question, scoreMax, hasScore=True, description=None):
        self.rubricID = rubricID
        self.question = question
        self.scoreMax = scoreMax
        self.hasScore = hasScore
        self.description = description

    def __repr__(self):
        return f"<CriteriaDescription id={self.id} rubric={self.rubricID}>"

    @classmethod
    def get_by_id(cls, criteria_id):
        """Get criteria description by ID"""
        return db.session.get(cls, int(criteria_id))

    @classmethod
    def create_criteria_description(cls, criteria_description):
        """Add a new criteria description to the database"""
        db.session.add(criteria_description)
        db.session.commit()
        return criteria_description

    def update(self):
        """Update criteria description in the database"""
        db.session.commit()

    def delete(self):
        """Delete criteria description from the database"""
        db.session.delete(self)
        db.session.commit()
