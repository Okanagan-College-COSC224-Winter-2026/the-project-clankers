# Role-Based Access Control 

## Role Permissions Summary

### Student Role (`role='student'`)

- ✅ Can register via public `/auth/register` endpoint
- ✅ Can view their own profile
- ✅ Can update their own profile
- ✅ Can delete their own account
- ❌ Cannot create courses or assignments
- ❌ Cannot view other users' profiles (unless enrolled together)
- ❌ Cannot create other accounts

### Teacher Role (`role='teacher'`)

- ✅ All student permissions
- ✅ Can view any student's profile
- ✅ Can create courses
- ✅ Can create assignments
- ✅ Can upload student rosters that auto-create student accounts (to be implemented)
- ✅ Can create course-level and assignment-level groups (to be implemented)
- ❌ Cannot create teacher or admin accounts
- ❌ Cannot delete other users

### Admin Role (`role='admin'`)

- ✅ All teacher permissions
- ✅ Can view all users via `/admin/users`
- ✅ Can create users with any role via `/admin/users/create`
- ✅ Can update any user's role via `/admin/users/<id>/role`
- ✅ Can delete any user via `/admin/users/<id>`
- ✅ Cannot demote themselves from admin
- ✅ Cannot delete their own account through admin endpoint

## API Endpoints Summary

### Public Endpoints

```text
POST /auth/register    - Register as student
POST /auth/login       - Login and get JWT token with role
POST /auth/logout      - Logout (client-side token removal)
```

### Authenticated Endpoints (All Roles)

```text
GET  /user/            - Get current user info
PUT  /user/            - Update current user info
GET  /user/<id>        - Get user by ID (own or if teacher/admin)
DELETE /user/<id>      - Delete own account
```

### Admin-Only Endpoints

```text
GET    /admin/users           - List all users
POST   /admin/users/create    - Create user with any role
PUT    /admin/users/<id>/role - Update user's role
DELETE /admin/users/<id>      - Delete any user
```
