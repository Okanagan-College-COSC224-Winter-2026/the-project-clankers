# Contributing to Peer Evaluation App

Welcome! This guide will help you understand how to contribute code to the project effectively.

---

## 📋 Table of Contents

- [Getting Set Up](#getting-set-up)
- [Finding Work](#finding-work)
- [Development Workflow](#development-workflow)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Making Changes](#making-changes)
- [Testing Requirements](#testing-requirements)
- [Creating a Pull Request](#creating-a-pull-request)
- [Code Review Process](#code-review-process)
- [Merge Procedures](#merge-procedures)
- [Definition of Done](#definition-of-done)
- [Commit Message Guidelines](#commit-message-guidelines)

---

## 🚀 Getting Set Up

Before you start contributing:

1. **Complete the setup**: Follow [GETTING_STARTED.md](GETTING_STARTED.md) to get the app running locally
2. **Verify tests pass**: Run `pytest` in `flask_backend/` to ensure your environment is working
3. **Configure Git**: Set your name and email if you haven't already
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

---

## 🔍 Finding Work

### 1. Check GitHub Issues

Browse the [GitHub Issues](https://github.com/COSC470Fall2025/Peer-Evaluation-App-V1/issues) page for:
- Issues labeled `good-first-issue` (great for new contributors)
- Issues labeled `help-wanted` (open for anyone to pick up)
- Issues assigned to you (if you're on the team)

### 2. Review the User Stories

Check [docs/user_stories.md](user_stories.md) for features marked as:
- **Backlog** - Not yet started, available to implement
- **In-Progress** - Partially complete, may need finishing touches

### 3. Discuss Before Starting

**Before picking up an issue:**
1. Comment on the issue expressing interest
2. Wait for acknowledgment from maintainers (avoids duplicate work)
3. Ask clarifying questions if requirements are unclear

### 4. Self-Assign

Once approved, assign the issue to yourself or ask a maintainer to assign it.

---

## 🌿 Development Workflow

### Step-by-Step Process

```
1. Create branch → 2. Make changes → 3. Write tests → 4. Run tests → 5. Commit → 6. Push → 7. Open PR → 8. Code review → 9. Merge
```

### Detailed Steps

#### 1. Create a Feature Branch

Always branch from the latest `dev` branch:

```bash
# Make sure you're on dev
git checkout dev

# Pull latest changes
git pull origin dev

# Create your feature branch
git checkout -b feature/add-rubric-creation
```

#### 2. Make Your Changes

- Edit code in `flask_backend/` or `frontend/`
- Follow existing code patterns and conventions
- Keep changes focused on the issue you're solving
- Don't mix unrelated changes in one branch

#### 3. Write Tests

**For backend changes:**
- Add tests in `flask_backend/tests/`
- Name test files `test_<feature>.py`
- Write tests BEFORE or alongside implementation (TDD encouraged)

**For frontend changes:**
- Frontend testing setup is pending (currently manual testing only)
- Manually verify UI changes in browser

#### 4. Run Tests Locally

**Backend tests (required):**
```bash
cd flask_backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pytest tests/ -v
```

**All tests must pass before opening a PR.**

#### 5. Commit Your Changes

```bash
# Stage your changes
git add <files>

# Commit with descriptive message
git commit -m "feat(rubrics): add rubric creation endpoint"
```

See [Commit Message Guidelines](#commit-message-guidelines) below.

#### 6. Push to GitHub

```bash
git push origin feature/add-rubric-creation
```

---

## 🏷️ Branch Naming Conventions

Use this format: `<type>/<short-description>`

### Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New features or enhancements | `feature/add-review-submission` |
| `fix/` | Bug fixes | `fix/auth-cookie-expiration` |
| `docs/` | Documentation only | `docs/update-api-endpoints` |
| `refactor/` | Code restructuring | `refactor/user-model-queries` |
| `test/` | Adding/updating tests | `test/add-assignment-tests` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

### Branch Naming Examples

✅ **Good:**
- `feature/csv-roster-upload`
- `fix/login-redirect-loop`
- `docs/add-troubleshooting-guide`
- `test/add-group-model-tests`

❌ **Bad:**
- `johns-branch` (not descriptive)
- `fix-bug` (too vague)
- `FEATURE_new_thing` (wrong format)
- `update` (no context)

---

## 💻 Making Changes

### Code Style Guidelines

**Python (Backend):**
- Follow PEP 8 style guide
- Use meaningful variable/function names
- Add docstrings to functions and classes
- Maximum line length: 120 characters
- Use type hints where helpful

**TypeScript (Frontend):**
- Use TypeScript types (avoid `any`)
- Follow existing component patterns
- Use functional components with hooks
- Use meaningful prop names

### File Organization

**When adding new backend endpoints:**
1. Add route handler in appropriate controller (`flask_backend/api/controllers/`)
2. Add/update model if needed (`flask_backend/api/models/`)
3. Add Marshmallow schema for serialization
4. Update API documentation (`docs/dev-guidelines/ENDPOINT_SUMMARY.md`)

**When adding new frontend pages:**
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Update navigation if needed (`frontend/src/components/Sidebar.tsx`)

---

## ✅ Testing Requirements

### What Requires Tests

All backend code must have tests:
- ✅ New API endpoints
- ✅ New model methods
- ✅ Authentication/authorization logic
- ✅ Data validation
- ✅ Database operations

### Test Coverage Expectations

- **Minimum**: All happy paths must be tested
- **Preferred**: Happy paths + error cases + edge cases
- **Required**: Tests must pass before PR approval

### Writing Good Tests

**Test Structure (AAA Pattern):**
```python
def test_create_assignment_success(test_client, make_admin):
    # ARRANGE - Set up test data
    make_admin(email="teacher@example.com", password="pass123")
    test_client.post("/auth/login", json={"email": "teacher@example.com", "password": "pass123"})
    
    # ACT - Perform the action
    response = test_client.post("/assignment/create_assignment", json={
        "courseID": 1,
        "name": "Essay Assignment"
    })
    
    # ASSERT - Verify the outcome
    assert response.status_code == 201
    assert response.json["msg"] == "Assignment created"
```

**Test Naming:**
- Use descriptive names: `test_<feature>_<scenario>`
- Examples: `test_login_with_valid_credentials`, `test_create_class_without_name_fails`

See [TESTING.md](TESTING.md) for comprehensive testing guide.

---

## 🔃 Creating a Pull Request

### Before Opening a PR

**Checklist:**
- [ ] All tests pass locally (`pytest`)
- [ ] Code follows style guidelines
- [ ] No sensitive data (passwords, API keys) in code
- [ ] Commits have clear messages
- [ ] Branch is up to date with `dev`

### Update Your Branch

If `dev` has changed since you branched:

```bash
# Get latest dev changes
git checkout dev
git pull origin dev

# Merge into your branch
git checkout feature/your-feature
git merge dev

# Resolve any conflicts, then:
git add .
git commit -m "merge: resolve conflicts with dev"
git push origin feature/your-feature
```

### Open the PR

1. Go to [GitHub Repository](https://github.com/COSC470Fall2025/Peer-Evaluation-App-V1)
2. Click **"Pull Requests"** → **"New Pull Request"**
3. Select base: `dev` ← compare: `feature/your-feature`
4. Fill out the PR template:

**PR Title Format:**
```
<type>(<scope>): <short description>
```

**Examples:**
- `feat(assignments): add rubric creation endpoint`
- `fix(auth): resolve cookie expiration issue`
- `docs(contributing): add testing guidelines`

**PR Description Template:**
```markdown
## Description
Brief explanation of what this PR does.

## Related Issue
Closes #123

## Changes Made
- Added rubric creation endpoint
- Updated database schema
- Added tests for rubric model

## Testing Done
- [ ] All existing tests pass
- [ ] Added new tests for feature
- [ ] Manually tested in browser

## Screenshots (if UI changes)
[Attach screenshots if applicable]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No merge conflicts
```

---

## 👀 Code Review Process

### What to Expect

1. **Automated Checks**: GitHub Actions will run tests automatically
2. **Peer Review**: One team member must approve your PR
3. **Feedback**: Reviewers may request changes
4. **Discussion**: Use PR comments to discuss implementation

### Responding to Feedback

**When reviewers request changes:**

1. **Address each comment**: Make the requested changes or explain why not
2. **Push updates**: Commit and push changes to the same branch
   ```bash
   git add <files>
   git commit -m "fix: address review feedback"
   git push origin feature/your-feature
   ```
3. **Respond to comments**: Mark conversations as resolved when addressed
4. **Request re-review**: After all changes, request another review

### Review Standards

Reviewers check for:
- ✅ Tests pass (automated)
- ✅ Code follows conventions
- ✅ Logic is correct and efficient
- ✅ Documentation is updated
- ✅ No security issues
- ✅ Changes align with issue requirements

---

## 🔀 Merge Procedures

### When PRs Get Merged

PRs can be merged when:
- ✅ All automated tests pass
- ✅ At least 1 approval from team member
- ✅ No unresolved conversations
- ✅ Branch is up to date with `dev`
- ✅ No merge conflicts

### Merge Strategy

**We use Squash and Merge:**
- All your commits are combined into one clean commit
- Commit message becomes PR title
- Keeps `dev` branch history clean

**After Your PR is Merged:**

1. **Delete your branch**:
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d feature/your-feature
   ```

2. **Update your local `dev`**:
   ```bash
   git pull origin dev
   ```

3. **Close the related issue** (if not auto-closed)

---

## ✅ Definition of Done

A feature is considered "Done" when:

### Code Quality
- [ ] Code follows project conventions and style guide
- [ ] No linting errors
- [ ] No commented-out code or debug statements
- [ ] Meaningful variable and function names

### Testing
- [ ] Unit tests written for new code
- [ ] All tests pass locally
- [ ] All tests pass in CI/CD
- [ ] Edge cases considered and tested

### Documentation
- [ ] Code has comments explaining complex logic
- [ ] API endpoints documented in ENDPOINT_SUMMARY.md
- [ ] README updated if new dependencies added
- [ ] User-facing features documented if applicable

### Functionality
- [ ] Feature works as described in issue
- [ ] No new bugs introduced
- [ ] Tested in multiple browsers (for frontend)
- [ ] Tested on different OS if applicable (Windows, macOS, Linux)

### Review & Merge
- [ ] Pull request created with clear description
- [ ] At least 1 peer review approval
- [ ] All reviewer feedback addressed
- [ ] CI/CD pipeline passes
- [ ] Branch merged and deleted

---

## 📝 Commit Message Guidelines

### Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | Use For | Example |
|------|---------|---------|
| `feat` | New feature | `feat(rubrics): add rubric creation` |
| `fix` | Bug fix | `fix(auth): resolve login redirect` |
| `docs` | Documentation | `docs(api): update endpoint docs` |
| `style` | Code formatting | `style(backend): fix indentation` |
| `refactor` | Code restructuring | `refactor(models): simplify queries` |
| `test` | Adding/updating tests | `test(assignments): add edge cases` |
| `chore` | Maintenance | `chore(deps): update Flask to 3.1` |

### Scope (Optional)

Indicates which part of the codebase:
- `auth` - Authentication/authorization
- `assignments` - Assignment features
- `classes` - Course management
- `rubrics` - Rubric features
- `models` - Database models
- `api` - API endpoints
- `frontend` - Frontend components
- `tests` - Test files

### Examples

**Good commit messages:**
```
feat(assignments): add due date validation
fix(auth): prevent expired token use
docs(readme): add troubleshooting section
test(classes): add test for duplicate class names
refactor(models): extract user role logic to helper method
```

**Bad commit messages:**
```
updated stuff
fix bug
WIP
test
changes
```

### Writing the Body (Optional)

Use the body to explain **why**, not **what** (the diff shows what):

```
fix(auth): prevent login with deleted user accounts

The login endpoint was not checking if a user account
was soft-deleted, allowing authentication with inactive
accounts. This adds a check for the 'is_active' flag
before generating JWT tokens.

Closes #234
```

### Footer (Reference Issues)

Link commits to issues:

```
feat(groups): add automatic group assignment

Closes #45
Relates to #44, #46
```

---

## 🚫 What NOT to Commit

Never commit:
- ❌ Passwords or API keys
- ❌ `.env` files with secrets
- ❌ Database files (`*.sqlite`, `*.db`)
- ❌ Virtual environment folders (`venv/`, `node_modules/`)
- ❌ IDE-specific files (`.vscode/`, `.idea/`)
- ❌ Compiled files (`*.pyc`, `__pycache__/`)
- ❌ Large binary files
- ❌ Personal notes or TODO comments

**Check `.gitignore` before committing!**

---

## 🆘 Getting Help

**Stuck or have questions?**

1. **Check existing documentation**: [docs/](README.md)
2. **Search closed issues**: Someone may have had the same question
3. **Ask in PR comments**: Tag maintainers with `@username`
4. **Create a discussion**: Use GitHub Discussions for general questions
5. **Ask the team**: Reach out via your team communication channel

---

## 📚 Additional Resources

- **Testing Guide**: [TESTING.md](TESTING.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Architecture**: [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)
- **API Reference**: [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md)
- **Database Schema**: [schema/database-schema.md](schema/database-schema.md)

---

**Thank you for contributing!** 🎉

Your work helps make this project better for everyone. If you have suggestions to improve this guide, open an issue or PR!
