# DevOps Guidelines

## Git Guidelines

### Commit Message Guideline

**Message format:**

```text
<type>(<scope>): <short-summary>
[optional-body]
[optional-footer]
```

**Types:**

- `feat` – A new feature
- `fix` – A bug fix
- `docs` – Documentation changes
- `style` – Code style changes (formatting, missing semicolons, etc.)
- `refactor` – Code restructuring without changing behavior
- `test` – Adding or updating tests
- `chore` – Maintenance task (e.g. updating dependencies)

**Best Practices for tone:**

- Use the imperative mood: "Add feature" not "Added feature."
- Keep the summary under 50 characters.
- Use the body to explain why the change was made, not just what changed.
- Reference issues or pull requests in the footer (e.g., `Closes #42`)

**Examples (Good):**

```text
feat(auth): Add password reset endpoint

Implemented /auth/reset-password endpoint with email verification.
Uses JWT tokens with 15-minute expiration for security.

Closes #42
```

```text
fix(classes): Handle empty roster CSV upload

Added validation to prevent 500 error when CSV has no data rows.
Now returns 400 with clear error message.

Fixes #58
```

```text
refactor(user): Extract role checking to User model

Moved is_admin(), is_teacher(), has_role() methods from controller
to User model for reusability and testability.
```

```text
test(assignments): Add tests for assignment creation

Added unit tests covering:
- Valid assignment creation
- Missing required fields
- Unauthorized access

Coverage: 87% → 92%
```

```text
docs(readme): Update backend setup instructions

Added environment variables section with .env examples
and production vs development configuration differences.
```

**Examples (Bad - Don't Do This):**

```text
❌ fixed bug
   (Too vague - what bug? where?)

❌ Updated some files
   (No type, no context, not imperative)

❌ WIP: trying to get auth working
   (Don't commit WIP to shared branches)

❌ feat: Added the new feature that allows users to create assignments and also fixed a bug with login and updated documentation
   (Way too long, multiple changes in one commit)
```

### Workflow

**1. Starting New Work**

Before creating a branch, ensure you're up-to-date:

```bash
# Switch to dev branch
git checkout dev

# Pull latest changes
git pull origin dev

# Verify you're on dev and up-to-date
git status
```

**2. Create a Feature Branch**

Use clear, descriptive branch names following the convention `<type>/<brief-description>`:

```bash
# Examples of good branch names:
git checkout -b feature/password-reset
git checkout -b fix/csv-upload-validation
git checkout -b docs/api-endpoints
git checkout -b refactor/user-role-methods
git checkout -b test/assignment-creation

# Check current branch
git branch
```

**Branch Naming Convention:**

| Type | When to Use | Example |
|------|-------------|---------|
| `feature/` | Adding new functionality | `feature/rubric-crud-endpoints` |
| `fix/` | Fixing bugs | `fix/cors-cookie-issue` |
| `refactor/` | Restructuring existing code | `refactor/extract-validation-helpers` |
| `docs/` | Documentation only | `docs/update-contributing-guide` |
| `test/` | Adding/updating tests | `test/assignment-model-coverage` |
| `chore/` | Maintenance (deps, config) | `chore/update-flask-3.1` |

**3. Make Changes and Commit**

Work in small, logical commits:

```bash
# Check what files changed
git status

# Stage specific files
git add flask_backend/api/controllers/auth_controller.py
git add flask_backend/tests/test_auth.py

# Commit with descriptive message
git commit -m "feat(auth): Add password reset endpoint

Implemented /auth/reset-password with email verification.
Uses JWT tokens with 15-minute expiration.

Closes #42"

# Make more commits as you progress
git add flask_backend/api/models/users_model.py
git commit -m "refactor(user): Add reset_token field to User model"
```

**Pro Tips:**

- Commit frequently (every logical change)
- Each commit should pass tests
- Don't commit broken code to shared branches
- Use `git diff` before committing to review changes

**4. Push Your Branch**

```bash
# First push (creates remote branch)
git push -u origin feature/password-reset

# Subsequent pushes
git push
```

**5. Open a Pull Request**

Open a PR to merge your branch into `dev`:

1. Go to GitHub repository
2. Click "Compare & pull request"
3. **Base branch**: `dev` (NOT `main`)
4. **Compare branch**: Your feature branch
5. Fill out the PR template (see [CONTRIBUTING.md](../CONTRIBUTING.md))
6. Request review from at least one team member
7. Link related issues (e.g., "Closes #42")

**6. Address Review Feedback**

If reviewers request changes:

```bash
# Make requested changes
git add changed-files
git commit -m "fix(auth): Address review feedback - add input validation"

# Push updates (PR auto-updates)
git push
```

**7. Merge After Approval**

Once approved and CI passes:

1. Use **Squash and Merge** on GitHub
2. Delete the feature branch after merge
3. Pull latest `dev` locally:

```bash
git checkout dev
git pull origin dev

# Delete local feature branch
git branch -d feature/password-reset
```

### Handling Merge Conflicts

**Symptom:** Git says "CONFLICT" when pulling or merging

**Step-by-Step Resolution:**

**Scenario 1: Conflict During Pull**

```bash
# You're on your feature branch
git pull origin dev

# Git says: CONFLICT (content): Merge conflict in auth_controller.py
```

**Solution:**

1. **Open conflicted files** (Git marks them with `<<<<<<<`, `=======`, `>>>>>>>`)

   ```python
   # Example conflict in auth_controller.py
   <<<<<<< HEAD
   # Your changes
   @bp.route('/reset-password', methods=['POST'])
   def reset_password():
       # your implementation
   =======
   # Changes from dev branch
   @bp.route('/forgot-password', methods=['POST'])
   def forgot_password():
       # their implementation
   >>>>>>> origin/dev
   ```

2. **Resolve the conflict** by editing the file:

   ```python
   # Keep what you need, remove conflict markers
   @bp.route('/reset-password', methods=['POST'])
   def reset_password():
       # merged implementation
   ```

3. **Stage the resolved file:**

   ```bash
   git add flask_backend/api/controllers/auth_controller.py
   ```

4. **Complete the merge:**

   ```bash
   git commit -m "Merge dev into feature/password-reset"
   git push
   ```

**Scenario 2: Prevent Conflicts (Proactive)**

Keep your branch updated with `dev` regularly:

```bash
# While on your feature branch
git fetch origin
git merge origin/dev

# Or use rebase (creates cleaner history):
git fetch origin
git rebase origin/dev
```

**When to Ask for Help:**

- Large conflicts across many files
- Conflicts in code you didn't write
- Unsure which version to keep

### Common Git Mistakes and Fixes

**Mistake 1: Committed to Wrong Branch**

```bash
# Oh no! I committed to dev instead of my feature branch

# 1. Create the feature branch (keeps your commits)
git checkout -b feature/my-feature

# 2. Switch back to dev
git checkout dev

# 3. Reset dev to match remote (removes your commits from dev)
git reset --hard origin/dev

# Your commits are now only on feature/my-feature
git checkout feature/my-feature
git push -u origin feature/my-feature
```

**Mistake 2: Want to Undo Last Commit (Not Pushed Yet)**

```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Undo commit and discard changes (careful!)
git reset --hard HEAD~1
```

**Mistake 3: Pushed Bad Commit to Feature Branch**

```bash
# Revert the commit (creates new commit)
git revert HEAD
git push

# Or reset (rewrites history - use only if no one else pulled your branch)
git reset --hard HEAD~1
git push --force
```

**Mistake 4: Need to Update Commit Message (Not Pushed)**

```bash
# Change last commit message
git commit --amend -m "fix(auth): Correct typo in error message"
```

---

## Summary: Development Workflow

- Create a `feature/` branch from the `dev` branch.
- Commit changes with clear messages.
- Open a pull request to `dev` branch and request approval from one other dev.
- Run CI/CD workflows via GitHub Actions.
- Merge (squash-and-merge) after approval and successful build.
- Tag releases from `main` after merging `release/` branches.

---

## CI/CD

### GitHub Actions

GitHub has workflows that automatically execute based upon specific input. We can make several workflows and base each one on specific events. Likely we will want a pull request event workflow to build the source code and find any errors. We should think about any repetitive task that we are doing and see if there is a workflow that can automate it.

**Purpose in CI/CD:**

GitHub Actions automates workflows triggered by events such as commits, pull requests, or releases. It helps enforce quality and consistency through automated testing, building, and deployment.

**Why We Use GitHub Actions:**

- Automates repetitive tasks like testing and linting.
- Integrates directly with our GitHub repositories.
- Supports matrix builds and conditional workflows.
- Enables continuous integration and deployment with minimal setup.

**Team Standards:**

- All pull requests must trigger a CI workflow that:
  - Builds the application.
  - Runs unit and integration tests.
  - Performs linting and static analysis.
- Use GitHub Secrets for sensitive credentials (e.g., DockerHub tokens, API keys)
- Store workflows in `.github/workflows/` and name them descriptively (e.g., `ci.yml`, `deploy.yml`)
- Use caching to speed up builds (e.g., `actions/cache`)
- Document each workflow's purpose in comments at the top of the YAML file.

### Docker

Docker containers will be used for working builds of the application's 3 main components. We will have a Model, a View, and a Controller each containerized. These containers will be spun up using Docker Compose and then deployed on the PaaS platform whether that is Azure, AWS, or Google cloud etc.

**Purpose in CI/CD:**

Docker enables consistent environments across development, testing, and production by packaging applications and dependencies into containers.

**Why We Use Docker:**

- Ensures environment parity between local and server deployments.
- Simplifies dependency management.
- Enables isolated builds and testing.
- Works seamlessly with Docker Compose for multi-container setups.

**Team Standards:**

- Each major component (Model, View, Controller) must have its own Dockerfile.
- Use `docker-compose.yml` to define and manage multi-container applications.
- Tag images using semantic versioning (e.g., `backend-controller:v1.2.0`)
- Keep Dockerfiles clean and minimal; avoid installing unnecessary packages.
- Use `.dockerignore` to reduce build context and improve performance.

---

## Database Technology

### SQLAlchemy

SQLAlchemy is the Python SQL toolkit and Object Relational Mapper that gives application developers the full power and flexibility of SQL.

It provides a full suite of well-known enterprise-level persistence patterns, designed for efficient and high-performing database access, adapted into a simple and Pythonic domain language.

We will be using an ORM (object relational mapper) to create and manage the database.

**Why We Use SQLAlchemy:**

- Provides a Pythonic interface for database operations.
- Supports database-agnostic development, making it easy to switch between engines.
- Offers both Core (low-level SQL abstraction) and ORM (high-level object mapping) components.
- Enables schema generation, query optimization, and transaction management.
- Facilitates complex relationships (e.g., one-to-many, many-to-many) between tables.
- Improves security and maintainability by abstracting SQL queries.

**Key Features:**

- **Declarative Mapping**: Define tables as Python classes.
- **Session Management**: Handle transactions and object states efficiently
- **Eager/Lazy Loading**: Optimize query performance.
- **Unit of Work Pattern**: Batch updates and inserts for performance.
- **Schema Introspection**: Reflect existing database structures.
- **Prepared Statements**: Prevent SQL injection and improve performance.

**Team Standards:**

- Use declarative base classes for model definitions.
- Define relationships explicitly using `relationship()` and `ForeignKey`.
- Keep models modular and simple; use mixins for reusable logic.
- Use naming conventions for tables and constraints to ensure consistency.
- Store models in a dedicated `models.py` or `app/models/` directory.
- Use Alembic for database migrations and version control.
- Document each model with inline comments for clarity.
- Avoid over-fetching data; use lazy loading unless eager loading is required.
- Always use sessions to manage transactions and rollback on failure.

---

## System Architecture

### Flask Python Server

**Purpose in Our Architecture:**

Flask is a lightweight and flexible Python web framework used to build the backend server logic and routing. It handles HTTP requests, routes, and integrates with our database and services.

**Why We Use Flask:**

- Minimal and modular, ideal for microservices and REST APIs
- Easy integration with SQLAlchemy for ORM-based database access
- Supports Blueprints for modular architecture.
- Compatible with Docker and CI/CD pipelines
- Rich ecosystem of extensions (e.g., Flask-Login, Flask-Migrate, Flask-WTF)

### Team Standards for Flask Development

**Project Structure:**

The application follows a containerized REST API architecture with separated frontend and backend:

```text
codebase/
├── backend/                      # Flask backend (separate container)
│   ├── api/
│   │   ├── __init__.py           # Flask app factory and blueprint registration
│   │   ├── config.py             # Configuration settings
│   │   ├── controllers/          # API endpoints (Blueprints)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Authentication endpoints
│   │   │   ├── user_controller.py           # User management endpoints
│   │   │   └── fake_api.py       # Mock API endpoints
│   │   └── models/               # SQLAlchemy models & schemas
│   │       ├── __init__.py
│   │       ├── db.py             # Database and Marshmallow initialization
│   │       ├── user_model.py           # User model
│   ├── tests/                    # Unit and integration tests
│   │   ├── __init__.py
│   │   ├── conftest.py           # Pytest fixtures
│   │   ├── test_login.py         # Authentication tests
│   │   ├── test_user.py          # User management tests
│   │   └── test_model.py         # Model tests
│   ├── app.py                    # Container entrypoint
│   ├── requirements-dev.txt      # Development dependencies
│   └── requirements-ci.txt       # CI/CD dependencies
├── frontend/                     # React frontend (separate container)
├── docs/                         # Project documentation
└── docker-compose.yml            # Multi-container orchestration
```

**Blueprints:**

Use Flask Blueprints to separate concerns and organize routes by feature. All controllers live in `backend/api/controllers/`:

```python
# backend/api/controllers/user.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('user', __name__, url_prefix='/user')

@bp.route('/', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user information"""
    user_id = get_jwt_identity()
    # ... implementation
    return jsonify(user_data), 200
```

Register blueprints in `backend/api/__init__.py`:

```python
# backend/api/__init__.py
from flask import Flask
from .controllers import auth, user, member

def create_app(test_config=None):
    app = Flask(__name__)
    # ... configuration
    
    # Register blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(user.bp)
    app.register_blueprint(member.bp)
    
    return app
```

## 📋 Checklist for New Endpoints

When creating new protected endpoints:

- [ ] **Backend**: Use `@jwt_required()` decorator
- [ ] **Frontend**: Include `credentials: 'include'` in fetch options
- [ ] **Frontend**: Remove any `Authorization` headers
- [ ] **Tests**: Don't manually pass tokens - test_client handles it

## ⚠️ Important Notes

1. **CORS must be configured** properly for cookies to work across origins
2. **credentials: 'include'** must be in every authenticated request
3. **Production**: Set `JWT_COOKIE_SECURE=True` to require HTTPS

## 🔍 Debugging Tips

If auth isn't working:

1. Check browser DevTools → Network → Look for `Set-Cookie` header in login response
2. Verify `Cookie` header is sent in subsequent requests
3. Ensure `credentials: 'include'` is present in fetch options
4. Check CORS configuration allows credentials
5. Verify frontend and backend URLs match CORS whitelist

## Security Benefits of JWT in HTTPOnly Cookies

1. **XSS Protection**: HTTPOnly cookies cannot be accessed by JavaScript, preventing token theft via XSS attacks
2. **Automatic Cookie Management**: Browser handles cookie storage and sending automatically
3. **CSRF Protection**: SameSite=Lax provides basic CSRF protection
4. **Secure Flag**: Can be enabled in production to ensure cookies only sent over HTTPS

## Production Checklist

Before deploying to production, update these settings in `flask_backend/api/__init__.py`:

```python
JWT_COOKIE_SECURE = True  # Require HTTPS
JWT_COOKIE_CSRF_PROTECT = True  # Enable CSRF protection
JWT_COOKIE_SAMESITE = 'Strict'  # Stricter CSRF protection
SECRET_KEY = os.environ.get('SECRET_KEY')  # Use env var
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')  # Use env var
```

Also update CORS origins to match your production domain:

```python
CORS(app, 
     origins=['https://your-production-domain.com'],
     supports_credentials=True)
```

## Configuration Management

- Use environment variables for sensitive data (e.g., API keys, DB credentials)
- Separate config files for development, testing, and production
- Avoid hardcoding secrets in source code.

**Security Practices:**

- Disable debug mode in production.
- Use CSRF protection (e.g., Flask-WTF)
- Sanitize and validate all user inputs.
- Escape user-generated content to prevent XSS.
- Use secure session management.

**Testing & Quality Assurance:**

- Write unit tests using pytest.
- Include tests for routes, models, and services.
- Integrate tests into CI workflows via GitHub Actions

**Deployment Standards:**

- Use Gunicorn or uWSGI as production WSGI servers.
- Serve static files via Nginx.
- Containerize the app using Docker.
- Monitor logs and errors using centralized logging tools.
