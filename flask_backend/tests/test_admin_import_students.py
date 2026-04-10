"""
Tests for admin import students functionality
"""

import pytest
from werkzeug.security import check_password_hash, generate_password_hash

from api.models import User


@pytest.fixture
def auth_headers_admin(test_client, db):
    """Create an admin user and return auth headers"""
    admin = User(
        name="Test Admin",
        email="testadmin@example.com",
        hash_pass=generate_password_hash("password123"),
        role="admin",
    )
    User.create_user(admin)

    response = test_client.post(
        "/auth/login",
        json={"email": "testadmin@example.com", "password": "password123"},
    )
    return {}


@pytest.fixture
def auth_headers_teacher(test_client, db):
    """Create a teacher user and return auth headers"""
    teacher = User(
        name="Test Teacher",
        email="testteacher@example.com",
        hash_pass=generate_password_hash("password123"),
        role="teacher",
    )
    User.create_user(teacher)

    response = test_client.post(
        "/auth/login",
        json={"email": "testteacher@example.com", "password": "password123"},
    )
    return {}


class TestAdminImportStudents:
    """Test admin import students functionality"""

    def test_import_new_students(self, test_client, auth_headers_admin):
        """Test importing new students via CSV"""
        csv_data = """id,name,email
40011222,Emma Stone,emma@university.edu
40011223,Frank Wilson,frank@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["created_count"] == 2
        assert data["existing_count"] == 0
        assert "new_students" in data
        assert len(data["new_students"]) == 2

        # Verify students were created
        emma = User.get_by_student_id("40011222")
        assert emma is not None
        assert emma.name == "Emma Stone"
        assert emma.email == "emma@university.edu"
        assert emma.role == "student"
        assert emma.must_change_password is True

        frank = User.get_by_student_id("40011223")
        assert frank is not None
        assert frank.email == "frank@university.edu"

        # Verify temporary passwords are unique
        temp_passwords = [s["temp_password"] for s in data["new_students"]]
        assert len(set(temp_passwords)) == 2  # All unique
        assert all(len(p) == 10 for p in temp_passwords)

    def test_import_with_existing_students(self, test_client, auth_headers_admin, db):
        """Test that existing students are tracked but not recreated"""
        # Create a student manually
        existing = User(
            name="Grace Harper",
            email="grace@university.edu",
            hash_pass=generate_password_hash("password"),
            role="student",
            student_id="40011224",
            must_change_password=False,
        )
        User.create_user(existing)

        csv_data = """id,name,email
40011224,Grace Harper,grace@university.edu
40011225,Henry Lee,henry@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["created_count"] == 1
        assert data["existing_count"] == 1
        assert len(data["new_students"]) == 1
        assert "existing_students" in data

        # Verify only new student has temporary password
        temp_passwords = [s["temp_password"] for s in data["new_students"]]
        assert len(temp_passwords) == 1

    def test_import_requires_admin(self, test_client, auth_headers_teacher):
        """Test that only admins can import students"""
        csv_data = """id,name,email
40011226,Iris Anderson,iris@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_teacher,
        )

        assert response.status_code == 403  # Forbidden (authenticated but not authorized)

    def test_import_unauthorized_without_login(self, test_client):
        """Test that unauthenticated users cannot import"""
        csv_data = """id,name,email
40011227,Jack Mitchell,jack@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
        )

        assert response.status_code == 401

    def test_invalid_csv_format(self, test_client, auth_headers_admin):
        """Test that invalid CSV format returns error"""
        # Missing required header 'id'
        csv_data = """name,email
John Doe,john@example.com"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "Invalid headers" in response.get_json()["msg"]

    def test_invalid_email_format(self, test_client, auth_headers_admin):
        """Test that invalid email format returns error"""
        csv_data = """id,name,email
40011228,Invalid Email,not-an-email"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "Invalid email format" in response.get_json()["msg"]

    def test_duplicate_student_ids_in_csv(self, test_client, auth_headers_admin):
        """Test that duplicate student IDs in CSV returns error"""
        csv_data = """id,name,email
40011229,Kevin Brown,kevin@university.edu
40011229,Laura Davis,laura@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "Duplicate student IDs" in response.get_json()["msg"]

    def test_same_email_different_student_id(self, test_client, auth_headers_admin, db):
        """Test that same email with different student ID returns error"""
        # Create first student
        csv_data_1 = """id,name,email
40011230,Mike Olson,mike@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data_1},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200

        # Try to import same email with different ID
        csv_data_2 = """id,name,email
40011231,Mike Olson,mike@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data_2},
            headers=auth_headers_admin,
        )
        assert response.status_code == 400
        assert "already registered with student ID" in response.get_json()["msg"]

    def test_empty_csv(self, test_client, auth_headers_admin):
        """Test that empty CSV returns error"""
        response = test_client.post(
            "/admin/import_students",
            json={"students": ""},
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "required" in response.get_json()["msg"]

    def test_missing_json_body(self, test_client, auth_headers_admin):
        """Test that missing students field in JSON returns error"""
        response = test_client.post(
            "/admin/import_students",
            json={},  # Empty JSON object, missing "students" field
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "required" in response.get_json()["msg"]

    def test_students_not_enrolled_in_any_course(self, test_client, auth_headers_admin):
        """Test that imported students are NOT enrolled in any course"""
        from api.models import User_Course

        csv_data = """id,name,email
40011232,Nancy Quinn,nancy@university.edu"""

        response = test_client.post(
            "/admin/import_students",
            json={"students": csv_data},
            headers=auth_headers_admin,
        )

        assert response.status_code == 200

        nancy = User.get_by_student_id("40011232")
        assert nancy is not None

        # Nancy should not be enrolled in any course
        all_enrollments = User_Course.query.filter_by(userID=nancy.id).all()
        assert len(all_enrollments) == 0
