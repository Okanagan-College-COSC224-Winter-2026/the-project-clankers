"""
Tests for assignments endpoints
"""

import json
import datetime

def test_teacher_can_create_assignment(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they create a new assignment via POST /assignment
    THEN the assignment should be created successfully
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="admin@example.com", password="admin", name="adminuser")

    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "History 101"}),
        headers={"Content-Type": "application/json"},
    )

    class_id = class_response.json["class"]["id"]

    # Now, create the assignment
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {"courseID": class_id, "name": "Essay 1", "rubric": "Quality of writing", "due_date": datetime.datetime(2025, 12, 31, 23, 59, 59).isoformat()}
        ),
        headers={"Content-Type": "application/json"},
    )
    
    assert assignment_response.status_code == 201
    assert assignment_response.json["msg"] == "Assignment created"
    assert assignment_response.json["assignment"]["name"] == "Essay 1"
    assert assignment_response.json["assignment"]["rubric_text"] == "Quality of writing"
    assert assignment_response.json["assignment"]["due_date"] == "2025-12-31T23:59:59"


def test_create_assignment_missing_fields(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to create an assignment with missing fields
    THEN the API should return a 400 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="admin@example.com", password="admin", name="adminuser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "admin"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to create an assignment without a class_id
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({"name": "Essay 1", "rubric": "Quality of writing"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json["msg"] == "Course ID is required"

    # Attempt to create an assignment without a name
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({"courseID": 1, "rubric": "Quality of writing"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json["msg"] == "Assignment name is required"

def test_non_assigned_teacher_cannot_create_assignment(test_client, make_admin):
    """
    GIVEN a teacher user who is not assigned to the class
    WHEN they try to create an assignment for that class
    THEN the API should return a 403 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    make_admin(email="otherteacher@example.com", password="otherteacher", name="otherteacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Create a class with a different teacher
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Log in as the other teacher
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "otherteacher@example.com", "password": "otherteacher"}),
        headers={"Content-Type": "application/json"},
    )

    # Attempt to create an assignment for the class
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {"courseID": class_id, "name": "Homework 1", "rubric": "Accuracy"}
        ),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403
    assert response.json["msg"] == "Unauthorized: You are not the teacher of this class"
def test_nonexistent_class_cannot_create_assignment(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to create an assignment for a non-existent class
    THEN the API should return a 404 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to create an assignment for a non-existent class
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {"courseID": 999, "name": "Homework 1", "rubric": "Accuracy"}
        ),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 404
    assert response.json["msg"] == "Class not found"

def test_unauthenticated_user_cannot_create_assignment(test_client):
    """
    GIVEN an unauthenticated user
    WHEN they try to create an assignment
    THEN the API should return a 401 error
    """
    # Attempt to create an assignment without logging in
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {"class_id": 1, "name": "Homework 1", "rubric": "Accuracy"}
        ),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 401

# Test cases for editing and deleting assignments
def test_teacher_can_edit_assignment_before_due_date(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they edit an assignment before its due date
    THEN the assignment should be updated successfully
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Science 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment with a future due date
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Lab Report 1",
                "rubric": "Completeness",
                "due_date": datetime.datetime(2025, 12, 31, 23, 59, 59).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    # Now, edit the assignment
    edit_response = test_client.patch(
        f"/assignment/edit_assignment/{assignment_id}",
        data=json.dumps(
            {
                "name": "Updated Lab Report 1",
                "rubric": "Thoroughness",
                "due_date": datetime.datetime(2025, 11, 30, 23, 59, 59).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 200
    assert edit_response.json["msg"] == "Assignment updated"
    assert edit_response.json["assignment"]["name"] == "Updated Lab Report 1"
    assert edit_response.json["assignment"]["rubric_text"] == "Thoroughness"
    assert edit_response.json["assignment"]["due_date"] == "2025-11-30T23:59:59"

def test_teacher_cannot_edit_assignment_after_due_date(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to edit an assignment after its due date
    THEN the API should return a 400 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Art 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment with a past due date
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Painting 1",
                "rubric": "Creativity",
                "due_date": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    # Now, attempt to edit the assignment
    edit_response = test_client.patch(
        f"/assignment/edit_assignment/{assignment_id}",
        data=json.dumps(
            {
                "name": "Updated Painting 1",
                "rubric": "Originality",
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 400
    assert edit_response.json["msg"] == "Assignment cannot be modified after its due date"

def test_non_assigned_teacher_cannot_edit_assignment(test_client, make_admin):
    """
    GIVEN a teacher user who is not assigned to the class
    WHEN they try to edit an assignment for that class
    THEN the API should return a 403 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    make_admin(email="otherteacher@example.com", password="teacher", name="otherteacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Music 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Composition 1",
                "rubric": "Harmony",
                "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    # Log in as the other teacher
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "otherteacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Now, attempt to edit the assignment
    edit_response = test_client.patch(
        f"/assignment/edit_assignment/{assignment_id}",
        data=json.dumps(
            {
                "name": "Updated Composition 1",
                "rubric": "Melody",
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 403
    assert edit_response.json["msg"] == "Unauthorized: You are not the teacher of this class"

def test_unauthenticated_user_cannot_edit_assignment(test_client):
    """
    GIVEN an unauthenticated user
    WHEN they try to edit an assignment
    THEN the API should return a 401 error
    """
    # Attempt to edit an assignment without logging in
    edit_response = test_client.patch(
        "/assignment/edit_assignment/1",
        data=json.dumps(
            {
                "name": "Updated Assignment",
                "rubric": "New Rubric",
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 401

def test_edit_nonexistent_assignment(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to edit a non-existent assignment
    THEN the API should return a 404 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to edit a non-existent assignment
    edit_response = test_client.patch(
        "/assignment/edit_assignment/999",
        data=json.dumps(
            {
                "name": "Updated Assignment",
                "rubric": "New Rubric",
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 404
    assert edit_response.json["msg"] == "Assignment not found"

def test_delete_assignment(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they delete an assignment before its due date
    THEN the assignment should be deleted successfully
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Philosophy 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment with a future due date
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Essay on Ethics",
                "rubric": "Argumentation",
                "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    # Now, delete the assignment
    delete_response = test_client.delete(
        f"/assignment/delete_assignment/{assignment_id}",
        headers={"Content-Type": "application/json"},
    )
    assert delete_response.status_code == 200
    assert delete_response.json["msg"] == "Assignment deleted"

def test_delete_assignment_after_due_date(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to delete an assignment after its due date
    THEN the API should return a 400 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Economics 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment with a past due date
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Market Analysis",
                "rubric": "Data Interpretation",
                "due_date": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    # Now, attempt to delete the assignment
    delete_response = test_client.delete(
        f"/assignment/delete_assignment/{assignment_id}",
        headers={"Content-Type": "application/json"},
    )
    assert delete_response.status_code == 400
    assert delete_response.json["msg"] == "Assignment cannot be deleted after its due date"

def test_non_assigned_teacher_cannot_delete_assignment(test_client, make_admin):
    """
    GIVEN a teacher user who is not assigned to the class
    WHEN they try to delete an assignment for that class
    THEN the API should return a 403 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    make_admin(email="otherteacher@example.com", password="teacher", name="otherteacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "otherteacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignment to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Geography 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create the assignment as the first teacher
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps(
            {
                "courseID": class_id,
                "name": "Geography Assignment",
                "rubric": "Map Skills",
                "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]

    # Now, attempt to delete the assignment as the other teacher
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )

    delete_response = test_client.delete(
        f"/assignment/delete_assignment/{assignment_id}",
        headers={"Content-Type": "application/json"},
    )
    assert delete_response.status_code == 403
    assert delete_response.json["msg"] == "Unauthorized: You are not the teacher of this class"

def test_unauthenticated_user_cannot_delete_assignment(test_client):
    """
    GIVEN an unauthenticated user
    WHEN they try to delete an assignment
    THEN the API should return a 401 error
    """
    # Attempt to delete an assignment without logging in
    delete_response = test_client.delete(
        "/assignment/delete_assignment/1",
        headers={"Content-Type": "application/json"},
    )
    assert delete_response.status_code == 401

def test_delete_nonexistent_assignment(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to delete a non-existent assignment
    THEN the API should return a 404 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to delete a non-existent assignment
    delete_response = test_client.delete(
        "/assignment/delete_assignment/999",
        headers={"Content-Type": "application/json"},
    )
    assert delete_response.status_code == 404
    assert delete_response.json["msg"] == "Assignment not found"

def test_get_assignments_by_class_id(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they request assignments for a specific class
    THEN the API should return the list of assignments for that class
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class to assign the assignments to
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Literature 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, create multiple assignments for the class
    assignment_names = ["Poetry Analysis", "Novel Review", "Drama Essay"]
    for name in assignment_names:
        test_client.post(
            "/assignment/create_assignment",
            data=json.dumps(
                {
                    "courseID": class_id,
                    "name": name,
                    "rubric": "Content Quality",
                    "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=10)).isoformat(),
                }
            ),
            headers={"Content-Type": "application/json"},
        )
    # Now, retrieve assignments for the class
    assignments = test_client.get(f"/assignment/{class_id}")
    assert assignments.status_code == 200
    assert len(assignments.json) == 3
    returned_names = [assignment["name"] for assignment in assignments.json]
    for name in assignment_names:
        assert name in returned_names

def test_get_assignments_by_class_id_no_assignments(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they request assignments for a class with no assignments
    THEN the API should return an empty list
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # First, create a class with no assignments
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Philosophy 102"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    # Now, retrieve assignments for the class
    assignments = test_client.get(f"/assignment/{class_id}")
    assert assignments.status_code == 200
    assert len(assignments.json) == 0

def test_get_assignments_by_class_id_nonexistent_class(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they request assignments for a non-existent class
    THEN the API should return a 404 error
    """
    # Use make_admin fixture to create a teacher user
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    # Create a teacher user and log in
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    # Attempt to retrieve assignments for a non-existent class
    assignments = test_client.get(f"/assignment/999")
    assert assignments.status_code == 404
    assert assignments.json["msg"] == "Class not found"

def test_unauthenticated_user_cannot_get_assignments(test_client):
    """
    GIVEN an unauthenticated user
    WHEN they try to get assignments for a class
    THEN the API should return a 401 error
    """
    # Attempt to retrieve assignments for a class without logging in
    assignments = test_client.get(f"/assignment/1")
    assert assignments.status_code == 401


# Test cases for get_assignment_details endpoint
def test_teacher_can_get_assignment_details(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they request detailed information for an assignment they created
    THEN the API should return assignment details including peer review settings
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    # Create a class and assignment
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Physics 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Lab Report",
            "rubric": "Scientific method",
            "due_date": datetime.datetime(2025, 12, 31, 23, 59, 59).isoformat()
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Get assignment details
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    
    assert details_response.status_code == 200
    details = details_response.json
    assert details["id"] == assignment_id
    assert details["name"] == "Lab Report"
    assert details["rubric_text"] == "Scientific method"
    assert "rubrics" in details
    assert "review_count" in details
    assert "group_count" in details


def test_student_can_get_assignment_details_if_enrolled(test_client, make_admin, enroll_user_in_course):
    """
    GIVEN a student user enrolled in a class
    WHEN they request details for an assignment in that class
    THEN the API should return assignment details (without teacher-only fields)
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    
    # Create student user directly
    from api.models import User
    from werkzeug.security import generate_password_hash
    student = User(
        name="studentuser",
        email="student@example.com",
        hash_pass=generate_password_hash("student"),
        role="student"
    )
    from api.models.db import db
    db.session.add(student)
    db.session.commit()
    
    # Teacher creates class and assignment
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Chemistry 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Enroll student
    enroll_user_in_course(student.id, class_id)
    
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Experiment 1",
            "rubric": "Lab technique"
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Student logs in and gets assignment details
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "student"}),
        headers={"Content-Type": "application/json"},
    )
    
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    
    assert details_response.status_code == 200
    details = details_response.json
    assert details["id"] == assignment_id
    assert details["name"] == "Experiment 1"
    assert "rubrics" in details


def test_unenrolled_student_cannot_get_assignment_details(test_client, make_admin):
    """
    GIVEN a student user NOT enrolled in a class
    WHEN they request details for an assignment in that class
    THEN the API should return a 403 error
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    
    # Create student user directly
    from api.models import User
    from werkzeug.security import generate_password_hash
    student = User(
        name="studentuser",
        email="student@example.com",
        hash_pass=generate_password_hash("student"),
        role="student"
    )
    from api.models.db import db
    db.session.add(student)
    db.session.commit()
    
    # Teacher creates class and assignment
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Biology 101"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Essay 1",
            "rubric": "Analysis"
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Student logs in (but is NOT enrolled)
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "student@example.com", "password": "student"}),
        headers={"Content-Type": "application/json"},
    )
    
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    
    assert details_response.status_code == 403
    assert details_response.json["msg"] == "Unauthorized: You do not have access to this assignment"


def test_get_nonexistent_assignment_details(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they request details for a non-existent assignment
    THEN the API should return a 404 error
    """
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    details_response = test_client.get("/assignment/details/999")
    
    assert details_response.status_code == 404
    assert details_response.json["msg"] == "Assignment not found"


def test_unauthenticated_user_cannot_get_assignment_details(test_client):
    """
    GIVEN an unauthenticated user
    WHEN they request assignment details
    THEN the API should return a 401 error
    """
    details_response = test_client.get("/assignment/details/1")
    assert details_response.status_code == 401
