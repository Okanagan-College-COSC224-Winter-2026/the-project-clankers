# US13 Test Cases - Teacher Change Password

## Overview
Comprehensive test suite for User Story 13: Teacher Change Password functionality across both backend and frontend.

---

## Backend Tests (`flask_backend/tests/test_change_password.py`)

### Running Backend Tests

```bash
# Run all change password tests
cd flask_backend
pytest tests/test_change_password.py -v

# Run specific test
pytest tests/test_change_password.py::test_change_password_success -v

# Run with coverage
pytest tests/test_change_password.py --cov=api.controllers.user_controller --cov-report=html
```

### Test Cases

#### 1. **test_change_password_success**
- **Purpose**: Verify successful password change
- **Preconditions**: User is logged in with valid credentials
- **Steps**:
  1. Register a user with password "oldpass123"
  2. Login successfully
  3. Call PATCH /user/password with current password and new password
- **Expected Result**: Returns 200 with success message
- **Status**: ✅ PASSING

#### 2. **test_change_password_can_login_with_new_password**
- **Purpose**: Verify user can login after password change
- **Preconditions**: User has successfully changed password
- **Steps**:
  1. Register user with old password
  2. Login
  3. Change password to new password
  4. Login with new password
- **Expected Result**: Login succeeds with new password (200)
- **Status**: ✅ PASSING

#### 3. **test_change_password_cannot_login_with_old_password**
- **Purpose**: Verify old password no longer works after change
- **Preconditions**: User has successfully changed password
- **Steps**:
  1. Register user with old password
  2. Change password to new password
  3. Try to login with old password
- **Expected Result**: Login fails with 401
- **Status**: ✅ PASSING

#### 4. **test_change_password_incorrect_current_password**
- **Purpose**: Verify password change fails with wrong current password
- **Preconditions**: User is logged in
- **Steps**:
  1. Attempt password change with incorrect current password
- **Expected Result**: Returns 401 with error message
- **Status**: ✅ PASSING

#### 5. **test_change_password_missing_current_password**
- **Purpose**: Verify validation when current_password field is missing
- **Preconditions**: User is logged in
- **Steps**:
  1. Call PATCH /user/password without current_password field
- **Expected Result**: Returns 400 with validation error
- **Status**: ✅ PASSING

#### 6. **test_change_password_missing_new_password**
- **Purpose**: Verify validation when new_password field is missing
- **Preconditions**: User is logged in
- **Steps**:
  1. Call PATCH /user/password without new_password field
- **Expected Result**: Returns 400 with validation error
- **Status**: ✅ PASSING

#### 7. **test_change_password_new_password_too_short**
- **Purpose**: Verify password length validation (minimum 6 characters)
- **Preconditions**: User is logged in
- **Steps**:
  1. Attempt password change with new_password = "short" (5 chars)
- **Expected Result**: Returns 400 with validation error
- **Status**: ✅ PASSING

#### 8. **test_change_password_same_as_current**
- **Purpose**: Verify new password cannot be same as current password
- **Preconditions**: User is logged in
- **Steps**:
  1. Attempt password change with new_password = current_password
- **Expected Result**: Returns 401 (same password fails hash check)
- **Status**: ✅ PASSING

#### 9. **test_change_password_unauthorized_no_token**
- **Purpose**: Verify endpoint requires authentication
- **Preconditions**: No JWT token provided
- **Steps**:
  1. Call PATCH /user/password without JWT token
- **Expected Result**: Returns 401
- **Status**: ✅ PASSING

#### 10. **test_change_password_clears_must_change_flag**
- **Purpose**: Verify must_change_password flag is cleared after change
- **Preconditions**: User has must_change_password = True
- **Steps**:
  1. Manually set user.must_change_password = True
  2. Login
  3. Change password
  4. Verify flag is cleared
- **Expected Result**: Flag is set to False after password change
- **Status**: ✅ PASSING

#### 11. **test_change_password_invalid_json**
- **Purpose**: Verify endpoint requires JSON content
- **Preconditions**: User is logged in
- **Steps**:
  1. Call PATCH /user/password with non-JSON content type
- **Expected Result**: Returns 400 with JSON error message
- **Status**: ✅ PASSING

#### 12. **test_change_password_case_sensitive**
- **Purpose**: Verify passwords are case-sensitive
- **Preconditions**: User has password with mixed case
- **Steps**:
  1. Register with password "TestPass123"
  2. Attempt password change with wrong case "testpass123"
- **Expected Result**: Returns 401
- **Status**: ✅ PASSING

---

## Frontend Tests (`frontend/src/pages/__tests__/ChangePassword.test.tsx`)

### Running Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm run test

# Run specific test file
npm run test -- ChangePassword.test.tsx

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test -- --watch
```

### Test Setup Requirements

The frontend tests use:
- **Vitest** - Test runner
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation

### Test Suites

#### Suite 1: **Forced Password Change (After Login)**

##### test_should_display_forced_change_message
- Verifies forced mode message displays correctly
- **Expected**: "You must change your temporary password before continuing."

##### test_should_not_display_cancel_button_in_forced_mode
- Verifies Cancel button is hidden in forced mode
- **Expected**: No Cancel button visible

##### test_should_display_voluntary_change_message
- Verifies voluntary mode message displays correctly
- **Expected**: "Update your password to keep your account secure."

##### test_should_display_cancel_button_in_voluntary_mode
- Verifies Cancel button is visible in voluntary mode
- **Expected**: Cancel button present and clickable

#### Suite 2: **Form Validation**

##### test_should_show_error_when_all_fields_empty
- Validates form null checks
- **Expected**: "All fields are required" error

##### test_should_show_error_when_passwords_do_not_match
- Tests password confirmation matching
- **Expected**: "New passwords do not match" error

##### test_should_show_error_when_password_less_than_6_chars
- Tests minimum password length
- **Expected**: "New password must be at least 6 characters" error

##### test_should_show_error_when_new_password_same_as_current
- Tests password change newness check
- **Expected**: "New password must be different from current password" error

#### Suite 3: **Successful Password Change**

##### test_should_call_change_password_api
- Verifies correct API call with proper payload
- **Expected**: API called with (currentPassword, newPassword)

##### test_should_display_success_message
- Tests success feedback to user
- **Expected**: "Password changed successfully! Redirecting..." message

##### test_should_disable_inputs_during_submission
- Tests UI responsiveness during async operation
- **Expected**: All input fields disabled during submission

#### Suite 4: **Error Handling**

##### test_should_display_error_message_on_api_failure
- Tests error message display from API
- **Expected**: Error message from API displayed to user

##### test_should_handle_non_error_objects
- Tests graceful handling of unexpected error types
- **Expected**: Generic "Failed to change password" message

#### Suite 5: **Profile Component Integration**

##### test_should_render_change_password_button
- Verifies button is present on Profile page
- **Expected**: Button visible with text "Change Password"

##### test_should_display_security_section
- Tests Security section header display
- **Expected**: "Security" header visible

##### test_should_have_proper_button_styling
- Tests button CSS styling
- **Expected**: Correct padding, border, color, and cursor

##### test_should_display_all_profile_sections
- Tests complete Profile page rendering
- **Expected**: All sections (Name, Email, Role, Security) visible

---

## Test Coverage Summary

### Backend Coverage
```
test_change_password.py
├── Success Cases (3 tests)
│   ├── Password change succeeds
│   ├── Can login with new password
│   └── Cannot login with old password
├── Validation Cases (5 tests)
│   ├── Missing current_password
│   ├── Missing new_password
│   ├── Password too short
│   ├── Same as current password
│   └── Invalid JSON
├── Security Cases (3 tests)
│   ├── Incorrect current password
│   ├── No authentication token
│   └── Case sensitivity
└── State Management (1 test)
    └── Clears must_change_password flag

Total: 12 backend tests
```

### Frontend Coverage
```
ChangePassword.test.tsx
├── Mode Detection (4 tests)
│   ├── Forced mode detection
│   ├── Forced mode UI
│   ├── Voluntary mode detection
│   └── Voluntary mode UI
├── Form Validation (4 tests)
│   ├── Empty fields
│   ├── Password mismatch
│   ├── Password length
│   └── Same password check
├── API Integration (3 tests)
│   ├── API call payload
│   ├── Success message
│   └── Input disabling
├── Error Handling (2 tests)
│   ├── API error display
│   └── Non-Error object handling
└── Profile Integration (4 tests)
    ├── Button rendering
    ├── Section header
    ├── Button styling
    └── All sections visible

Total: 17 frontend tests
```

---

## Running All Tests

### Complete Test Suite
```bash
# Backend tests
cd flask_backend
pytest tests/test_change_password.py -v

# Frontend tests
cd ../frontend
npm run test -- ChangePassword.test.tsx -v

# Combined with coverage
cd ../flask_backend
pytest tests/test_change_password.py --cov
cd ../frontend
npm run test -- --coverage
```

### CI/CD Integration
```bash
# In GitHub Actions or similar
pytest tests/test_change_password.py -v --junit-xml=test-results.xml
npm run test -- --coverage --reporter=junit
```

---

## Test Data

### Sample Test User
```json
{
  "name": "testuser",
  "email": "test@example.com",
  "role": "teacher"
}
```

### Sample Passwords Used in Tests
- **Initial Password**: `testpass`, `oldpass123`, `TestPass123`
- **New Password**: `newpass123`, `newpass456`
- **Invalid Passwords**: `short` (too short), `samepass123` (same as current)

---

## Known Issues & Limitations

### Frontend Tests
1. **Navigation Testing**: Tests for navigation/redirect require additional mock setup of `useNavigate`
2. **Integration Tests**: Full integration tests with actual navigation would require end-to-end test framework (Cypress/Playwright)
3. **Async Timing**: Some tests use `waitFor` due to async state updates

### Backend Tests
1. **Database State**: Tests use in-memory SQLite which is cleared between tests
2. **Hashing**: Password hash verification is timing-dependent

---

## Checklist for Test Verification

- [ ] All 12 backend tests pass
- [ ] All 17 frontend tests pass
- [ ] Code coverage > 80% for changed files
- [ ] No console errors or warnings during tests
- [ ] Tests pass locally before submitting PR
- [ ] Tests pass in CI/CD pipeline
- [ ] API contract matches between backend and frontend tests
- [ ] Error messages are consistent between frontend and backend

---

## Troubleshooting

### Backend Tests Failing

**Issue**: `SQLALCHEMY_DATABASE_URI` not set
```bash
# Solution: Tests use in-memory SQLite by default
# Ensure conftest.py is present in tests directory
```

**Issue**: Password hashing test fails
```bash
# Solution: Ensure werkzeug is installed
pip install werkzeug
```

### Frontend Tests Failing

**Issue**: Module resolution errors
```bash
# Solution: Ensure vitest.config.ts includes proper alias setup
```

**Issue**: Tests timeout
```bash
# Solution: Increase timeout in vitest config
// vitest.config.ts
export default {
  test: {
    testTimeout: 10000
  }
}
```

---

## Maintenance

- Review tests when API contract changes
- Update frontend tests if component structure changes
- Add new tests for bug fixes (regression tests)
- Keep test data values consistent with production constraints
