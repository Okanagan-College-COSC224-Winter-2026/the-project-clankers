"""
Tests for CourseSchema nested relationships and N+1 query prevention
"""

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine

from api.models.course_model import Course
from api.models.schemas import CourseSchema
from api.models.user_course_model import User_Course
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
        name="Teacher One", email="teacher@example.com", hash_pass="hashed_pass", role="teacher"
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
def course_with_students(db, teacher_user, student_users):
    """Create a course with teacher and students"""
    course = Course(teacherID=teacher_user.id, name="Test Course 101")
    db.session.add(course)
    db.session.commit()

    # Enroll students
    for student in student_users:
        user_course = User_Course(userID=student.id, courseID=course.id)
        db.session.add(user_course)
    db.session.commit()

    return course


def test_course_schema_includes_teacher(db, course_with_students, teacher_user):
    """
    GIVEN a course with a teacher
    WHEN the course is serialized with CourseSchema
    THEN the teacher field should be populated with teacher details
    """
    schema = CourseSchema()
    course = Course.get_by_id_with_relations(course_with_students.id)

    result = schema.dump(course)

    assert "teacher" in result
    assert result["teacher"] is not None
    assert result["teacher"]["id"] == teacher_user.id
    assert result["teacher"]["name"] == "Teacher One"
    assert result["teacher"]["email"] == "teacher@example.com"
    assert result["teacher"]["role"] == "teacher"
    assert "hash_pass" not in result["teacher"]  # Should not expose password


def test_course_schema_includes_students(db, course_with_students, student_users):
    """
    GIVEN a course with multiple students
    WHEN the course is serialized with CourseSchema
    THEN the students field should be populated with all student details
    """
    schema = CourseSchema()
    course = Course.get_by_id_with_relations(course_with_students.id)

    result = schema.dump(course)

    assert "students" in result
    assert result["students"] is not None
    assert len(result["students"]) == 5

    # Verify all students are included
    student_ids = {s["id"] for s in result["students"]}
    expected_ids = {s.id for s in student_users}
    assert student_ids == expected_ids

    # Check structure of first student
    first_student = result["students"][0]
    assert "id" in first_student
    assert "name" in first_student
    assert "email" in first_student
    assert "role" in first_student
    assert first_student["role"] == "student"
    assert "hash_pass" not in first_student  # Should not expose password


def test_course_schema_with_no_students(db, teacher_user):
    """
    GIVEN a course with no students enrolled
    WHEN the course is serialized with CourseSchema
    THEN the students field should be an empty list
    """
    course = Course(teacherID=teacher_user.id, name="Empty Course")
    db.session.add(course)
    db.session.commit()

    schema = CourseSchema()
    course = Course.get_by_id_with_relations(course.id)

    result = schema.dump(course)

    assert "students" in result
    assert result["students"] == []


def test_course_schema_no_n_plus_one_single_course(db, course_with_students):
    """
    GIVEN a single course with teacher and students
    WHEN the course is serialized with eager loading
    THEN it should not trigger N+1 queries
    """
    schema = CourseSchema()

    # Clear any previous queries
    db.session.expire_all()

    with QueryCounter() as counter:
        course = Course.get_by_id_with_relations(course_with_students.id)
        schema.dump(course)

    # With eager loading:
    # 1 query for course with joined teacher
    # 1 query for students (selectinload)
    # Total: 2-4 queries maximum (some extra queries for session management)
    print(f"\nQuery count for single course: {counter.count}")
    print("Queries executed:")
    for i, query in enumerate(counter.queries, 1):
        print(f"{i}. {query[:200]}...")

    assert counter.count <= 4, f"Too many queries: {counter.count}. N+1 issue detected."


def test_course_schema_no_n_plus_one_multiple_courses(db, teacher_user, student_users):
    """
    GIVEN multiple courses with teacher and students
    WHEN all courses are serialized with eager loading
    THEN it should not trigger N+1 queries
    """
    # Create 3 courses with the same teacher and students
    courses = []
    for i in range(3):
        course = Course(teacherID=teacher_user.id, name=f"Course {i + 1}")
        db.session.add(course)
        db.session.commit()

        # Enroll all students
        for student in student_users[:3]:  # Use 3 students per course
            user_course = User_Course(userID=student.id, courseID=course.id)
            db.session.add(user_course)
        db.session.commit()
        courses.append(course)

    schema = CourseSchema(many=True)

    # Clear any previous queries
    db.session.expire_all()

    with QueryCounter() as counter:
        # Fetch all courses with eager loading
        course_list = Course.get_all_with_relations()
        result = schema.dump(course_list)

    print(f"\nQuery count for {len(courses)} courses: {counter.count}")
    print("Queries executed:")
    for i, query in enumerate(counter.queries, 1):
        print(f"{i}. {query[:200]}...")

    # With proper eager loading:
    # 1 query for courses with joined teachers
    # 1 query for all students (selectinload batches them)
    # Total: 2-3 queries regardless of number of courses

    assert len(result) == 3
    assert counter.count <= 3, f"Too many queries: {counter.count}. N+1 issue detected."


def test_course_schema_many_serialization(db, teacher_user, student_users):
    """
    GIVEN multiple courses
    WHEN serialized with CourseSchema(many=True)
    THEN all courses should serialize correctly with nested data
    """
    # Create 2 courses
    course1 = Course(teacherID=teacher_user.id, name="Course 1")
    course2 = Course(teacherID=teacher_user.id, name="Course 2")
    db.session.add_all([course1, course2])
    db.session.commit()

    # Enroll students differently
    User_Course.add(student_users[0].id, course1.id)
    User_Course.add(student_users[1].id, course1.id)
    User_Course.add(student_users[2].id, course2.id)
    db.session.commit()

    schema = CourseSchema(many=True)
    courses = Course.get_all_with_relations()
    result = schema.dump(courses)

    assert len(result) == 2

    # Check first course
    c1 = next(c for c in result if c["name"] == "Course 1")
    assert c1["teacher"]["id"] == teacher_user.id
    assert len(c1["students"]) == 2

    # Check second course
    c2 = next(c for c in result if c["name"] == "Course 2")
    assert c2["teacher"]["id"] == teacher_user.id
    assert len(c2["students"]) == 1


def test_course_schema_excludes_password_fields(db, course_with_students):
    """
    GIVEN a course with teacher and students
    WHEN serialized with CourseSchema
    THEN no password fields should be exposed in nested objects
    """
    schema = CourseSchema()
    course = Course.get_by_id_with_relations(course_with_students.id)
    result = schema.dump(course)

    # Check teacher doesn't expose password
    assert "hash_pass" not in result["teacher"]
    assert "password" not in result["teacher"]

    # Check students don't expose passwords
    for student in result["students"]:
        assert "hash_pass" not in student
        assert "password" not in student
