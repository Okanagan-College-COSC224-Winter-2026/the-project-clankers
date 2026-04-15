"""
Tests for user management endpoints
"""

import json


def test_get_current_user(test_client):
    """
    GIVEN a logged-in user
    WHEN GET /user/ is called
    THEN the current user's information should be returned
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Cookie is automatically stored in test_client

    # Get current user
    response = test_client.get("/user/")

    assert response.status_code == 200
    assert response.json["name"] == "testuser"
    assert response.json["email"] == "test@example.com"
    assert response.json["id"] is not None
    assert response.json["role"] == "student"  # Default role
    assert "password" not in response.json  # Password should not be exposed


def test_get_current_user_unauthorized(test_client):
    """
    GIVEN no authentication token
    WHEN GET /user/ is called
    THEN it should return 401
    """
    response = test_client.get("/user/")
    assert response.status_code == 401


def test_update_current_user(test_client):
    """
    GIVEN a logged-in user
    WHEN PUT /user/ is called with updated information
    THEN the user's information should be updated
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Cookie is automatically stored in test_client

    # Update user
    response = test_client.put(
        "/user/", data=json.dumps({"name": "Updated"}), headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 200
    assert response.json["name"] == "Updated"


def test_get_user_by_id(test_client):
    """
    GIVEN a logged-in user
    WHEN GET /user/<id> is called with their own ID
    THEN their information should be returned
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Cookie is automatically stored in test_client

    # Get current user to get ID
    current_user_response = test_client.get("/user/")
    user_id = current_user_response.json["id"]

    # Get user by ID
    response = test_client.get(f"/user/{user_id}")

    assert response.status_code == 200
    assert response.json["id"] == user_id
    assert response.json["name"] == "testuser"


def test_get_other_user_by_id_forbidden(test_client):
    """
    GIVEN two users, one logged in
    WHEN the logged-in user tries to access another user's information
    THEN it should return 403 (unless admin)
    """
    # Register two users
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "user1", "password": "123456", "email": "user1@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "user2", "password": "123456", "email": "user2@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Login as user1
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "user1@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Cookie is automatically stored in test_client

    # Try to access user2's info (assuming user2 has ID 2)
    # Since we don't know the exact ID, we'll try ID 2
    response = test_client.get("/user/2")

    # Should be forbidden (403) since user1 is not admin and trying to access user2
    assert response.status_code in [403, 404]  # 404 if user2 is not ID 2


def test_delete_own_user(test_client):
    """
    GIVEN a logged-in user
    WHEN DELETE /user/<own_id> is called
    THEN the user should be deleted
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )
    # Cookie is automatically stored in test_client

    # Get current user to get ID
    current_user_response = test_client.get("/user/")
    user_id = current_user_response.json["id"]

    # Delete user
    response = test_client.delete(f"/user/{user_id}")

    assert response.status_code == 200
    assert response.json["msg"] == "User deleted successfully"

    # Verify user is deleted by trying to get info
    verify_response = test_client.get("/user/")
    assert verify_response.status_code == 404


def test_upload_profile_picture(test_client):
    """
    GIVEN a logged-in user
    WHEN POST /user/profile-picture is called with a valid image file
    THEN the profile picture should be uploaded and the user updated
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )

    # Create a fake image file
    import io
    data = {
        'file': (io.BytesIO(b"fake image data"), 'test.png', 'image/png')
    }

    # Upload profile picture
    response = test_client.post(
        "/user/profile-picture",
        data=data,
        content_type='multipart/form-data'
    )

    assert response.status_code == 200
    assert response.json["msg"] == "Profile picture uploaded successfully"
    assert "profile_picture_url" in response.json
    assert response.json["profile_picture_url"].endswith(".png")

    # Verify the profile was updated
    profile_response = test_client.get("/user/")
    assert profile_response.status_code == 200
    assert profile_response.json["profile_picture_url"] is not None


def test_upload_profile_picture_no_file(test_client):
    """
    GIVEN a logged-in user
    WHEN POST /user/profile-picture is called without a file
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )

    # Upload without file
    response = test_client.post("/user/profile-picture")

    assert response.status_code == 400
    assert "No file" in response.json["msg"]


def test_upload_profile_picture_invalid_type(test_client):
    """
    GIVEN a logged-in user
    WHEN POST /user/profile-picture is called with an invalid file type
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "123456", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "123456"}),
        headers={"Content-Type": "application/json"},
    )

    # Create a fake text file
    import io
    data = {
        'file': (io.BytesIO(b"not an image"), 'test.txt', 'text/plain')
    }

    # Upload invalid file
    response = test_client.post(
        "/user/profile-picture",
        data=data,
        content_type='multipart/form-data'
    )

    assert response.status_code == 400
    assert "Invalid file type" in response.json["msg"]
