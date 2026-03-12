"""
Tests for classes endpoints
"""

import json


def test_create_classes(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/create_class is called with valid data
    THEN a new class should be created
    """
    # Set the admin user by default into the database
    make_admin(email="admin@example.com", password="admin", name="adminuser")

    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 201
    assert response.json["msg"] == "Class created"
    assert "id" in response.json["class"]


def test_create_class_not_teacher(test_client):
    """
    GIVEN a logged-in non-teacher user
    WHEN POST /class/create_class is called
    THEN the request should be forbidden
    """
    # Register and login as non-teacher
    test_client.post(
        "/auth/register",
        data=json.dumps(
            {"name": "studentuser", "password": "123456", "email": "student@example.com"}
        ),
        headers={"Content-Type": "application/json"},
    )
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to create class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403
    assert response.json["msg"] == "Insufficient permissions"


def test_get_classes(test_client, make_admin):
    """
    GIVEN a logged-in user
    WHEN GET /class/browse_classes is called
    THEN the list of classes should be returned
    """

    # Set the admin user by default into the database
    make_admin(email="admin@example.com", password="admin", name="adminuser")

    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    # Get classes
    response = test_client.get("/class/browse_classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 200
    classes = response.json
    assert any(c["name"] == "Math 101" for c in classes)
    assert len(classes) >= 1

def test_get_classes_not_logged_in(test_client):
    """
    GIVEN a non-logged-in user
    WHEN GET /class/browse_classes is called
    THEN the request should be unauthorized
    """
    response = test_client.get("/class/browse_classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 401

def test_get_courses_for_teacher(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN GET /class/classes is called
    THEN the list of classes taught by the teacher should be returned
    """

    # Set the admin user by default into the database
    make_admin(email="admin@example.com", password="admin", name="adminuser")
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    # Login other user
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "History 201"}),
        headers={"Content-Type": "application/json"},
    )
    # Get classes
    response = test_client.get("/class/classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 200
    classes = response.json
    assert any(c["name"] == "History 201" for c in classes)
    assert len(classes) >= 1

def test_get_courses_for_student(test_client, make_admin, enroll_user_in_course):
    """
    GIVEN a logged-in student user
    WHEN GET /class/classes is called
    THEN the list of classes the student is enrolled in should be returned
    """

    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "History 201"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Register and login as student
    test_client.post(
        "/auth/register",
        data=json.dumps(
            {"name": "studentuser", "password": "123456", "email": "student@example.com"}),
        headers={"Content-Type": "application/json"},
    )
    login_response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    student_id = login_response.json["id"]
    # Enroll student in class
    enrollment = enroll_user_in_course(user_id=student_id, course_id=class_id)
    assert enrollment.userID == student_id and enrollment.courseID == class_id
    # Get classes
    response = test_client.get("/class/classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 200
    classes = response.json
    assert any(c["name"] == "History 201" for c in classes)
    assert len(classes) >= 1

def test_get_courses_for_student_not_enrolled(test_client):
    """
    GIVEN a logged-in student user not enrolled in any classes
    WHEN GET /class/classes is called
    THEN an empty list should be returned
    """
    # Register and login as student
    test_client.post(
        "/auth/register",
        data=json.dumps(
            {"name": "studentuser2", "password": "123456", "email": "student2@example.com"}),
        headers={"Content-Type": "application/json"},
    )
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student2@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Get classes
    response = test_client.get("/class/classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 200
    classes = response.json
    assert classes == []

def test_get_courses_not_logged_in(test_client):
    """
    GIVEN a non-logged-in user
    WHEN GET /class/classes is called
    THEN the request should be unauthorized
    """
    response = test_client.get("/class/classes", headers={"Content-Type": "application/json"})
    assert response.status_code == 401

def test_enroll_in_class(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with valid data
    THEN the teacher should enroll students in the class
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Enroll students
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth,gbizzle@yandex.ru\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    assert response.json["msg"] == "2 students added to course Science 101"

def test_enroll_in_class_not_teacher(test_client):
    """
    GIVEN a logged-in non-teacher user
    WHEN POST /class/enroll_students is called
    THEN the request should be forbidden
    """
    # Register and login as non-teacher
    test_client.post(
        "/auth/register",
        data=json.dumps(
            {"name": "studentuser", "password": "123456", "email": "student@example.com"}),
        headers={"Content-Type": "application/json"},
    )
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to enroll students
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth,gbizzle@yandex.ru\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": 1, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403
    assert response.json["msg"] == "Insufficient permissions"

def test_enroll_in_class_missing_data(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with missing data
    THEN the request should return a 400 error
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to enroll students with missing data
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": 1}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json["msg"] == "Class ID and student roster are required"

def test_enroll_in_class_not_found(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with a non-existent class ID
    THEN the request should return a 404 error
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to enroll students in a non-existent class
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth,gbizzle@yandex.ru\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": 9999, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 404
    assert response.json["msg"] == "Class not found"

def test_enroll_in_class_unauthorized(test_client, make_admin):
    """
    GIVEN a logged-in teacher user who is not the teacher of the class
    WHEN POST /class/enroll_students is called
    THEN the request should return a 403 error
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    make_admin(email="otherteacher@example.com", password="teacher", name="otherteacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "otherteacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class as the first teacher
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Login as other teacher
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "otherteacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to enroll students
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth,gbizzle@yandex.ru\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403
    assert response.json["msg"] == "You are not authorized to enroll students in this class"

def test_enroll_in_class_not_logged_in(test_client):
    """
    GIVEN a non-logged-in user
    WHEN POST /class/enroll_students is called
    THEN the request should be unauthorized
    """
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth,gbizzle@yandex.ru\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": 1, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 401

def test_enroll_in_class_empty_csv(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with an empty CSV
    THEN no students should be enrolled
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Enroll students with empty CSV
    csv_text = ""
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json["msg"] == "Class ID and student roster are required"

def test_enroll_in_class_malformed_csv(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with a malformed CSV
    THEN the request should return a 400 error
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Enroll students with malformed CSV
    csv_text = (
        "id,name,email\n"
        "300325853,Gregory Bigglesworth\n"  # Missing email
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert "Line 2: Missing required fields" in response.json["msg"]

def test_enroll_in_class_existing_student(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with a student already enrolled
    THEN the student should not be enrolled again
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Enroll a student
    csv_text = (
        "id,name,email\n"
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    # Enroll the same student again
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    assert response.json["msg"] == "0 students added to course Science 101"

def test_enroll_in_class_invalid_email_format(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/enroll_students is called with an invalid email format
    THEN the request should return a 400 error
    """
    # Set the admin user by default into the database
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Login as teacher/admin
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]
    # Enroll students with invalid email format
    csv_text = (
        "id,name,email\n"
        "300500123,John Doe,johndoeatexample.com\n"
        "300325853,Gregory Bigglesworth,gbizzle-at-yandex.ru\n"  # Invalid email
        "300325854,Sarah Connor,sconnor@example.com\n"
    )
    response = test_client.post(
        "/class/enroll_students",
        data=json.dumps({"class_id": class_id, "students": csv_text}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json["msg"] == "Invalid email format: johndoeatexample.com"


def test_get_class_details(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN GET /class/<id> is called with valid class ID
    THEN class details should be returned
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    response = test_client.get(
        f"/class/{class_id}",
        headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 200
    assert response.json["id"] == class_id
    assert response.json["name"] == "Math 101"
    assert "teacher" in response.json
    assert response.json["teacher"]["name"] == "teacheruser"
    assert "student_count" in response.json
    assert "assignments_count" in response.json


def test_update_class(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN PUT /class/update_class is called with valid data
    THEN the class should be updated
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    response = test_client.put(
        "/class/update_class",
        data=json.dumps({"id": class_id, "name": "Advanced Math 101"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["msg"] == "Class updated successfully"
    assert response.json["class"]["name"] == "Advanced Math 101"


def test_delete_class(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN DELETE /class/delete_class is called with valid class ID
    THEN the class should be deleted
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    response = test_client.delete(
        "/class/delete_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert "Math 101" in response.json["msg"]
    assert "deleted successfully" in response.json["msg"]

    # Verify class is deleted
    response = test_client.get(f"/class/{class_id}", headers={"Content-Type": "application/json"})
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Archive class tests
# ---------------------------------------------------------------------------


def test_archive_class(test_client, make_admin):
    """
    GIVEN a logged-in teacher user who owns a class
    WHEN PUT /class/archive_class is called with a valid class ID
    THEN the class should be archived and the response should be 200
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "CS 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert "archived successfully" in response.json["msg"]


def test_archive_class_missing_id(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN PUT /class/archive_class is called without a class ID
    THEN the response should be 400 with a descriptive message
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )

    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json["msg"] == "Class ID is required"


def test_archive_class_not_found(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN PUT /class/archive_class is called with a non-existent class ID
    THEN the response should be 404
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )

    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": 99999}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 404


def test_archive_class_not_logged_in(test_client):
    """
    GIVEN a user who is not authenticated
    WHEN PUT /class/archive_class is called
    THEN the response should be 401
    """
    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": 1}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401


def test_archive_class_student_cannot_archive(test_client, make_admin):
    """
    GIVEN a student user
    WHEN PUT /class/archive_class is called
    THEN the response should be 403 (Insufficient permissions)
    """
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    # Create class owner (admin/teacher)
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Bio 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    # Create and login as a student
    student = User(
        name="Student",
        email="student@example.com",
        hash_pass=generate_password_hash("studentpass"),
        role="student",
    )
    _db.session.add(student)
    _db.session.commit()

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "studentpass"}),
        headers={"Content-Type": "application/json"},
    )

    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 403


def test_archive_class_unauthorized_different_teacher(test_client, make_admin):
    """
    GIVEN two teachers where teacher2 does not own the class
    WHEN teacher2 calls PUT /class/archive_class for teacher1's class
    THEN the response should be 403
    """
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    # Teacher1 (admin) creates a class
    make_admin(email="teacher1@example.com", password="teacher", name="teacher1")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher1@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Owner's Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    # Create teacher2 with teacher role (not admin, so cannot bypass ownership check)
    teacher2 = User(
        name="teacher2",
        email="teacher2@example.com",
        hash_pass=generate_password_hash("teacher"),
        role="teacher",
    )
    _db.session.add(teacher2)
    _db.session.commit()

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher2@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )

    response = test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 403


def test_archived_class_hidden_from_teacher_list(test_client):
    """
    GIVEN a teacher who has one active class and one archived class
    WHEN GET /class/classes is called
    THEN only the active class should appear in the response
    """
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    # Use teacher role (not admin) so get_courses_by_teacher is called, which filters archived
    teacher = User(
        name="listteacher",
        email="listteacher@example.com",
        hash_pass=generate_password_hash("teacherpass"),
        role="teacher",
    )
    _db.session.add(teacher)
    _db.session.commit()

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "listteacher@example.com", "password": "teacherpass"}),
        headers={"Content-Type": "application/json"},
    )

    # Create two classes
    test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Active Class"}),
        headers={"Content-Type": "application/json"},
    )
    resp2 = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "To Be Archived"}),
        headers={"Content-Type": "application/json"},
    )
    archived_class_id = resp2.json["class"]["id"]

    # Archive the second class
    test_client.put(
        "/class/archive_class",
        data=json.dumps({"id": archived_class_id}),
        headers={"Content-Type": "application/json"},
    )

    # Fetch teacher's class list
    response = test_client.get("/class/classes", headers={"Content-Type": "application/json"})

    assert response.status_code == 200
    class_names = [c["name"] for c in response.json]
    assert "Active Class" in class_names
    assert "To Be Archived" not in class_names


# ---------------------------------------------------------------------------
# Delete class blocking tests (updated behaviour)
# ---------------------------------------------------------------------------


def test_delete_class_blocked_when_students_enrolled(test_client, enroll_user_in_course):
    """
    GIVEN a non-admin teacher with students enrolled in their class
    WHEN DELETE /class/delete_class is called
    THEN the response should be 400 with a message mentioning enrolled students
    """
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    # Must be a teacher (not admin) so the blocking logic runs
    teacher = User(
        name="teacheruser",
        email="teacher@example.com",
        hash_pass=generate_password_hash("teacher"),
        role="teacher",
    )
    _db.session.add(teacher)
    _db.session.commit()

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Full Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    # Enroll a student directly via the DB fixture
    student = User(
        name="Student",
        email="student@example.com",
        hash_pass=generate_password_hash("pass"),
        role="student",
    )
    _db.session.add(student)
    _db.session.commit()
    enroll_user_in_course(student.id, class_id)

    # Attempt to delete — should be blocked
    response = test_client.delete(
        "/class/delete_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "student" in response.json["msg"].lower()


def test_delete_class_blocked_when_assignments_exist(test_client):
    """
    GIVEN a non-admin teacher with assignments in their class
    WHEN DELETE /class/delete_class is called
    THEN the response should be 400 with a message mentioning assignments
    """
    import datetime
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    # Must be a teacher (not admin) so the blocking logic runs
    teacher = User(
        name="teacheruser",
        email="teacher@example.com",
        hash_pass=generate_password_hash("teacher"),
        role="teacher",
    )
    _db.session.add(teacher)
    _db.session.commit()

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Class With Assignments"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    # Create an assignment in the class
    test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Essay 1",
                "rubric": "Quality of writing",
                "due_date": datetime.datetime(2025, 12, 31, 23, 59, 59).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )

    # Attempt to delete — should be blocked
    response = test_client.delete(
        "/class/delete_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "assignment" in response.json["msg"].lower()


def test_admin_can_delete_class_with_students(test_client, make_admin, enroll_user_in_course):
    """
    GIVEN an admin user who owns a class with enrolled students
    WHEN DELETE /class/delete_class is called
    THEN the admin should be able to delete the class successfully (200)
    """
    from api.models import User
    from api.models.db import db as _db
    from werkzeug.security import generate_password_hash

    make_admin(email="admin@example.com", password="admin", name="adminuser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Admin's Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = response.json["class"]["id"]

    # Enroll a student
    student = User(
        name="Student",
        email="student@example.com",
        hash_pass=generate_password_hash("pass"),
        role="student",
    )
    _db.session.add(student)
    _db.session.commit()
    enroll_user_in_course(student.id, class_id)

    # Admin deletes the class despite enrolled students — should succeed
    response = test_client.delete(
        "/class/delete_class",
        data=json.dumps({"id": class_id}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert "deleted successfully" in response.json["msg"]
