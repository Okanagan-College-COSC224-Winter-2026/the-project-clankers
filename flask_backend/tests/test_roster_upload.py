"""
Tests for roster upload functionality (US16)
"""

import pytest
from werkzeug.security import check_password_hash, generate_password_hash

from api.models import Course, User, User_Course


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
    # HTTPOnly cookies are automatically handled by test_client
    return {}  # No need for Authorization header with cookies


@pytest.fixture
def auth_headers_student(test_client, db):
    """Create a student user and return auth headers"""
    student = User(
        name="Test Student",
        email="teststudent@example.com",
        hash_pass=generate_password_hash("password123"),
        role="student",
    )
    User.create_user(student)

    response = test_client.post(
        "/auth/login",
        json={"email": "teststudent@example.com", "password": "password123"},
    )
    return {}


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


class TestRosterUpload:
    """Test roster upload and student enrollment"""

    def test_enroll_students_with_new_student(self, test_client, auth_headers_teacher):
        """Test enrolling new students via CSV roster"""
        # Create a class first
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Roster Class"},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 201
        class_id = response.get_json()["class"]["id"]

        # CSV with new students
        csv_data = """id,name,email
300111222,Alice Johnson,alice@university.edu
300111223,Bob Wilson,bob@university.edu"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["enrolled_count"] == 2
        assert data["created_count"] == 2
        assert "new_students" in data
        assert len(data["new_students"]) == 2

        # Verify students were created with correct attributes
        alice = User.get_by_student_id("300111222")
        assert alice is not None
        assert alice.name == "Alice Johnson"
        assert alice.email == "alice@university.edu"
        assert alice.role == "student"
        assert alice.must_change_password is True
        assert alice.student_id == "300111222"

        bob = User.get_by_student_id("300111223")
        assert bob is not None
        assert bob.student_id == "300111223"

        # Verify they're enrolled in the course
        enrollment_alice = User_Course.get(alice.id, class_id)
        enrollment_bob = User_Course.get(bob.id, class_id)
        assert enrollment_alice is not None
        assert enrollment_bob is not None

        # Verify temporary passwords are returned and unique
        temp_passwords = [s["temp_password"] for s in data["new_students"]]
        assert len(temp_passwords) == 2
        assert temp_passwords[0] != temp_passwords[1]
        assert len(temp_passwords[0]) == 10  # Default length
        assert len(temp_passwords[1]) == 10

    def test_enroll_existing_student_to_new_course(self, test_client, auth_headers_teacher):
        """Test that existing students can be added to a new course without recreating"""
        # Create first class and enroll student
        response = test_client.post(
            "/class/create_class",
            json={"name": "Class A"},
            headers=auth_headers_teacher,
        )
        class_a_id = response.get_json()["class"]["id"]

        csv_data = """id,name,email
300111224,Charlie Brown,charlie@university.edu"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_a_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 200
        assert response.get_json()["created_count"] == 1

        # Create second class and enroll same student
        response = test_client.post(
            "/class/create_class",
            json={"name": "Class B"},
            headers=auth_headers_teacher,
        )
        class_b_id = response.get_json()["class"]["id"]

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_b_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["enrolled_count"] == 1
        assert data["created_count"] == 0  # Student already exists
        assert "new_students" not in data  # No new students created

        # Verify student exists only once in DB
        charlie = User.get_by_student_id("300111224")
        assert charlie is not None

        # Verify student is enrolled in both courses
        enrollment_a = User_Course.get(charlie.id, class_a_id)
        enrollment_b = User_Course.get(charlie.id, class_b_id)
        assert enrollment_a is not None
        assert enrollment_b is not None

    def test_duplicate_enrollment_skipped(self, test_client, auth_headers_teacher):
        """Test that duplicate enrollment is skipped"""
        # Create class and enroll student
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        csv_data = """id,name,email
300111225,Dave Davis,dave@university.edu"""

        # First enrollment
        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 200
        assert response.get_json()["enrolled_count"] == 1

        # Attempt duplicate enrollment
        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["enrolled_count"] == 0  # Already enrolled, skipped
        assert data["created_count"] == 0  # Already exists

    def test_invalid_csv_format(self, test_client, auth_headers_teacher):
        """Test that invalid CSV format returns error"""
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        # Missing required header 'id'
        csv_data = """name,email
John Doe,john@example.com"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 400
        assert "Missing required headers" in response.get_json()["msg"]

    def test_invalid_email_format(self, test_client, auth_headers_teacher):
        """Test that invalid email format returns error"""
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        csv_data = """id,name,email
300111226,Invalid Email,not-an-email"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 400
        assert "Invalid email format" in response.get_json()["msg"]

    def test_unauthorized_enrollment(self, test_client, auth_headers_student):
        """Test that students cannot enroll other students"""
        # Try to enroll as student (should fail with @jwt_teacher_required)
        csv_data = """id,name,email
300111227,Test Student,test@example.com"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": 1, "students": csv_data},
            headers=auth_headers_student,
        )
        assert response.status_code == 403

    def test_teacher_cannot_enroll_to_other_teacher_class(
        self, test_client, auth_headers_teacher, db
    ):
        """Test that teachers can only enroll students to their own classes"""
        # Create class as first teacher
        response = test_client.post(
            "/class/create_class",
            json={"name": "Teacher's Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        # Create a second teacher and log in
        teacher2 = User(
            name="Second Teacher",
            email="teacher2@example.com",
            hash_pass=generate_password_hash("password123"),
            role="teacher",
        )
        User.create_user(teacher2)
        
        test_client.post(
            "/auth/login",
            json={"email": "teacher2@example.com", "password": "password123"},
        )

        # Try to enroll as second teacher to first teacher's class
        csv_data = """id,name,email
300111228,Test Student,test2@example.com"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
        )
        assert response.status_code == 403
        assert "not authorized" in response.get_json()["msg"]

    def test_student_can_login_with_temporary_password(self, test_client, auth_headers_teacher):
        """Test that students can log in with their temporary password"""
        # Create class and enroll student
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        csv_data = """id,name,email
300111229,Emma Watson,emma@university.edu"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 200

        # Get the temporary password from response
        temp_password = response.get_json()["new_students"][0]["temp_password"]

        # Try to log in with temporary password
        response = test_client.post(
            "/auth/login",
            json={"email": "emma@university.edu", "password": temp_password},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["role"] == "student"
        assert data["name"] == "Emma Watson"

        # Verify must_change_password flag is set
        emma = User.get_by_email("emma@university.edu")
        assert emma.must_change_password is True

    def test_duplicate_student_ids_in_csv(self, test_client, auth_headers_teacher):
        """Test that duplicate student IDs in CSV are rejected"""
        # Create a class
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        # CSV with duplicate student IDs
        csv_data = """id,name,email
300111111,Alice Johnson,alice@example.com
300111111,Bob Smith,bob@example.com
300222222,Charlie Brown,charlie@example.com"""

        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 400
        assert "Duplicate student IDs found in CSV" in response.get_json()["msg"]
        assert "300111111" in response.get_json()["msg"]

    def test_conflicting_student_id_and_email(self, test_client, auth_headers_teacher):
        """Test that student ID conflicts are detected"""
        # Create a class
        response = test_client.post(
            "/class/create_class",
            json={"name": "Test Class"},
            headers=auth_headers_teacher,
        )
        class_id = response.get_json()["class"]["id"]

        # Create first student
        csv_data1 = """id,name,email
300111111,Alice Johnson,alice@example.com"""
        
        test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data1},
            headers=auth_headers_teacher,
        )

        # Try to enroll with same student_id but different email
        csv_data2 = """id,name,email
300111111,Bob Smith,bob@example.com"""
        
        response = test_client.post(
            "/class/enroll_students",
            json={"class_id": class_id, "students": csv_data2},
            headers=auth_headers_teacher,
        )
        assert response.status_code == 400
        assert "already assigned to" in response.get_json()["msg"]
