"""
Tests for password change endpoint (US13)
"""

import json
import pytest


def test_change_password_success(test_client):
    """
    GIVEN a logged-in user with correct current password
    WHEN PATCH /user/password is called with valid passwords
    THEN the password should be updated successfully
    """
    # Register user with valid password (must have uppercase, lowercase, digit, special char)
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Oldpass123!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Login
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Oldpass123!"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Oldpass123!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json["msg"] == "Password updated successfully"


def test_change_password_can_login_with_new_password(test_client):
    """
    GIVEN a user has changed their password
    WHEN they try to login with the new password
    THEN they should be able to login successfully
    """
    # Register user with valid password
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Oldpass123!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Login
    login_response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Oldpass123!"}),
        headers={"Content-Type": "application/json"},
    )
    assert login_response.status_code == 200

    # Change password (reuse client with cookie)
    change_response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Oldpass123!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )
    assert change_response.status_code == 200

    # Logout to clear cookie
    test_client.post("/auth/logout")

    # Try to login with new password
    new_login_response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )
    assert new_login_response.status_code == 200
    assert new_login_response.json["name"] == "testuser"


def test_change_password_cannot_login_with_old_password(test_client):
    """
    GIVEN a user has changed their password
    WHEN they try to login with the old password
    THEN login should fail
    """
    # Register user with valid password
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Oldpass123!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Login
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Oldpass123!"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password
    test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Oldpass123!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )

    # Logout to clear cookie
    test_client.post("/auth/logout")

    # Try to login with old password
    old_login_response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Oldpass123!"}),
        headers={"Content-Type": "application/json"},
    )
    assert old_login_response.status_code == 401
    assert old_login_response.json["msg"] == "Bad email or password"


def test_change_password_incorrect_current_password(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called with incorrect current password
    THEN it should return 401 and password should not change
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Correctpass1!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Correctpass1!"}),
        headers={"Content-Type": "application/json"},
    )

    # Try to change password with wrong current password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Wrongpass1!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401
    assert response.json["msg"] == "Current password is incorrect"

    # Logout and verify old password still works
    test_client.post("/auth/logout")
    login_response = test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Correctpass1!"}),
        headers={"Content-Type": "application/json"},
    )
    assert login_response.status_code == 200


def test_change_password_missing_current_password(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called without current_password
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "testpass", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "testpass"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password without current_password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"new_password": "newpass123"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json["msg"] == "Current password is required"


def test_change_password_missing_new_password(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called without new_password
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "testpass", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "testpass"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password without new_password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "testpass"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json["msg"] == "New password is required"


def test_change_password_new_password_too_short(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called with new_password < 8 characters
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Testpass1!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Testpass1!"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password with short password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Testpass1!", "new_password": "Short1!"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json["msg"] == "Password must be at least 8 characters"


def test_change_password_same_as_current(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called with new_password same as current_password
    THEN it should succeed (same string, different hash due to salt)
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Samepass1!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Samepass1!"}),
        headers={"Content-Type": "application/json"},
    )

    # Try to change password to same password string
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Samepass1!", "new_password": "Samepass1!"}),
        headers={"Content-Type": "application/json"},
    )

    # Should succeed - same string generates different hash due to salt
    assert response.status_code == 200
    assert response.json["msg"] == "Password updated successfully"


def test_change_password_unauthorized_no_token(test_client):
    """
    GIVEN no authentication token
    WHEN PATCH /user/password is called
    THEN it should return 401
    """
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "testpass", "new_password": "newpass123"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401


def test_change_password_clears_must_change_flag(test_client):
    """
    GIVEN a user with must_change_password = True
    WHEN they change their password
    THEN the must_change_password flag should be cleared
    """
    from api.models import User

    # Create a user with must_change_password flag
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "Oldpass123!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Manually update must_change_password flag
    user = User.query.filter_by(email="test@example.com").first()
    user.must_change_password = True
    user.update()

    # Login (should still work)
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "Oldpass123!"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "Oldpass123!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200

    # Verify flag is cleared
    user = User.query.filter_by(email="test@example.com").first()
    assert user.must_change_password is False


def test_change_password_invalid_json(test_client):
    """
    GIVEN a logged-in user
    WHEN PATCH /user/password is called without JSON content
    THEN it should return 400
    """
    # Register and login
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "testpass", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "testpass"}),
        headers={"Content-Type": "application/json"},
    )

    # Change password with invalid content type
    response = test_client.patch(
        "/user/password",
        data="invalid",
        headers={"Content-Type": "text/plain"},
    )

    assert response.status_code == 400
    assert response.json["msg"] == "Missing JSON in request"


def test_change_password_case_sensitive(test_client):
    """
    GIVEN a user with password "TestPass1!"
    WHEN they try to change password with wrong case "testpass1!"
    THEN it should fail
    """
    # Register user with mixed case password
    test_client.post(
        "/auth/register",
        data=json.dumps({"name": "testuser", "password": "TestPass1!", "email": "test@example.com"}),
        headers={"Content-Type": "application/json"},
    )

    # Login with correct case
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "test@example.com", "password": "TestPass1!"}),
        headers={"Content-Type": "application/json"},
    )

    # Try to change password with wrong case
    response = test_client.patch(
        "/user/password",
        data=json.dumps({"current_password": "testpass1!", "new_password": "Newpass456!"}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401
    assert response.json["msg"] == "Current password is incorrect"
