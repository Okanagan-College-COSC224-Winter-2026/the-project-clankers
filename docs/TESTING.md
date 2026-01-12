# Testing Guide

This guide explains how to write, run, and maintain tests for the Peer Evaluation App.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Backend Tests](#writing-backend-tests)
- [Testing Patterns](#testing-patterns)
- [Fixtures](#fixtures)
- [Testing Authentication](#testing-authentication)
- [Testing Database Operations](#testing-database-operations)
- [Mocking](#mocking)
- [Coverage](#coverage)
- [Frontend Testing](#frontend-testing)
- [Best Practices](#best-practices)

---

## 🎯 Overview

### Why We Test

- ✅ **Catch bugs early** before they reach production
- ✅ **Document behavior** through executable examples
- ✅ **Enable refactoring** with confidence
- ✅ **Improve design** by writing testable code

### Test Types

| Type | Scope | Speed | Example |
|------|-------|-------|---------|
| **Unit Tests** | Single function/method | Fast | Test `User.get_by_email()` |
| **Integration Tests** | Multiple components | Medium | Test login endpoint with database |
| **End-to-End Tests** | Full user flow | Slow | Test complete registration → login → dashboard |

**Current focus**: Unit and Integration tests for backend (pytest)

---

## 🚀 Running Tests

### Run All Backend Tests

```bash
cd flask_backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pytest
```

### Run Specific Test File

```bash
pytest tests/test_login.py
```

### Run Specific Test Function

```bash
pytest tests/test_login.py::test_login_with_valid_credentials
```

### Run with Verbose Output

```bash
pytest -v
```

### Run with Coverage Report

```bash
pytest --cov=api --cov-report=html
```

Then open `htmlcov/index.html` in your browser.

### Run Tests on File Change (Watch Mode)

```bash
pip install pytest-watch
ptw
```

---

## 📁 Test Structure

### File Organization

```
flask_backend/
├── api/
│   ├── controllers/       # Endpoint handlers
│   ├── models/           # Database models
│   └── __init__.py       # App factory
└── tests/
    ├── conftest.py       # Shared fixtures
    ├── test_login.py     # Authentication tests
    ├── test_user.py      # User endpoint tests
    ├── test_classes.py   # Class endpoint tests
    ├── test_assignments.py
    └── test_model.py     # Model method tests
```

### Naming Conventions

- **Test files**: `test_<feature>.py`
- **Test functions**: `test_<feature>_<scenario>`

**Examples:**
```python
# test_assignments.py
def test_create_assignment_success()
def test_create_assignment_missing_name()
def test_create_assignment_unauthorized()
def test_get_assignment_by_id()
def test_delete_assignment_as_teacher()
```

---

## ✍️ Writing Backend Tests

### Basic Test Structure (AAA Pattern)

```python
def test_example(test_client):
    # ARRANGE - Set up test data
    user_data = {"email": "test@example.com", "password": "pass123"}
    
    # ACT - Perform the action
    response = test_client.post("/auth/login", json=user_data)
    
    # ASSERT - Verify the outcome
    assert response.status_code == 200
    assert response.json["role"] == "student"
```

### Example: Testing an Endpoint

```python
import json

def test_create_class_success(test_client, make_admin):
    """
    GIVEN a logged-in teacher user
    WHEN POST /class/create_class is called with valid data
    THEN a new class should be created
    """
    # ARRANGE - Create teacher and login
    make_admin(email="teacher@example.com", password="pass123", name="Teacher")
    test_client.post(
        "/auth/login",
        data=json.dumps({"email": "teacher@example.com", "password": "pass123"}),
        headers={"Content-Type": "application/json"}
    )
    
    # ACT - Create class
    response = test_client.post(
        "/class/create_class",
        data=json.dumps({"name": "Math 101"}),
        headers={"Content-Type": "application/json"}
    )
    
    # ASSERT - Verify success
    assert response.status_code == 201
    assert response.json["msg"] == "Class created"
    assert "id" in response.json["class"]
```

### Example: Testing Error Cases

```python
def test_create_class_missing_name(test_client, make_admin):
    """
    GIVEN a logged-in teacher
    WHEN POST /class/create_class is called without a name
    THEN it should return 400 error
    """
    # ARRANGE
    make_admin(email="teacher@example.com", password="pass123")
    test_client.post("/auth/login", json={"email": "teacher@example.com", "password": "pass123"})
    
    # ACT
    response = test_client.post("/class/create_class", json={})
    
    # ASSERT
    assert response.status_code == 400
    assert "Class name is required" in response.json["msg"]
```

---

## 🔧 Testing Patterns

### Testing Different HTTP Methods

```python
# GET request
def test_get_user_profile(test_client, sample_user):
    response = test_client.get(f"/user/{sample_user.id}")
    assert response.status_code == 200

# POST request with JSON
def test_create_resource(test_client):
    response = test_client.post(
        "/resource",
        data=json.dumps({"name": "Test"}),
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 201

# PUT request
def test_update_resource(test_client):
    response = test_client.put("/resource/1", json={"name": "Updated"})
    assert response.status_code == 200

# DELETE request
def test_delete_resource(test_client):
    response = test_client.delete("/resource/1")
    assert response.status_code == 200
```

### Testing Query Parameters

```python
def test_get_classes_by_teacher(test_client):
    response = test_client.get("/class/classes?teacher_id=1")
    assert response.status_code == 200
```

### Testing JSON Responses

```python
def test_response_structure(test_client):
    response = test_client.get("/user/1")
    data = response.json
    
    assert "id" in data
    assert "email" in data
    assert "name" in data
    assert "password" not in data  # Should be excluded
```

---

## 🎪 Fixtures

Fixtures provide reusable test data and setup. Defined in `conftest.py`.

### Using Built-in Fixtures

```python
def test_with_client(test_client):
    """test_client fixture provides Flask test client"""
    response = test_client.get("/hello")
    assert response.status_code == 200

def test_with_database(db):
    """db fixture provides database session"""
    from api.models import User
    user = User(name="Test", email="test@example.com", hash_pass="hash")
    db.session.add(user)
    db.session.commit()
```

### Common Fixtures

| Fixture | Purpose | Usage |
|---------|---------|-------|
| `test_client` | Flask test client | Make HTTP requests |
| `db` | Database session | Direct database operations |
| `make_admin` | Create admin/teacher user | Set up authenticated users |

### Creating Custom Fixtures

```python
# In conftest.py
import pytest

@pytest.fixture
def sample_course(db):
    """Creates a sample course for testing"""
    from api.models import Course
    course = Course(teacherID=1, name="Test Course")
    db.session.add(course)
    db.session.commit()
    return course

# In test file
def test_with_course(test_client, sample_course):
    response = test_client.get(f"/class/{sample_course.id}")
    assert response.json["name"] == "Test Course"
```

### Fixture Scope

```python
@pytest.fixture(scope="function")  # Default: new instance per test
def user():
    return create_user()

@pytest.fixture(scope="module")  # One instance per test file
def database():
    return setup_database()

@pytest.fixture(scope="session")  # One instance per test run
def config():
    return load_config()
```

---

## 🔐 Testing Authentication

### Testing Login

```python
def test_login_success(test_client):
    # Register user first
    test_client.post("/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "pass123"
    })
    
    # Test login
    response = test_client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "pass123"
    })
    
    assert response.status_code == 200
    assert response.json["role"] == "student"
```

### Testing Protected Endpoints

```python
def test_protected_endpoint_without_auth(test_client):
    """Accessing protected route without login should fail"""
    response = test_client.get("/user/profile")
    assert response.status_code == 401

def test_protected_endpoint_with_auth(test_client, make_admin):
    """Accessing protected route with login should succeed"""
    make_admin(email="user@example.com", password="pass123")
    test_client.post("/auth/login", json={"email": "user@example.com", "password": "pass123"})
    
    response = test_client.get("/user/")
    assert response.status_code == 200
```

### Testing Role-Based Access

```python
def test_admin_only_endpoint_as_student(test_client):
    """Students should not access admin endpoints"""
    # Register as student
    test_client.post("/auth/register", json={
        "name": "Student",
        "email": "student@example.com",
        "password": "pass123"
    })
    test_client.post("/auth/login", json={"email": "student@example.com", "password": "pass123"})
    
    # Try to access admin endpoint
    response = test_client.get("/admin/users")
    assert response.status_code == 403

def test_admin_only_endpoint_as_admin(test_client, make_admin):
    """Admins should access admin endpoints"""
    make_admin(email="admin@example.com", password="pass123")
    test_client.post("/auth/login", json={"email": "admin@example.com", "password": "pass123"})
    
    response = test_client.get("/admin/users")
    assert response.status_code == 200
```

---

## 🗄️ Testing Database Operations

### Testing Model Methods

```python
def test_user_get_by_email(db):
    """Test User.get_by_email() class method"""
    from api.models import User
    from werkzeug.security import generate_password_hash
    
    # Create user
    user = User(
        name="Test User",
        email="test@example.com",
        hash_pass=generate_password_hash("pass123"),
        role="student"
    )
    db.session.add(user)
    db.session.commit()
    
    # Test retrieval
    found = User.get_by_email("test@example.com")
    assert found is not None
    assert found.name == "Test User"
    
    # Test not found
    not_found = User.get_by_email("nonexistent@example.com")
    assert not_found is None
```

### Testing Database Constraints

```python
def test_unique_email_constraint(db):
    """Email should be unique"""
    from api.models import User
    from sqlalchemy.exc import IntegrityError
    
    user1 = User(name="User 1", email="same@example.com", hash_pass="hash1")
    db.session.add(user1)
    db.session.commit()
    
    user2 = User(name="User 2", email="same@example.com", hash_pass="hash2")
    db.session.add(user2)
    
    with pytest.raises(IntegrityError):
        db.session.commit()
```

### Testing Relationships

```python
def test_course_teacher_relationship(db):
    """Course should link to teacher via teacherID"""
    from api.models import User, Course
    
    teacher = User(name="Teacher", email="t@example.com", hash_pass="hash", role="teacher")
    db.session.add(teacher)
    db.session.commit()
    
    course = Course(teacherID=teacher.id, name="Test Course")
    db.session.add(course)
    db.session.commit()
    
    # Test relationship
    assert course.teacherID == teacher.id
    found_course = Course.get_by_id(course.id)
    assert found_course.teacherID == teacher.id
```

---

## 🎭 Mocking

Use mocking when you need to isolate code from external dependencies.

### Mocking External APIs

```python
from unittest.mock import patch

def test_with_external_api(test_client):
    with patch('requests.post') as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"success": True}
        
        response = test_client.get("/external-api-call")
        assert response.status_code == 200
```

### Mocking Database Queries

```python
def test_with_mocked_query(test_client):
    with patch('api.models.User.get_by_email') as mock_get:
        mock_get.return_value = None
        
        response = test_client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "pass123"
        })
        assert response.status_code == 401
```

---

## 📊 Coverage

### Checking Coverage

```bash
pytest --cov=api --cov-report=term-missing
```

**Output shows:**
- Which files are covered
- Which lines are NOT tested
- Overall percentage

### Coverage Goals

- **Minimum**: 70% overall coverage
- **Target**: 80%+ coverage
- **Critical paths**: 100% (authentication, authorization, data validation)

### Improving Coverage

1. **Identify gaps**: Run coverage report
2. **Write tests**: Focus on uncovered lines
3. **Test edge cases**: Not just happy paths
4. **Verify**: Re-run coverage to confirm

---

## 🎨 Frontend Testing

**Current Status**: Frontend testing setup is pending.

**Planned Approach:**
- Use **Jest** + **React Testing Library**
- Test components, not implementation details
- Mock API calls
- Test user interactions

**Example (future):**
```typescript
// Example test (not yet implemented)
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

test('login form submits credentials', () => {
  render(<LoginPage />);
  
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'test@example.com' }
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'pass123' }
  });
  fireEvent.click(screen.getByText('Login'));
  
  // Assert API was called
});
```

---

## ✅ Best Practices

### Do's

✅ **Write descriptive test names**
```python
# Good
def test_create_class_fails_without_teacher_role()

# Bad
def test_create_class_2()
```

✅ **Test one thing per test**
```python
# Good
def test_login_with_invalid_email()
def test_login_with_invalid_password()

# Bad
def test_login_errors()  # Tests multiple scenarios
```

✅ **Use AAA pattern (Arrange, Act, Assert)**

✅ **Test error cases, not just happy paths**

✅ **Keep tests independent** - Order shouldn't matter

✅ **Use fixtures for setup** - Don't repeat code

✅ **Assert specific values**
```python
# Good
assert response.json["name"] == "Math 101"

# Bad
assert response.json["name"]  # Just checks existence
```

### Don'ts

❌ **Don't test framework code**
```python
# Don't test Flask's routing
def test_flask_can_route()  # Unnecessary
```

❌ **Don't make tests depend on each other**
```python
# Bad - test2 depends on test1
def test_1_create_user():
    global user_id
    user_id = create_user()

def test_2_update_user():
    update_user(user_id)  # Depends on test_1
```

❌ **Don't use time.sleep() in tests**
```python
# Bad
time.sleep(5)  # Slows down test suite

# Good - use mock time or events
```

❌ **Don't test private methods directly**
```python
# Test public interface, not implementation details
```

❌ **Don't commit commented-out tests**
```python
# Delete or fix broken tests, don't comment them out
```

---

## 📚 Additional Resources

### pytest Documentation
- [Official pytest docs](https://docs.pytest.org/)
- [Flask testing docs](https://flask.palletsprojects.com/en/latest/testing/)

### Related Documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow
- [conftest.py](../flask_backend/tests/conftest.py) - Available fixtures
- [Existing tests](../flask_backend/tests/) - Learn by example

---

## ❓ FAQ

**Q: Do I need to write tests for every line of code?**  
A: Focus on logic and edge cases. Don't test trivial code (like getters/setters) or framework features.

**Q: How many assertions per test?**  
A: Typically 1-3. More is okay if testing related aspects of the same behavior.

**Q: Should tests test implementation or behavior?**  
A: Test behavior (what it does), not implementation (how it does it). Tests should survive refactoring.

**Q: When should I use mocks?**  
A: When testing code that depends on external systems (APIs, file systems) or when you want to isolate the code under test.

**Q: My test passes locally but fails in CI. Why?**  
A: Could be timing issues, environment differences, or test dependencies. Make tests independent and deterministic.

---

**Happy Testing! 🧪**

Remember: Good tests give you confidence to change code. Bad tests slow you down. Invest time in writing good tests!
