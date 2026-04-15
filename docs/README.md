# Documentation Index

Welcome to the Peer Evaluation App documentation! This guide helps you find the right documentation for your needs.

---

## 🚀 For New Developers

Start here if you're new to this project:

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** (10 minutes)  
   Quick-start guide to get the app running on your machine. Covers prerequisites, installation, and verification.

2. **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** (15 minutes)  
   Understand what the app does, how users interact with it, and how data flows through the system.

3. **[CONTRIBUTING.md](CONTRIBUTING.md)** (20 minutes)  
   Learn the development workflow: how to pick tasks, create branches, write tests, submit PRs, and get code merged.

4. **[TESTING.md](TESTING.md)** (15 minutes)  
   How to write and run tests using pytest, including examples, fixtures, and best practices.

5. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** (Reference)  
   Solutions to common problems during setup, development, and testing. Bookmark this!

---

## 🎯 For Experienced Developers

If you already know the stack and want quick references:

### Development Workflow

- **[dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md)** — Git workflow, commit message conventions, CI/CD with GitHub Actions, Docker standards, SQLAlchemy best practices
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Branch naming, PR process, Definition of Done checklist
- **[dev-guidelines/ROLE_PERMISSION_SUMMARY.md](dev-guidelines/ROLE_PERMISSION_SUMMARY.md)** — Role-based access control (RBAC) for student/teacher/admin roles

### API & Architecture

- **[dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md)** — All 84 API endpoints with request/response formats
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** — System architecture, workflows, data flow diagrams
- **[schema/project-architecture.md](schema/project-architecture.md)** — Detailed architecture documentation

### Database

- **[schema/database-schema.md](schema/database-schema.md)** — Complete database schema with table definitions and relationships
- **[schema/database-schema.puml](schema/database-schema.puml)** — PlantUML diagram of database structure

### Testing

- **[TESTING.md](TESTING.md)** — Comprehensive testing guide with pytest examples
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — Test failure debugging strategies

### Deployment

- **[dev-guidelines/PRODUCTION_DEPLOYMENT.md](dev-guidelines/PRODUCTION_DEPLOYMENT.md)** — Production deployment guide for AWS, Azure, and GCP

---

## 📂 Component-Specific Documentation

### Backend (Flask)

- **[../flask_backend/README.md](../flask_backend/README.md)** — Flask backend setup, CLI commands, environment variables, running tests

Key files:
- `flask_backend/api/__init__.py` — Flask app factory, CORS, JWT config, blueprint registration
- `flask_backend/api/controllers/` — API endpoints (auth, user, admin, class)
- `flask_backend/api/models/` — SQLAlchemy models and Marshmallow schemas
- `flask_backend/tests/` — Pytest tests and fixtures

### Frontend (React)

- **[../frontend/README.md](../frontend/README.md)** — React frontend setup, dev server configuration, troubleshooting

Key files:
- `frontend/src/util/api.ts` — API client (BASE_URL configuration, fetch helpers)
- `frontend/src/util/login.ts` — Authentication helpers (getUserRole, isAdmin, isTeacher)
- `frontend/src/pages/` — Page components
- `frontend/src/components/` — Reusable UI components

---

## 🗺️ Recommended Reading Order

### For New Team Members (Day 1-3)

**Day 1: Get Running**

1. [GETTING_STARTED.md](GETTING_STARTED.md) — Follow quick-start guide
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Bookmark for when things break
3. [../flask_backend/README.md](../flask_backend/README.md) — Backend specifics
4. [../frontend/README.md](../frontend/README.md) — Frontend specifics

**Day 2: Understand the System**

1. [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — Big picture understanding
2. [schema/database-schema.md](schema/database-schema.md) — Database structure
3. [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md) — API overview
4. [dev-guidelines/ROLE_PERMISSION_SUMMARY.md](dev-guidelines/ROLE_PERMISSION_SUMMARY.md) — Security model

**Day 3: Development Workflow**

1. [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute code
2. [TESTING.md](TESTING.md) — How to write tests
3. [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) — Git, CI/CD, Docker, SQLAlchemy

### For Experienced Developers (1-2 Hours)

**Critical Reading (60 minutes):**

1. [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — 15 min — Business logic and workflows
2. [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md) — 10 min — API surface area
3. [schema/database-schema.md](schema/database-schema.md) — 10 min — Database relationships
4. [CONTRIBUTING.md](CONTRIBUTING.md) — 15 min — Development process
5. [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) — 10 min — Git workflow, commit conventions

**Optional Reading (60 minutes):**

1. [TESTING.md](TESTING.md) — 15 min — If writing tests
2. [dev-guidelines/PRODUCTION_DEPLOYMENT.md](dev-guidelines/PRODUCTION_DEPLOYMENT.md) — 20 min — If deploying
3. [dev-guidelines/ROLE_PERMISSION_SUMMARY.md](dev-guidelines/ROLE_PERMISSION_SUMMARY.md) — 10 min — If working on auth
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — 15 min — When stuck

---

## 📚 Document Summaries

### Getting Started & Onboarding

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick-start guide (10 min setup) | First thing, Day 1 |
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | System explanation, workflows, data flow | Day 1-2, before coding |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow (branch→PR→merge) | Day 2-3, before first PR |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common problems and solutions | When stuck, reference |

### Development

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [TESTING.md](TESTING.md) | How to write and run tests | Before writing tests |
| [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) | Git, CI/CD, Docker, SQLAlchemy | Day 2-3, workflow questions |
| [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md) | API endpoints reference | When working on API |
| [dev-guidelines/ROLE_PERMISSION_SUMMARY.md](dev-guidelines/ROLE_PERMISSION_SUMMARY.md) | RBAC (student/teacher/admin) | When working on auth |

### Architecture & Database

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [schema/database-schema.md](schema/database-schema.md) | Database tables and relationships | When working on models |
| [schema/project-architecture.md](schema/project-architecture.md) | Detailed architecture docs | Deep dive into design |
| [schema/database-schema.puml](schema/database-schema.puml) | Database diagram (PlantUML) | Visual learners |

### Deployment

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [dev-guidelines/PRODUCTION_DEPLOYMENT.md](dev-guidelines/PRODUCTION_DEPLOYMENT.md) | Deploy to AWS/Azure/GCP | Before deployment |
| [../flask_backend/README.md](../flask_backend/README.md) | Backend setup and config | Backend deployment |
| [../frontend/README.md](../frontend/README.md) | Frontend build and serve | Frontend deployment |

### Requirements & Planning

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [user_stories.md](user_stories.md) | Feature requirements (24 user stories) | Sprint planning |

---

## 🔍 Quick Answers (FAQ)

### "How do I get started?"

→ [GETTING_STARTED.md](GETTING_STARTED.md) — 10-minute quick start

### "What does this app do?"

→ [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — Business logic and workflows

### "How do I contribute code?"

→ [CONTRIBUTING.md](CONTRIBUTING.md) — Complete workflow from issue to merge

### "How do I write tests?"

→ [TESTING.md](TESTING.md) — Pytest patterns, fixtures, examples

### "Something broke, help!"

→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Common problems and solutions

### "What are all the API endpoints?"

→ [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md) — Complete API reference

### "How does authentication work?"

→ [dev-guidelines/ROLE_PERMISSION_SUMMARY.md](dev-guidelines/ROLE_PERMISSION_SUMMARY.md) — RBAC and JWT cookies

### "What's the database schema?"

→ [schema/database-schema.md](schema/database-schema.md) — Tables and relationships

### "How do I deploy this?"

→ [dev-guidelines/PRODUCTION_DEPLOYMENT.md](dev-guidelines/PRODUCTION_DEPLOYMENT.md) — Production deployment

### "How do I write a good commit message?"

→ [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) — Commit conventions and examples

---

## 🛠️ By Task Type

### I want to...

**Set up my development environment**  
→ [GETTING_STARTED.md](GETTING_STARTED.md) → [../flask_backend/README.md](../flask_backend/README.md) → [../frontend/README.md](../frontend/README.md)

**Understand the codebase**  
→ [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) → [schema/database-schema.md](schema/database-schema.md) → [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md)

**Fix a bug**  
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) → [TESTING.md](TESTING.md) → [CONTRIBUTING.md](CONTRIBUTING.md)

**Add a new feature**  
→ [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) → [CONTRIBUTING.md](CONTRIBUTING.md) → [TESTING.md](TESTING.md)

**Create a new API endpoint**  
→ [dev-guidelines/ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md) → [../flask_backend/README.md](../flask_backend/README.md) → [TESTING.md](TESTING.md)

**Add a database model**  
→ [schema/database-schema.md](schema/database-schema.md) → [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) (SQLAlchemy section) → [TESTING.md](TESTING.md)

**Write tests**  
→ [TESTING.md](TESTING.md) → [CONTRIBUTING.md](CONTRIBUTING.md) (Definition of Done)

**Submit a pull request**  
→ [CONTRIBUTING.md](CONTRIBUTING.md) → [dev-guidelines/dev-ops.md](dev-guidelines/dev-ops.md) (Git workflow)

**Deploy to production**  
→ [dev-guidelines/PRODUCTION_DEPLOYMENT.md](dev-guidelines/PRODUCTION_DEPLOYMENT.md) → [../flask_backend/README.md](../flask_backend/README.md) (environment variables)

---

## 📝 Documentation Standards

All documentation in this repository follows these conventions:

### Writing Style

- **Imperative mood** for instructions ("Run the command", not "You should run")
- **Active voice** over passive voice
- **Code examples** for all commands and API calls
- **Platform-specific** instructions for Windows/macOS/Linux when needed

### Structure

- **Table of contents** for docs over 200 lines
- **Headings** organized hierarchically (H1 → H2 → H3)
- **Code blocks** with language tags for syntax highlighting
- **Tables** for comparisons and reference data
- **Mermaid diagrams** for workflows and architecture

### Linking

- **Relative links** for internal docs (`[TESTING.md](TESTING.md)`)
- **Absolute links** for external resources (`https://...`)
- **Clear link text** (not "click here", but "see TESTING.md")

---

## 🤝 Contributing to Documentation

Found a typo? Documentation unclear? **Contributions welcome!**

1. **Small fixes**: Edit directly on GitHub (click pencil icon)
2. **Larger changes**: Follow [CONTRIBUTING.md](CONTRIBUTING.md) workflow

**Good candidates for improvement:**

- Missing examples or clarifications
- Outdated instructions (after code changes)
- Platform-specific issues not covered
- Common questions in discussions

**Documentation best practices:**

- Update docs when changing code (don't let them drift)
- Add examples for complex concepts
- Include troubleshooting for common pitfalls
- Link related docs (don't duplicate content)

---

## 📞 Getting Help

Still can't find what you need?

1. **Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** first
2. **Search existing GitHub Issues** — someone may have asked already
3. **Ask in team chat/Slack** — fast answers for quick questions
4. **Open a GitHub Issue** — for bugs or missing documentation

**When asking for help, include:**

- What you're trying to do
- What you tried
- Full error message (if any)
- Operating system
- Relevant versions (Python, Node.js, etc.)

---

## 📜 License

This documentation is part of the Peer Evaluation App project. See [../LICENSE](../LICENSE) for details.

---

**Last Updated:** April 14, 2026  
**Maintained By:** COSC470 Development Team
