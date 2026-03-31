# US26 - Admin User Management Functionality

This folder contains all the files related to the new admin user management features added in the US26-Belle branch.

## Overview

The admin functionality provides a complete user management interface for administrators to:
- View all users in the system
- Create new users with specific roles
- Edit existing user details (name, email, role)
- Delete users from the system
- Filter and search users
- Paginated user list display

## Features

### Backend API
- **New Endpoint**: `PUT /admin/users/<user_id>` - Update user details
  - Validates role changes (must be 'student', 'teacher', or 'admin')
  - Prevents self-demotion from admin role
  - Checks for duplicate emails
  - Updates name, email, and/or role

### Frontend Interface
- **New Page**: ManageUsers - Full user management interface
  - User list with avatar, name, email, role badge
  - Search by name or email
  - Filter by role (All, Student, Teacher, Admin)
  - Pagination (10 users per page)
  - Create, Edit, Delete operations
  - Responsive design with proper error handling

- **New Component**: EditUserModal
  - Modal dialog for editing user details
  - Form validation (email format, required fields)
  - Prevents users from changing their own role
  - Real-time error feedback

## Files Included

### Backend
- `backend/admin_controller.py` - Admin API controller with update endpoint

### Frontend - Pages
- `frontend/pages/ManageUsers.tsx` - Main user management page (415 lines)
- `frontend/pages/ManageUsers.css` - Styling for ManageUsers page

### Frontend - Components
- `frontend/components/EditUserModal.tsx` - User edit modal component (157 lines)
- `frontend/components/EditUserModal.css` - Styling for edit modal

### Frontend - Snippets (Code Additions)
- `frontend/App.tsx.snippet` - Route configuration for /admin/users
- `frontend/Sidebar.tsx.snippet` - Admin navigation section
- `frontend/api.ts.snippet` - API functions for user management:
  - `getAllUsers()` - GET /admin/users
  - `createUser()` - POST /admin/users/create
  - `updateUser()` - PUT /admin/users/<id>
  - `deleteUser()` - DELETE /admin/users/<id>
  - `updateUserProfile()` - PUT /user/

## API Endpoints

### GET /admin/users
Get all users in the system (admin only)

**Response**: Array of user objects

### POST /admin/users/create
Create a new user (admin only)

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "temp123",
  "role": "student",
  "must_change_password": true
}
```

### PUT /admin/users/<user_id>
Update user details (admin only) - **NEW IN US26**

**Request Body**:
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "role": "teacher"
}
```

**Response**:
```json
{
  "msg": "User updated successfully",
  "user": { ... }
}
```

**Validations**:
- Role must be 'student', 'teacher', or 'admin'
- Cannot demote yourself from admin
- Email must be unique
- All fields are optional (only provided fields are updated)

### DELETE /admin/users/<user_id>
Delete a user (admin only)

**Response**:
```json
{
  "msg": "User deleted successfully"
}
```

## Security Features

1. **Role-Based Access Control**: All endpoints require admin role
2. **Self-Protection**: Admins cannot delete or demote themselves
3. **Email Validation**: Validates email format and uniqueness
4. **Password Requirements**: Minimum 6 characters for new users
5. **JWT Authentication**: All requests require valid JWT token

## User Interface Flow

### Creating a User
1. Click "Create New User" button
2. Fill in name, email, temporary password
3. Select role (Student/Teacher/Admin)
4. Optionally require password change on first login
5. Click "Create User"

### Editing a User
1. Click "Edit" button on user card
2. Modify name, email, and/or role
3. Note: Cannot change your own role
4. Click "Save Changes"

### Deleting a User
1. Click "Delete" button on user card
2. Confirm deletion in dialog
3. User is permanently removed
4. Note: Cannot delete yourself

### Filtering/Searching
- Use search box to filter by name or email
- Use role dropdown to filter by role
- Pagination automatically adjusts to filtered results

## Implementation Notes

- All admin routes are prefixed with `/admin`
- Frontend components use existing design system (Button, Textbox, Dropdown)
- Error messages are user-friendly and specific
- Success messages auto-dismiss after 4 seconds
- Form validation happens on client and server side
- All API calls handle token expiration gracefully

## Dependencies

### Backend
- Flask
- Flask-JWT-Extended
- SQLAlchemy
- Marshmallow

### Frontend
- React
- React Router
- TypeScript
- Existing component library (Button, Textbox, Dropdown, etc.)

## Testing

The admin functionality should be tested with:
- Admin user creating/editing/deleting users
- Non-admin users attempting to access admin endpoints (should fail)
- Edge cases: duplicate emails, invalid roles, self-modification
- UI validation: form errors, success messages, pagination

## Future Enhancements

Potential improvements for future iterations:
- Bulk user operations (import from CSV)
- User activity logs
- Role permission customization
- Password reset functionality
- User account suspension (soft delete)
- Advanced filtering (by date created, last login, etc.)

---

**Branch**: US26-Belle
**Date**: March 2026
**Contributors**: Belle
