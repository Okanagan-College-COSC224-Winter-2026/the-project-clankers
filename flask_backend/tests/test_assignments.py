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
    assert assignment_response.json["assignment"]["due_date"] == "2025-12-31T23:59:59+00:00"


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
                "due_date": datetime.datetime(2027, 12, 31, 23, 59, 59).isoformat(),
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
                "due_date": datetime.datetime(2027, 11, 30, 23, 59, 59).isoformat(),
            }
        ),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 200
    assert edit_response.json["msg"] == "Assignment updated"
    assert edit_response.json["assignment"]["name"] == "Updated Lab Report 1"
    assert edit_response.json["assignment"]["rubric_text"] == "Thoroughness"
    assert edit_response.json["assignment"]["due_date"] == "2027-11-30T23:59:59+00:00"

def test_teacher_can_edit_assignment_after_due_date(test_client, make_admin):
    """
    GIVEN a teacher user
    WHEN they try to edit an assignment after its due date
    THEN the API should allow the edit
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
    assert edit_response.status_code == 200
    assert edit_response.json["assignment"]["name"] == "Updated Painting 1"

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
    THEN the API should allow the deletion
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
    assert delete_response.status_code == 200
    assert delete_response.json["msg"] == "Assignment deleted"

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


# ============================================================================
# US9 & 11 Test Cases: Complete Instructor Workflow & View Peer Review Settings
# ============================================================================

def test_instructor_full_assignment_management_workflow(test_client, make_admin):
    """
    INTEGRATION TEST: Complete instructor workflow
    GIVEN a teacher user
    WHEN they create, view, edit, and delete an assignment
    THEN all operations succeed with proper data persistence
    """
    # Setup: Create teacher and login
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    # Create a class
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Integration Test Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Step 1: CREATE assignment
    create_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Final Project",
            "rubric": "Creativity and execution",
            "due_date": datetime.datetime(2026, 6, 30, 23, 59, 59).isoformat()
        }),
        headers={"Content-Type": "application/json"},
    )
    assert create_response.status_code == 201
    assignment_id = create_response.json["assignment"]["id"]
    
    # Step 2: VIEW assignment details
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    assert details_response.status_code == 200
    details = details_response.json
    assert details["name"] == "Final Project"
    assert details["rubric_text"] == "Creativity and execution"
    assert details["due_date"] == "2026-06-30T23:59:59+00:00"
    assert "rubrics" in details
    assert "review_count" in details
    assert "group_count" in details
    
    # Step 3: EDIT assignment
    edit_response = test_client.patch(
        f"/assignment/edit_assignment/{assignment_id}",
        data=json.dumps({
            "name": "Final Project (Updated)",
            "rubric": "Creativity, execution, and presentation",
            "due_date": datetime.datetime(2026, 7, 15, 23, 59, 59).isoformat()
        }),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 200
    assert edit_response.json["assignment"]["name"] == "Final Project (Updated)"
    
    # Step 4: VERIFY changes persisted
    verify_response = test_client.get(f"/assignment/details/{assignment_id}")
    assert verify_response.status_code == 200
    updated_details = verify_response.json
    assert updated_details["name"] == "Final Project (Updated)"
    assert updated_details["rubric_text"] == "Creativity, execution, and presentation"
    assert updated_details["due_date"] == "2026-07-15T23:59:59+00:00"
    
    # Step 5: DELETE assignment
    delete_response = test_client.delete(f"/assignment/delete_assignment/{assignment_id}")
    assert delete_response.status_code == 200
    assert delete_response.json["msg"] == "Assignment deleted"
    
    # Step 6: VERIFY assignment no longer exists
    final_check = test_client.get(f"/assignment/details/{assignment_id}")
    assert final_check.status_code == 404


def test_assignment_details_includes_rubrics_for_peer_review(test_client, make_admin):
    """
    USER STORY AC #2: View peer review settings
    GIVEN a teacher who created an assignment with rubrics
    WHEN they view assignment details
    THEN peer review settings (rubrics) are included
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Test Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Create assignment
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Peer Review Assignment",
            "rubric": "Peer evaluation criteria"
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Create rubrics for this assignment
    from api.models import Rubric
    from api.models.db import db
    rubric1 = Rubric(assignmentID=assignment_id, canComment=True)
    rubric2 = Rubric(assignmentID=assignment_id, canComment=False)
    db.session.add(rubric1)
    db.session.add(rubric2)
    db.session.commit()
    
    # Get assignment details
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    assert details_response.status_code == 200
    
    details = details_response.json
    assert "rubrics" in details
    assert len(details["rubrics"]) == 2
    
    # Verify rubric data
    rubrics = details["rubrics"]
    assert any(r["canComment"] == True for r in rubrics)
    assert any(r["canComment"] == False for r in rubrics)


def test_edit_assignment_partial_update(test_client, make_admin):
    """
    USER STORY AC #3: Edit assignment
    GIVEN a teacher wants to update only specific fields
    WHEN they edit an assignment with partial data
    THEN only specified fields are updated
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Test Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Create assignment
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Original Name",
            "rubric": "Original Rubric",
            "due_date": datetime.datetime(2026, 12, 31, 23, 59, 59).isoformat()
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Edit only the name
    edit_response = test_client.patch(
        f"/assignment/edit_assignment/{assignment_id}",
        data=json.dumps({"name": "Updated Name Only"}),
        headers={"Content-Type": "application/json"},
    )
    assert edit_response.status_code == 200
    
    # Verify only name changed
    details = test_client.get(f"/assignment/details/{assignment_id}").json
    assert details["name"] == "Updated Name Only"
    assert details["rubric_text"] == "Original Rubric"  # Unchanged
    assert details["due_date"] == "2026-12-31T23:59:59+00:00"  # Unchanged


def test_assignment_list_contains_all_assignments(test_client, make_admin):
    """
    USER STORY AC #1: View all assignments for a class
    GIVEN a class with multiple assignments
    WHEN teacher requests assignment list
    THEN all assignments are returned
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Multi-Assignment Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Create multiple assignments
    assignment_names = ["Assignment 1", "Assignment 2", "Assignment 3"]
    for name in assignment_names:
        test_client.post(
            "/assignment/create_assignment",
            data=json.dumps({
                "courseID": class_id,
                "name": name,
                "rubric": f"Rubric for {name}"
            }),
            headers={"Content-Type": "application/json"},
        )
    
    # Get all assignments
    list_response = test_client.get(f"/assignment/{class_id}")
    assert list_response.status_code == 200
    
    assignments = list_response.json
    assert len(assignments) == 3
    
    # Verify all assignments are present
    returned_names = [a["name"] for a in assignments]
    for name in assignment_names:
        assert name in returned_names


def test_assignment_statistics_for_teacher(test_client, make_admin):
    """
    USER STORY AC #2: View assignment details with statistics
    GIVEN a teacher viewing assignment details
    WHEN the assignment has reviews and groups
    THEN statistics (review_count, group_count) are included
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Stats Test Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Create assignment
    assignment_response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Stats Assignment",
            "rubric": "Test rubric"
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment_id = assignment_response.json["assignment"]["id"]
    
    # Create some test data (groups and reviews)
    from api.models import CourseGroup, Review, User
    from werkzeug.security import generate_password_hash
    from api.models.db import db
    
    # Create students
    student1 = User(name="Student 1", email="student1@test.com", hash_pass=generate_password_hash("pass"), role="student")
    student2 = User(name="Student 2", email="student2@test.com", hash_pass=generate_password_hash("pass"), role="student")
    db.session.add(student1)
    db.session.add(student2)
    db.session.commit()
    
    # Create groups
    group1 = CourseGroup(courseID=class_id, name="Group 1")
    group2 = CourseGroup(courseID=class_id, name="Group 2")
    db.session.add(group1)
    db.session.add(group2)
    db.session.commit()
    
    # Create reviews
    review1 = Review(assignmentID=assignment_id, reviewerID=student1.id, revieweeID=student2.id)
    review2 = Review(assignmentID=assignment_id, reviewerID=student2.id, revieweeID=student1.id)
    db.session.add(review1)
    db.session.add(review2)
    db.session.commit()
    
    # Get assignment details
    details_response = test_client.get(f"/assignment/details/{assignment_id}")
    assert details_response.status_code == 200
    
    details = details_response.json
    assert "review_count" in details
    assert "group_count" in details
    assert details["review_count"] == 2
    assert details["group_count"] == 2


def test_delete_assignment_removes_from_list(test_client, make_admin):
    """
    USER STORY AC #3: Delete assignment
    GIVEN a teacher deletes an assignment
    WHEN they view the assignment list
    THEN the deleted assignment no longer appears
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    class_response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Delete Test Class"}),
        headers={"Content-Type": "application/json"},
    )
    class_id = class_response.json["class"]["id"]
    
    # Create two assignments
    assignment1 = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Keep This",
            "rubric": "Keep"
        }),
        headers={"Content-Type": "application/json"},
    )
    
    assignment2 = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({
            "courseID": class_id,
            "name": "Delete This",
            "rubric": "Delete",
            "due_date": datetime.datetime(2026, 12, 31, 23, 59, 59).isoformat()
        }),
        headers={"Content-Type": "application/json"},
    )
    assignment2_id = assignment2.json["assignment"]["id"]
    
    # Verify both exist
    list_before = test_client.get(f"/assignment/{class_id}").json
    assert len(list_before) == 2
    
    # Delete one assignment
    delete_response = test_client.delete(f"/assignment/delete_assignment/{assignment2_id}")
    assert delete_response.status_code == 200
    
    # Verify only one remains
    list_after = test_client.get(f"/assignment/{class_id}").json
    assert len(list_after) == 1
    assert list_after[0]["name"] == "Keep This"


def test_error_messages_are_clear_and_specific(test_client, make_admin):
    """
    USER STORY AC #4: Clear success/error messages
    GIVEN various error conditions
    WHEN operations fail
    THEN specific, helpful error messages are returned
    """
    # Setup
    make_admin(email="teacher@example.com", password="teacher", name="teacheruser")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "teacher"}),
        headers={"Content-Type": "application/json"},
    )
    
    # Test 1: Missing course ID
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({"name": "Test", "rubric": "Test"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert "Course ID is required" in response.json["msg"]
    
    # Test 2: Missing assignment name
    response = test_client.post(
        "/assignment/create_assignment",
        data=json.dumps({"courseID": 1, "rubric": "Test"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert "Assignment name is required" in response.json["msg"]
    
    # Test 3: Non-existent assignment
    response = test_client.get("/assignment/details/99999")
    assert response.status_code == 404
    assert "Assignment not found" in response.json["msg"]
    
    # Test 4: Edit non-existent assignment
    response = test_client.patch(
        "/assignment/edit_assignment/99999",
        data=json.dumps({"name": "Test"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 404
    assert "Assignment not found" in response.json["msg"]
    
    # Test 5: Delete non-existent assignment
    response = test_client.delete("/assignment/delete_assignment/99999")
    assert response.status_code == 404
    assert "Assignment not found" in response.json["msg"]
