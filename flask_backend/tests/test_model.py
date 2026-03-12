from werkzeug.security import generate_password_hash

from api.models import User, Course


def test_user_basic(dbsession):
    """
    GIVEN a new user object
    WHEN the user is created and added to the database
    THEN the user should have correct default values
    """
    user1 = User(
        name="testuser", hash_pass=generate_password_hash("123456"), email="test@example.com"
    )
    dbsession.add(user1)
    dbsession.flush()

    assert user1.id is not None
    assert user1.name == "testuser"
    assert user1.role == "student"  # Default role is student


def test_user_roles(dbsession):
    """
    GIVEN users with different roles
    WHEN role checks are performed
    THEN the correct role permissions should be returned
    """
    teacher_user = User(
        name="teacher",
        hash_pass=generate_password_hash("admin123"),
        email="teacher@example.com",
        role="teacher",
    )

    admin_user = User(
        name="admin",
        hash_pass=generate_password_hash("admin123"),
        email="admin@example.com",
        role="admin",
    )

    regular_user = User(
        name="regular",
        hash_pass=generate_password_hash("regular123"),
        email="regular@example.com",
        role="student",
    )

    dbsession.add(teacher_user)
    dbsession.add(admin_user)
    dbsession.add(regular_user)
    dbsession.flush()

    # Test role checking methods
    assert teacher_user.is_teacher() is True
    assert teacher_user.is_admin() is False
    assert teacher_user.is_student() is False

    assert admin_user.is_admin() is True
    assert admin_user.is_teacher() is False
    assert admin_user.is_student() is False

    assert regular_user.is_student() is True
    assert regular_user.is_teacher() is False
    assert regular_user.is_admin() is False

    # Test has_role method
    assert teacher_user.has_role("teacher", "admin") is True
    assert regular_user.has_role("teacher", "admin") is False

    # Test backward compatibility
    assert teacher_user.is_teacher_user() is True
    assert regular_user.is_teacher_user() is False


def test_user_methods(dbsession):
    """
    GIVEN a user in the database
    WHEN querying by username, ID, or email
    THEN the correct user should be retrieved
    """
    user = User(
        name="methodtest",
        hash_pass=generate_password_hash("123456"),
        email="method@example.com",
        role="student",
    )
    dbsession.add(user)
    dbsession.commit()

    # Test get_by_email
    found_user = User.get_by_email("method@example.com")
    assert found_user is not None
    assert found_user.name == "methodtest"

    # Test get_by_id
    found_user_by_id = User.get_by_id(user.id)
    assert found_user_by_id is not None
    assert found_user_by_id.id == user.id

    # Test get_by_email
    found_user_by_email = User.get_by_email("method@example.com")
    assert found_user_by_email is not None
    assert found_user_by_email.email == "method@example.com"


def test_user_backward_compatibility(dbsession):
    """
    GIVEN a user in the database
    WHEN using legacy method names
    THEN the user should still be retrieved correctly
    """
    user = User(
        name="legacy", hash_pass=generate_password_hash("123456"), email="legacy@example.com"
    )
    dbsession.add(user)
    dbsession.commit()

    # Test old method names still work
    found = User.get_by_email("legacy@example.com")
    assert found is not None
    assert found.email == "legacy@example.com"

    found_by_id = User.get_by_id(user.id)
    assert found_by_id is not None


def test_user_role_validation(dbsession):
    """
    GIVEN an invalid role is provided
    WHEN creating a user with that role
    THEN a ValueError should be raised
    """
    import pytest

    # Test valid roles work
    valid_user = User(
        name="validuser",
        hash_pass=generate_password_hash("123456"),
        email="valid@example.com",
        role="teacher",
    )
    dbsession.add(valid_user)
    dbsession.flush()
    assert valid_user.role == "teacher"

    # Test invalid role raises ValueError
    with pytest.raises(ValueError) as exc_info:
        User(
            name="invaliduser",
            hash_pass=generate_password_hash("123456"),
            email="invalid@example.com",
            role="superuser",
        )

    assert "Invalid role 'superuser'" in str(exc_info.value)
    assert "Must be one of: student, teacher, admin" in str(exc_info.value)

def test_course_is_archived_default_false(dbsession):
    """
    GIVEN a new Course object created without specifying is_archived
    WHEN the course is added to the database
    THEN is_archived should default to False
    """
    teacher = User(
        name="archivedefaultteacher",
        hash_pass=generate_password_hash("pass"),
        email="archivedefault@example.com",
        role="teacher",
    )
    dbsession.add(teacher)
    dbsession.flush()

    course = Course(name="Default Archive Course", teacherID=teacher.id)
    dbsession.add(course)
    dbsession.flush()

    assert course.is_archived is False


def test_course_archive_method(dbsession):
    """
    GIVEN an existing Course in the database
    WHEN course.archive() is called
    THEN is_archived should be set to True and persisted to the database
    """
    teacher = User(
        name="archivemethodteacher",
        hash_pass=generate_password_hash("pass"),
        email="archivemethod@example.com",
        role="teacher",
    )
    dbsession.add(teacher)
    dbsession.flush()

    course = Course(name="Archivable Course", teacherID=teacher.id)
    dbsession.add(course)
    dbsession.commit()

    assert course.is_archived is False

    course.archive()

    # Re-query from DB to confirm persistence
    refreshed = Course.get_by_id(course.id)
    assert refreshed.is_archived is True