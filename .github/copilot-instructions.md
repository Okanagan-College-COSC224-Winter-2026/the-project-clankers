# Copilot / AI agent instructions — Peer-Evaluation-App-V1

These notes help AI agents be productive quickly in this repo. Keep edits small, lean on existing tests, and don't touch secrets.

## Big picture — architecture
**`flask_backend/`** (Python Flask) — The backend
- JWT auth via HTTPOnly cookies (Flask-JWT-Extended)
- SQLAlchemy ORM + Marshmallow schemas
- 14 blueprints, 84 endpoints
- Dev DB: SQLite (instance/app.sqlite), Prod: PostgreSQL

**`frontend/`** (React + TypeScript + Vite) — The frontend
- Talks to Flask backend at `http://localhost:5000` (dev) via `frontend/src/util/api.ts` (BASE_URL constant)
- 25+ protected routes with role-based access

## Role-based access control (RBAC)
System uses three roles (`student`, `teacher`, `admin`) stored in `User.role` field:
- **Students**: Register via `/auth/register`, view profile, submit work, peer review, view grades
- **Teachers**: All student perms + create courses/assignments, manage rosters/groups, create rubrics, view gradebook
- **Admins**: All perms + user management via `/admin/*` endpoints, cannot self-delete/demote

Key files: `flask_backend/api/models/user_model.py` (role validation + helper methods `is_teacher()`, `is_admin()`, `has_role(*roles)`), `flask_backend/api/controllers/auth_controller.py` (decorators: `jwt_role_required`, `jwt_admin_required`, `jwt_teacher_required`).

## Files to know
- Entry point: `flask_backend/api/__init__.py` (Flask app factory, CORS, JWT cookie config, blueprint registration)
- Controllers (14): `flask_backend/api/controllers/` — auth, user, admin, class, enrollment, assignment, student_submission, review, rubric, gradebook, group, legacy_group, fake_api
- Models (21): `flask_backend/api/models/` — User, Course, Assignment, AssignmentFile, CourseGroup, GroupMembers, Review, Criterion, Rubric, CriteriaDescription, StudentSubmission, Submission, EnrollmentRequest, Notification, UserCourse, CourseGradePolicy, GradeOverride, CourseTotalOverride
- Tests (18 files): `flask_backend/tests/` — pytest with in-memory SQLite
- CLI: `flask_backend/api/cli/database.py` — commands: `flask init_db`, `flask add_users`, `flask create_admin`, `flask drop_db`
- Frontend contract: `frontend/src/util/api.ts` (all fetch calls include `credentials: 'include'` for cookies), `frontend/src/util/login.ts` (role helpers: `getUserRole()`, `isAdmin()`, `isTeacher()`)

## Dev workflows (local — Flask backend)
**Windows (PowerShell):**
```powershell
cd flask_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
pip install -r requirements-dev.txt
flask init_db              # Create database
flask add_users            # Add sample users (student, teacher, admin)
flask run                  # Start server on http://localhost:5000
```
**macOS/Linux:**
```bash
cd flask_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
pip install -r requirements-dev.txt
flask init_db
flask add_users
flask run                  # Port 5000
```
**Tests:** `cd flask_backend && pytest` (or `pytest tests/test_login.py -v` for specific tests)

**Frontend (same across all OS):**
```bash
cd frontend
npm install                # or: pnpm install (pnpm-workspace.yaml exists but npm works too)
npm run dev                # http://localhost:3000 (strict port, fails if busy)
```

**Docker (entire stack):**
```bash
docker-compose up --build   # Starts PostgreSQL (5432), Flask backend (5000), React frontend (80)
```

## Auth pattern (HTTPOnly cookies + JWT)
**Critical security change (see `docs/HTTPONLY_COOKIES_MIGRATION.md`):**
- Tokens stored in **HTTPOnly cookies** (not localStorage), preventing XSS theft
- `/auth/login` returns `{ role, user_id, name }` (NO `access_token` in JSON)
- `/auth/logout` clears cookies via `unset_jwt_cookies()`
- All frontend requests include `credentials: 'include'` (axios/fetch)
- **Never** send `Authorization: Bearer` headers — cookies auto-attach
- Test client (`flask.testing.FlaskClient`) handles cookies automatically

Example flow:
```python
# Backend: flask_backend/api/controllers/auth_controller.py
response = jsonify(role=user.role, user_id=user.id, name=user.name)
set_access_cookies(response, access_token)  # Sets httponly cookie
```
```typescript
// Frontend: frontend/src/util/api.ts
const response = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include'  // Must include for cookies
});
```

## Conventions and patterns
- **Blueprints per feature:** Register in `flask_backend/api/__init__.py` (e.g., `app.register_blueprint(auth_controller.bp)`)
- **Marshmallow schemas:** Use for JSON serialization (see `UserSchema(exclude=['password'])` in controllers)
- **Never expose passwords:** Always exclude from schemas and responses
- **Tests as contract:** Changes must pass existing tests (`test_login.py`, `test_user.py`, `test_model.py`) — no guessing
- **Role checks:** Use decorators (`@jwt_role_required('admin')`) or model methods (`user.is_admin()`, `user.has_role('teacher', 'admin')`)
- **Config hierarchy:** Defaults in `api/__init__.py`, overrides in `api/config.py` (not committed), env vars for secrets

## Known gaps and integration points
- **Endpoints.json vs reality:** `docs/dev-guidelines/endpoints.json` is a legacy API spec (for reference only). The Flask backend has 84 endpoints across 14 blueprints — check the actual controllers for current routes.
- **Database schema:** Flask has 21 models covering User, Course, Assignment, Group, Review, Rubric, Gradebook, Enrollment, and more. See `docs/schema/database-schema.md` for the full schema.
- **Frontend routes:** 25+ protected routes covering class management, assignments, groups, rubrics, peer reviews, gradebook, and admin features.

## Quick reference
**Add a new Flask route:**
1. Create handler in `flask_backend/api/controllers/your_controller.py` (or add to existing)
2. Use decorators: `@bp.route('/path', methods=['POST'])`, `@jwt_role_required('teacher')`
3. Register blueprint in `flask_backend/api/__init__.py` if new controller
4. Write test in `flask_backend/tests/test_your_feature.py` (use `client.post()`, assertions on `response.get_json()`)

**Add a user via CLI:**
```bash
flask create_admin              # Prompts for name, email, password (creates admin)
flask add_users                 # Adds sample student/teacher/admin users
```

**Check database:**
```bash
sqlite3 flask_backend/instance/app.sqlite
.tables
SELECT id, name, email, role FROM User;
```
