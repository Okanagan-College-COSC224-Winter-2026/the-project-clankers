import json
import pytest
from werkzeug.security import generate_password_hash, check_password_hash

from api.models import User, Course
from api.models.db import db


@pytest.fixture
def make_student(db):
    """Fixture to create a student user."""
    def _make_student(email="student@example.com", password="Student123!", name="Test Student", student_id=None):
        user = User(
            name=name,
            email=email,
            hash_pass=generate_password_hash(password),
            role="student",
            student_id=student_id
        )
        db.session.add(user)
        db.session.commit()
        return user
    return _make_student


@pytest.fixture
def make_teacher(db):
    """Fixture to create a teacher user."""
    def _make_teacher(email="teacher@example.com", password="Teacher123!", name="Test Teacher"):
        user = User(
            name=name,
            email=email,
            hash_pass=generate_password_hash(password),
            role="teacher"
        )
        db.session.add(user)
        db.session.commit()
        return user
    return _make_teacher


@pytest.fixture
def make_course(db):
    """Fixture to create a course."""
    def _make_course(teacher_id, name="Test Course", is_archived=False):
        course = Course(
            name=name,
            teacherID=teacher_id
        )
        course.is_archived = is_archived
        db.session.add(course)
        db.session.commit()
        return course
    return _make_course


@pytest.fixture
def admin_auth_headers(test_client, make_admin):
    """Fixture to return admin authentication headers."""
    admin = make_admin()
    response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    # The JWT token is in a httponly cookie, so we just need to use the test_client
    # which maintains cookies between requests
    return test_client


@pytest.fixture
def student_auth_headers(test_client, make_student):
    """Fixture to return student authentication headers."""
    student = make_student()
    response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "Student123!"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    return test_client


# ============================================================================
# GET /admin/users - List Users
# ============================================================================

def test_list_users_as_admin(admin_auth_headers, make_student):
    """Test that admin can list all users."""
    make_student(email="student1@example.com", name="Student 1")
    make_student(email="student2@example.com", name="Student 2")

    response = admin_auth_headers.get("/admin/users")

    assert response.status_code == 200
    users = response.json
    assert len(users) >= 2  # At least admin + 2 students


def test_list_users_non_admin(test_client, make_student):
    """Test that non-admin cannot list users."""
    student = make_student()
    response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "Student123!"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200

    response = test_client.get("/admin/users")
    assert response.status_code == 403


def test_list_users_returns_correct_fields(admin_auth_headers, make_student):
    """Test that user list returns all required fields."""
    student = make_student(student_id="12345")

    response = admin_auth_headers.get("/admin/users")
    assert response.status_code == 200

    users = response.json
    student_data = [u for u in users if u["email"] == "student@example.com"][0]

    assert "id" in student_data
    assert "name" in student_data
    assert "email" in student_data
    assert "role" in student_data
    assert student_data["student_id"] == "12345"


# ============================================================================
# POST /admin/users/create - Create User
# ============================================================================

def test_create_student_success(admin_auth_headers):
    """Test creating a student successfully."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "New Student",
            "email": "newstudent@example.com",
            "password": "TempPass123!",
            "role": "student",
            "must_change_password": True
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 201
    assert "student" in response.json["msg"].lower()
    assert response.json["user"]["role"] == "student"
    assert response.json["user"]["must_change_password"] == True


def test_create_teacher_success(admin_auth_headers):
    """Test creating a teacher successfully."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "New Teacher",
            "email": "newteacher@example.com",
            "password": "TempPass123!",
            "role": "teacher",
            "must_change_password": True
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 201
    assert response.json["user"]["role"] == "teacher"


def test_create_admin_success(admin_auth_headers):
    """Test creating an admin successfully."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "New Admin",
            "email": "newadmin@example.com",
            "password": "TempPass123!",
            "role": "admin",
            "must_change_password": False
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 201
    assert response.json["user"]["role"] == "admin"


def test_create_user_missing_name(admin_auth_headers):
    """Test that creating user without name fails."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "email": "test@example.com",
            "password": "TempPass123!",
            "role": "student"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "name" in response.json["msg"].lower()


def test_create_user_missing_email(admin_auth_headers):
    """Test that creating user without email fails."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "Test User",
            "password": "TempPass123!",
            "role": "student"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "email" in response.json["msg"].lower()


def test_create_user_missing_password(admin_auth_headers):
    """Test that creating user without password fails."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "Test User",
            "email": "test@example.com",
            "role": "student"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "password" in response.json["msg"].lower()


def test_create_user_invalid_role(admin_auth_headers):
    """Test that creating user with invalid role fails."""
    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "Test User",
            "email": "test@example.com",
            "password": "TempPass123!",
            "role": "invalid_role"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "invalid role" in response.json["msg"].lower()


def test_create_user_duplicate_email(admin_auth_headers, make_student):
    """Test that duplicate email is rejected."""
    make_student(email="existing@example.com")

    response = admin_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "New User",
            "email": "existing@example.com",
            "password": "TempPass123!",
            "role": "student"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "already registered" in response.json["msg"].lower()


def test_create_user_non_admin(student_auth_headers):
    """Test that non-admin cannot create users."""
    response = student_auth_headers.post(
        "/admin/users/create",
        data=json.dumps({
            "name": "New User",
            "email": "new@example.com",
            "password": "TempPass123!",
            "role": "student"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 403


# ============================================================================
# PUT /admin/users/<id> - Update User
# ============================================================================

def test_update_user_name_success(admin_auth_headers, make_student):
    """Test updating a user's name."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "name": "Updated Name"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["user"]["name"] == "Updated Name"


def test_update_user_email_success(admin_auth_headers, make_student):
    """Test updating a user's email."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "email": "newemail@example.com"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["user"]["email"] == "newemail@example.com"


def test_update_user_role_success(admin_auth_headers, make_student):
    """Test updating a user's role."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "role": "teacher"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["user"]["role"] == "teacher"


def test_update_student_id_success(admin_auth_headers, make_student):
    """Test updating a student's ID."""
    student = make_student(student_id="OLD123")

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "student_id": "NEW456"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["user"]["student_id"] == "NEW456"


def test_update_student_id_duplicate(admin_auth_headers, make_student):
    """Test that duplicate student ID is rejected."""
    student1 = make_student(email="student1@example.com", student_id="12345")
    student2 = make_student(email="student2@example.com", student_id="67890")

    response = admin_auth_headers.put(
        f"/admin/users/{student2.id}",
        data=json.dumps({
            "student_id": "12345"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "already in use" in response.json["msg"].lower()


def test_update_clear_student_id(admin_auth_headers, make_student):
    """Test clearing a student ID."""
    student = make_student(student_id="12345")

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "student_id": ""
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["user"]["student_id"] is None


def test_update_password_success(admin_auth_headers, make_student, db):
    """Test updating a user's password with valid format."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "NewPass123!"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200

    # Verify password was actually updated
    updated_user = db.session.get(User, student.id)
    assert check_password_hash(updated_user.hash_pass, "NewPass123!")


def test_update_password_too_short(admin_auth_headers, make_student):
    """Test that password < 8 chars is rejected."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "Pass1!"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "8 characters" in response.json["msg"]


def test_update_password_missing_uppercase(admin_auth_headers, make_student):
    """Test that password without uppercase is rejected."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "newpass123!"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "uppercase" in response.json["msg"].lower()


def test_update_password_missing_lowercase(admin_auth_headers, make_student):
    """Test that password without lowercase is rejected."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "NEWPASS123!"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "lowercase" in response.json["msg"].lower()


def test_update_password_missing_number(admin_auth_headers, make_student):
    """Test that password without number is rejected."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "NewPass!"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "number" in response.json["msg"].lower()


def test_update_password_missing_special_char(admin_auth_headers, make_student):
    """Test that password without special char is rejected."""
    student = make_student()

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "password": "NewPass123"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "special character" in response.json["msg"].lower()


def test_update_duplicate_email(admin_auth_headers, make_student):
    """Test that duplicate email is rejected."""
    student1 = make_student(email="student1@example.com")
    student2 = make_student(email="student2@example.com")

    response = admin_auth_headers.put(
        f"/admin/users/{student2.id}",
        data=json.dumps({
            "email": "student1@example.com"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "already in use" in response.json["msg"].lower()


def test_prevent_self_demotion_from_admin(test_client, make_admin):
    """Test that admin cannot demote themselves from admin role."""
    admin = make_admin()
    response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200

    response = test_client.put(
        f"/admin/users/{admin.id}",
        data=json.dumps({
            "role": "teacher"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "demote yourself" in response.json["msg"].lower()


def test_update_nonexistent_user(admin_auth_headers):
    """Test that updating non-existent user returns 404."""
    response = admin_auth_headers.put(
        "/admin/users/99999",
        data=json.dumps({
            "name": "New Name"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 404
    assert "not found" in response.json["msg"].lower()


def test_update_user_non_admin(student_auth_headers, make_student):
    """Test that non-admin cannot update users."""
    student = make_student(email="otherstudent@example.com")

    response = student_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "name": "Hacked Name"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 403


def test_update_multiple_fields(admin_auth_headers, make_student):
    """Test updating multiple fields at once."""
    student = make_student(student_id="OLD123")

    response = admin_auth_headers.put(
        f"/admin/users/{student.id}",
        data=json.dumps({
            "name": "Updated Name",
            "email": "updated@example.com",
            "student_id": "NEW456",
            "role": "teacher"
        }),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    user = response.json["user"]
    assert user["name"] == "Updated Name"
    assert user["email"] == "updated@example.com"
    assert user["student_id"] == "NEW456"
    assert user["role"] == "teacher"


# ============================================================================
# DELETE /admin/users/<id> - Delete User
# ============================================================================

def test_delete_user_success(admin_auth_headers, make_student, db):
    """Test deleting a user successfully."""
    student = make_student()
    student_id = student.id

    response = admin_auth_headers.delete(f"/admin/users/{student_id}")

    assert response.status_code == 200
    assert response.json["msg"] == "User deleted successfully"

    # Verify user is deleted
    deleted_user = db.session.get(User, student_id)
    assert deleted_user is None


def test_prevent_self_deletion(test_client, make_admin, db):
    """Test that admin cannot delete themselves."""
    admin = make_admin()
    response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200

    response = test_client.delete(f"/admin/users/{admin.id}")

    assert response.status_code == 400
    assert "cannot delete your own account" in response.json["msg"].lower()


def test_prevent_deletion_of_teacher_with_active_class(admin_auth_headers, make_teacher, make_course):
    """Test that teacher with active class cannot be deleted."""
    teacher = make_teacher()
    course = make_course(teacher.id, is_archived=False)

    response = admin_auth_headers.delete(f"/admin/users/{teacher.id}")

    assert response.status_code == 400
    assert "existing classes" in response.json["msg"].lower()


def test_prevent_deletion_of_teacher_with_archived_class(admin_auth_headers, make_teacher, make_course):
    """Test that teacher with archived class cannot be deleted."""
    teacher = make_teacher()
    course = make_course(teacher.id, is_archived=True)

    response = admin_auth_headers.delete(f"/admin/users/{teacher.id}")

    assert response.status_code == 400
    assert "existing classes" in response.json["msg"].lower()


def test_delete_nonexistent_user(admin_auth_headers):
    """Test that deleting non-existent user returns 404."""
    response = admin_auth_headers.delete("/admin/users/99999")

    assert response.status_code == 404
    assert "not found" in response.json["msg"].lower()


def test_delete_user_non_admin(student_auth_headers, make_student):
    """Test that non-admin cannot delete users."""
    other_student = make_student(email="other@example.com")

    response = student_auth_headers.delete(f"/admin/users/{other_student.id}")

    assert response.status_code == 403


def test_delete_student_success(admin_auth_headers, make_student, db):
    """Test deleting a student successfully."""
    student = make_student()
    student_id = student.id

    response = admin_auth_headers.delete(f"/admin/users/{student_id}")

    assert response.status_code == 200
    deleted_student = db.session.get(User, student_id)
    assert deleted_student is None
