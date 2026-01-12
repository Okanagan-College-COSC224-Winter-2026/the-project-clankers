"""
Tests for ReviewSchema nested relationships and N+1 query prevention
"""

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine

from api.models.assignment_model import Assignment
from api.models.course_model import Course
from api.models.review_model import Review
from api.models.schemas import ReviewSchema
from api.models.user_model import User


class QueryCounter:
    """Context manager to count SQLAlchemy queries"""

    def __init__(self):
        self.queries = []

    def __enter__(self):
        event.listen(Engine, "before_cursor_execute", self.receive_before_cursor_execute)
        return self

    def __exit__(self, *args):
        event.remove(Engine, "before_cursor_execute", self.receive_before_cursor_execute)

    def receive_before_cursor_execute(
        self, conn, cursor, statement, parameters, context, executemany
    ):
        self.queries.append(statement)

    @property
    def count(self):
        return len(self.queries)


@pytest.fixture
def teacher_user(db):
    """Create a teacher user for testing"""
    teacher = User(
        name="Teacher", email="teacher@example.com", hash_pass="hashed_pass", role="teacher"
    )
    db.session.add(teacher)
    db.session.commit()
    return teacher


@pytest.fixture
def student_users(db):
    """Create multiple student users for testing"""
    students = [
        User(
            name=f"Student {i}",
            email=f"student{i}@example.com",
            hash_pass="hashed_pass",
            role="student",
        )
        for i in range(1, 6)  # Create 5 students
    ]
    for student in students:
        db.session.add(student)
    db.session.commit()
    return students


@pytest.fixture
def course_with_assignment(db, teacher_user):
    """Create a course with an assignment"""
    course = Course(teacherID=teacher_user.id, name="Test Course")
    db.session.add(course)
    db.session.commit()

    assignment = Assignment(courseID=course.id, name="Test Assignment", rubric_text="Test Rubric")
    db.session.add(assignment)
    db.session.commit()

    return course, assignment


@pytest.fixture
def reviews(db, course_with_assignment, student_users):
    """Create multiple reviews"""
    course, assignment = course_with_assignment

    review_list = []
    # Create reviews: each student reviews another student
    for i in range(4):
        review = Review(
            assignmentID=assignment.id,
            reviewerID=student_users[i].id,
            revieweeID=student_users[i + 1].id,
        )
        db.session.add(review)
        review_list.append(review)

    db.session.commit()
    return review_list


def test_review_schema_includes_all_nested_relations(
    db, reviews, student_users, course_with_assignment
):
    """
    GIVEN a review with reviewer, reviewee, and assignment
    WHEN the review is serialized with ReviewSchema
    THEN all nested fields should be populated correctly
    """
    schema = ReviewSchema()
    review = Review.get_by_id(reviews[0].id)

    result = schema.dump(review)

    # Check reviewer
    assert "reviewer" in result
    assert result["reviewer"] is not None
    assert result["reviewer"]["id"] == student_users[0].id
    assert result["reviewer"]["name"] == "Student 1"
    assert "hash_pass" not in result["reviewer"]

    # Check reviewee
    assert "reviewee" in result
    assert result["reviewee"] is not None
    assert result["reviewee"]["id"] == student_users[1].id
    assert result["reviewee"]["name"] == "Student 2"
    assert "hash_pass" not in result["reviewee"]

    # Check assignment
    assert "assignment" in result
    assert result["assignment"] is not None
    assert result["assignment"]["id"] == course_with_assignment[1].id
    assert result["assignment"]["name"] == "Test Assignment"


def test_review_schema_no_n_plus_one_single_review(db, reviews):
    """
    GIVEN a single review with nested relationships
    WHEN the review is serialized
    THEN it should not trigger N+1 queries
    """
    schema = ReviewSchema()

    # Clear any previous queries
    db.session.expire_all()

    with QueryCounter() as counter:
        review = Review.get_by_id(reviews[0].id)
        schema.dump(review)

    # With lazy='joined', reviewer, reviewee, and assignment are loaded in the initial query
    # Assignment also loads its course via lazy='joined'
    # Total: 1-2 queries (one JOIN query for review + related entities)
    print(f"\nQuery count for single review: {counter.count}")
    print("Queries executed:")
    for i, query in enumerate(counter.queries, 1):
        print(f"{i}. {query[:200]}...")

    assert counter.count <= 3, f"Too many queries: {counter.count}. Possible N+1 issue."


def test_review_schema_no_n_plus_one_multiple_reviews(db, reviews):
    """
    GIVEN multiple reviews with nested relationships
    WHEN all reviews are serialized
    THEN it should not trigger N+1 queries
    """
    schema = ReviewSchema(many=True)

    # Clear any previous queries
    db.session.expire_all()

    with QueryCounter() as counter:
        # Fetch all reviews - lazy='joined' automatically loads related entities
        review_list = Review.query.all()
        result = schema.dump(review_list)

    print(f"\nQuery count for {len(reviews)} reviews: {counter.count}")
    print("Queries executed:")
    for i, query in enumerate(counter.queries, 1):
        print(f"{i}. {query[:200]}...")

    # With lazy='joined' on reviewer, reviewee, and assignment:
    # 1 query with JOINs for all reviews and their related entities
    # This prevents N+1 queries

    assert len(result) == 4
    assert counter.count <= 2, f"Too many queries: {counter.count}. N+1 issue detected."


def test_review_schema_many_serialization(db, reviews, student_users):
    """
    GIVEN multiple reviews
    WHEN serialized with ReviewSchema(many=True)
    THEN all reviews should serialize correctly with nested data
    """
    schema = ReviewSchema(many=True)
    review_list = Review.query.all()
    result = schema.dump(review_list)

    assert len(result) == 4

    # Check first review has all nested data
    first_review = result[0]
    assert "reviewer" in first_review
    assert first_review["reviewer"]["id"] == student_users[0].id
    assert "reviewee" in first_review
    assert first_review["reviewee"]["id"] == student_users[1].id
    assert "assignment" in first_review
    assert first_review["assignment"] is not None


def test_review_schema_excludes_password_fields(db, reviews):
    """
    GIVEN a review with reviewer and reviewee
    WHEN serialized with ReviewSchema
    THEN no password fields should be exposed in nested objects
    """
    schema = ReviewSchema()
    review = Review.get_by_id(reviews[0].id)
    result = schema.dump(review)

    # Check reviewer doesn't expose password
    assert "hash_pass" not in result["reviewer"]
    assert "password" not in result["reviewer"]

    # Check reviewee doesn't expose password
    assert "hash_pass" not in result["reviewee"]
    assert "password" not in result["reviewee"]


def test_review_list_schema_lighter_for_lists(db, reviews, student_users):
    """
    GIVEN a lighter ReviewListSchema
    WHEN serializing multiple reviews for list endpoints
    THEN it should use minimal fields and fewer queries than full ReviewSchema
    """
    from api.models.schemas import ReviewListSchema

    schema = ReviewListSchema(many=True)

    db.session.expire_all()

    with QueryCounter() as counter:
        review_list = Review.query.all()
        result = schema.dump(review_list)

    print(f"\nQuery count for ReviewListSchema with {len(reviews)} reviews: {counter.count}")

    assert len(result) == 4

    # Verify structure - should not include full assignment details
    for review in result:
        assert "id" in review
        assert "assignmentID" in review  # Just the ID, not nested object
        assert "reviewer" in review
        assert "reviewee" in review
        assert "assignment" not in review  # No nested assignment in list schema

        # Should not duplicate IDs that are in nested objects
        assert "reviewerID" not in review  # Redundant with reviewer.id
        assert "revieweeID" not in review  # Redundant with reviewee.id

        # Verify reviewer/reviewee have minimal data
        assert review["reviewer"]["id"] in [s.id for s in student_users]
        assert "name" in review["reviewer"]
        assert "hash_pass" not in review["reviewer"]

    # Should use same or fewer queries than full ReviewSchema
    assert counter.count <= 2, f"Too many queries: {counter.count}"
