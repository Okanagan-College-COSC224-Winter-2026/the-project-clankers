# Architecture Overview

## What is the Peer Evaluation App?

The Peer Evaluation App is an academic platform that enables **structured peer review and group evaluation** in educational settings. It allows instructors to create courses and assignments, organize students into groups, and facilitate anonymous peer evaluations using customizable rubrics.

### The Problem It Solves

In collaborative academic projects:
- **Instructors** struggle to assess individual contributions within group work
- **Students** need fair recognition for their efforts in team settings
- **Grading** becomes subjective without structured evaluation criteria
- **Accountability** suffers when individual contributions are unclear

This app provides a systematic, transparent way to evaluate peer contributions while maintaining anonymity and fairness.

---

## Core Concepts

### 1. **Users & Roles**

The system has three role types with hierarchical permissions:

```
┌─────────────────────────────────────────┐
│              ADMIN                      │
│  • Create teacher/admin accounts        │
│  • Manage all users                     │
│  • System-wide administration           │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│             TEACHER                     │
│  • Create courses & assignments         │
│  • Upload student rosters               │
│  • Create/manage groups                 │
│  • View all student work                │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│            STUDENT                      │
│  • Enroll in courses                    │
│  • Submit assignments                   │
│  • Peer review classmates               │
│  • View own feedback                    │
└─────────────────────────────────────────┘
```

### 2. **Courses**

- Created by teachers
- Contains multiple assignments
- Students enroll to gain access
- Scoped to a specific academic term/semester

### 3. **Assignments**

- Belong to a specific course
- Have due dates and submission requirements
- Can have associated rubrics for evaluation
- May be individual or group-based

### 4. **Groups**

- Assignment-specific student groupings
- Enable peer evaluation within teams
- Can be created manually or via roster upload
- Students see only their group members' work

### 5. **Rubrics**

- Define evaluation criteria for assignments
- Created by teachers
- Contain multiple criteria/questions
- Each criterion can be scored or comment-only
- Provide consistent evaluation standards

### 6. **Reviews**

- Student evaluations of peer work
- Anonymous to protect reviewer identity
- Scoped to specific assignments
- Structured by rubric criteria
- Include both scores and qualitative comments

---

## User Workflows

### Instructor Workflow

```mermaid
graph TD
    A[Create Course] --> B[Create Assignment]
    B --> C[Upload Student Roster]
    C --> D[Create/Auto-Assign Groups]
    D --> E[Create Rubric]
    E --> F[Students Submit Work]
    F --> G[Assign Peer Reviews]
    G --> H[Students Review Peers]
    H --> I[View Aggregated Results]
    I --> J[Grade & Provide Feedback]
```

**Detailed Steps:**

1. **Create Course** - Set up a new class (e.g., "COSC 470 Fall 2025")
2. **Create Assignment** - Define project requirements and due dates
3. **Upload Roster** - CSV upload creates student accounts and enrolls them
4. **Organize Groups** - Manual assignment or automatic grouping
5. **Create Rubric** - Define evaluation criteria (e.g., "Code Quality", "Communication", "Effort")
6. **Monitor Submissions** - Track who has submitted work
7. **Assign Reviews** - Decide who reviews whom (can be within groups or cross-group)
8. **Review Analytics** - See completion rates and scores
9. **Grade** - Combine peer feedback with instructor assessment

### Student Workflow

```mermaid
graph TD
    A[Login to Platform] --> B[View Enrolled Courses]
    B --> C[Select Assignment]
    C --> D[View Group Members]
    D --> E[Submit Work]
    E --> F[Receive Review Assignment]
    F --> G[Review Peer Work]
    G --> H[Submit Evaluation]
    H --> I[View Received Feedback]
```

**Detailed Steps:**

1. **Login** - Use credentials (provided by teacher or self-registration)
2. **Navigate to Course** - Access enrolled courses from dashboard
3. **View Assignment Details** - Read requirements, due dates, rubric
4. **Check Group** - See who you're working with
5. **Submit Work** - Upload submission or link to work
6. **Receive Peer Review Task** - Get notified of peers to evaluate
7. **Evaluate Peers** - Fill out rubric for assigned classmates (anonymous)
8. **View Feedback** - After review period, see what peers said about your work

---

## Data Flow Example

Let's trace a complete peer evaluation cycle:

### Setup Phase
```
Teacher creates:
  Course: "Software Engineering Fall 2025"
    ├── Assignment: "Group Project Sprint 1"
    ├── Rubric: [Code Quality, Communication, Effort]
    └── Groups: [Group A, Group B, Group C]

Students enrolled:
  Group A: Alice, Bob, Carol
  Group B: David, Emma, Frank
```

### Submission Phase
```
Students submit work:
  Alice ──→ Submission #1 (Group A work)
  Bob   ──→ Submission #2 (Group A work)
  Carol ──→ Submission #3 (Group A work)
  [etc. for Groups B and C]
```

### Review Phase
```
Teacher assigns reviews:
  Within Group A:
    Alice reviews → Bob & Carol
    Bob reviews   → Alice & Carol
    Carol reviews → Alice & Bob

Each review contains:
  ├── Criterion 1 (Code Quality):     Score: 4/5, Comments: "..."
  ├── Criterion 2 (Communication):    Score: 5/5, Comments: "..."
  └── Criterion 3 (Effort):           Score: 3/5, Comments: "..."
```

### Analysis Phase
```
System aggregates for Alice:
  Reviews received from: Bob, Carol
  Average scores:
    Code Quality:    (4 + 5) / 2 = 4.5
    Communication:   (5 + 4) / 2 = 4.5
    Effort:          (3 + 5) / 2 = 4.0

Teacher views:
  ├── Individual scores
  ├── Group averages
  └── Outliers/concerns flagged
```

---

## System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────┐
│           Web Browser (Client)               │
│  React SPA with React Router                 │
└──────────────┬───────────────────────────────┘
               │ HTTP/REST + JWT Cookies
               │
┌──────────────▼───────────────────────────────┐
│        Flask Backend (REST API)              │
│  ┌────────────────────────────────────────┐  │
│  │  Controllers (Blueprints)              │  │
│  │  ├── /auth  (login, register, logout) │  │
│  │  ├── /user  (profile management)      │  │
│  │  ├── /class (course management)       │  │
│  │  ├── /assignment (CRUD operations)    │  │
│  │  ├── /admin (user administration)     │  │
│  │  ├── /enrollments (enrollment flows)  │  │
│  │  ├── /submissions (file uploads)      │  │
│  │  ├── /groups (group management)       │  │
│  │  ├── /rubric (rubric creation)        │  │
│  │  ├── /review (peer reviews)           │  │
│  │  └── /gradebook (grades & policies)   │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                          │
│  ┌─────────────────▼──────────────────────┐  │
│  │  Business Logic Layer                  │  │
│  │  ├── JWT Authentication               │  │
│  │  ├── Role-Based Authorization         │  │
│  │  └── Data Validation (Marshmallow)    │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                          │
│  ┌─────────────────▼──────────────────────┐  │
│  │  Data Access Layer (SQLAlchemy ORM)   │  │
│  │  ├── User Model                       │  │
│  │  ├── Course Model                     │  │
│  │  ├── Assignment & AssignmentFile      │  │
│  │  ├── CourseGroup & GroupMembers       │  │
│  │  ├── Rubric & CriteriaDescription    │  │
│  │  ├── Review & Criterion              │  │
│  │  ├── StudentSubmission & Submission   │  │
│  │  ├── Gradebook & GradeOverride       │  │
│  │  ├── EnrollmentRequest               │  │
│  │  └── Notification & UserCourse       │  │
│  └─────────────────┬──────────────────────┘  │
└────────────────────┼────────────────────────┘
                     │ SQL Queries
                     │
┌────────────────────▼────────────────────────┐
│       Relational Database                   │
│  SQLite (dev) / PostgreSQL (production)     │
└─────────────────────────────────────────────┘
```

### Key Design Principles

**Separation of Concerns:**
- **Controllers** handle HTTP requests/responses, delegating to business logic
- **Models** encapsulate data and database operations
- **Schemas** validate and serialize data between layers

**RESTful API:**
- Stateless design (JWT for authentication)
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON for data exchange
- HTTPOnly cookies for secure token storage

**Role-Based Access Control:**
- Enforced at the controller level via decorators
- Database stores role with user record
- Permissions checked before any protected operation

---

## Authentication & Security Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. POST /auth/login {email, password}
       │
┌──────▼──────────────────────────────────┐
│  Backend                                │
│  ├─ Validate credentials                │
│  ├─ Generate JWT token                  │
│  ├─ Set HTTPOnly cookie                 │
│  └─ Return user info {role, id, name}   │
└──────┬──────────────────────────────────┘
       │
       │ 2. Frontend stores role in memory
       │    Browser stores JWT in HTTPOnly cookie
       │
┌──────▼──────┐
│  Frontend   │ 3. For protected routes:
└──────┬──────┘    GET /user/profile
       │           (credentials: 'include')
       │
┌──────▼──────────────────────────────────┐
│  Backend                                │
│  ├─ Read JWT from cookie                │
│  ├─ Verify signature & expiration       │
│  ├─ Extract user identity                │
│  ├─ Check role permissions              │
│  └─ Execute request or return 401/403   │
└─────────────────────────────────────────┘
```

**Security Features:**
- JWT tokens in HTTPOnly cookies (not accessible to JavaScript)
- CSRF protection in production
- Password hashing (Werkzeug SHA-256)
- Role-based endpoint protection
- Secure cookie flags in production (HTTPS-only, SameSite)

---

## Database Relationships

```
User ──────────┬──── Course (as teacher)
               │
               ├──── User_Course (enrollment)
               │
               ├──── Group_Members (group membership)
               │
               ├──── Submission (work submitted)
               │
               └──── Review (as reviewer/reviewee)

Course ────────┼──── Assignment
               │
               └──── User_Course (enrollments)

Assignment ────┼──── CourseGroup (groups)
               │
               ├──── Submission (student work)
               │
               ├──── Review (peer evaluations)
               │
               └──── Rubric (evaluation criteria)

Rubric ────────┼──── Criteria_Description (rubric rows)

Review ────────┼──── Criterion (filled-in rubric responses)
               │
               └──── Links: Reviewer + Reviewee (both Users)

CourseGroup ───┼──── Group_Members (who's in this group)
```

**Key Relationships:**
- **One-to-Many**: Course → Assignments, Rubric → Criteria
- **Many-to-Many**: Users ↔ Courses (via User_Course), Users ↔ Groups (via Group_Members)
- **Three-Way**: Review links Assignment + Reviewer + Reviewee

See [database-schema.md](schema/database-schema.md) for complete details.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI components and routing |
| | Vite | Fast dev server and build tool |
| | React Router | Client-side navigation |
| **Backend** | Flask 3.x | REST API framework |
| | SQLAlchemy | ORM for database operations |
| | Flask-JWT-Extended | JWT token management |
| | Marshmallow | Data validation and serialization |
| **Database** | SQLite (dev) | Lightweight local development |
| | PostgreSQL (prod) | Production-grade relational DB |
| **Dev Tools** | pytest | Backend testing |
| | GitHub Actions | CI/CD pipelines |
| | Docker | Containerization |

---

## Current Implementation Status

The application supports the following core workflows:

- **Authentication & User Management**: Registration, login/logout, password management, profile pictures, role-based access control
- **Course Management**: Create/archive/hide courses, enrollment requests, roster CSV upload
- **Assignment Management**: Create/edit/delete assignments, file attachments, due dates
- **Group Management**: Create groups per course, assign/remove members, view unassigned students
- **Rubric System**: Create rubrics with multiple criteria and scoring descriptions
- **Peer Reviews**: Submit reviews, view received/submitted reviews, review targets per assignment
- **Student Submissions**: File upload/download for assignments
- **Gradebook**: Grade policies, grade overrides, course total overrides, student grade views
- **Notification System**: Enrollment request notifications

### Planned Enhancements

- Advanced analytics dashboards with visualization
- Automated peer review assignment algorithms
- Mobile responsive UI improvements

See [user_stories.md](user_stories.md) for complete feature roadmap.

---

## Next Steps

Now that you understand the architecture:

1. **Explore the Code**: Start with `flask_backend/api/__init__.py` and `frontend/src/App.tsx`
2. **Review API Docs**: See [ENDPOINT_SUMMARY.md](dev-guidelines/ENDPOINT_SUMMARY.md)
3. **Understand Workflows**: Read [CONTRIBUTING.md](CONTRIBUTING.md) for development process
4. **Run Tests**: Check [TESTING.md](TESTING.md) to understand test patterns

---

**Questions about the architecture?** Check other documentation or ask the team!
