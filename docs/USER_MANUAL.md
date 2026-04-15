# Peer Evaluation App — User Manual

A web-based peer evaluation system that enables students to submit assignments, review each other's work using structured rubrics, and track their academic progress. Teachers create courses and assignments, manage enrollment, build rubrics, and oversee grading. Admins manage users across the platform.

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Registering an Account](#registering-an-account)
  - [Logging In](#logging-in)
  - [Changing Your Password](#changing-your-password)
  - [Your Profile](#your-profile)
- [Navigation](#navigation)
- [Student Guide](#student-guide)
  - [Dashboard](#student-dashboard)
  - [Browsing & Joining Courses](#browsing--joining-courses)
  - [Viewing Assignments](#viewing-assignments)
  - [Submitting Work](#submitting-work)
  - [Peer Reviews](#peer-reviews)
  - [Viewing Grades](#viewing-grades)
- [Teacher Guide](#teacher-guide)
  - [Dashboard](#teacher-dashboard)
  - [Creating a Course](#creating-a-course)
  - [Managing Enrollment](#managing-enrollment)
  - [Creating Assignments](#creating-assignments)
  - [Managing Groups](#managing-groups)
  - [Creating Rubrics](#creating-rubrics)
  - [Viewing Student Submissions](#viewing-student-submissions)
  - [Gradebook](#gradebook)
  - [Grade Policy & Overrides](#grade-policy--overrides)
  - [Course Settings](#course-settings)
- [Admin Guide](#admin-guide)
  - [Creating Teacher Accounts](#creating-teacher-accounts)
  - [Managing Users](#managing-users)
  - [Importing Students via CSV](#importing-students-via-csv)
- [CLI Commands (Server Administration)](#cli-commands-server-administration)

---

## Getting Started

### Registering an Account

1. Navigate to the application URL.
2. Click **Register** on the login page.
3. Fill in your **name**, **email**, and **password**.
   - Passwords must meet the displayed criteria (minimum length, character requirements).
   - Confirm your password in the second field.
4. Click **Register**. You will be redirected to the login page.

> **Note:** Self-registration creates a **student** account. Teacher and admin accounts are created by an administrator.

### Logging In

1. Navigate to the application URL.
2. Enter your **email** and **password**.
3. Click **Login**.
4. You will be redirected to your **Dashboard**.

If your account was created by an administrator or teacher (e.g., via CSV import), you may be prompted to change your temporary password on first login.

### Changing Your Password

**Voluntary:** From any page, navigate to **My Info** in the sidebar, then click **Change Password**.

**Forced (first login with temporary password):** You will be automatically redirected to the password change form after login. You must set a new password before accessing the application.

To change your password:
1. Enter your **current password**.
2. Enter your **new password** (must meet displayed criteria).
3. Confirm the new password.
4. Click **Change Password**.

### Your Profile

Navigate to **My Info** in the sidebar to view and manage your profile.

- **Profile Picture:** Click your avatar to upload a new photo (PNG, JPG, GIF, or WebP).
- **Information Displayed:** Name, email, role, and list of enrolled courses.
- **Change Password:** Button at the bottom of the profile page.

You can view other users' profiles by clicking their name throughout the application (read-only).

---

## Navigation

The sidebar provides role-specific navigation:

| Menu Item | Student | Teacher | Admin |
|-----------|---------|---------|-------|
| Dashboard | ✓ | ✓ | ✓ |
| Browse Courses | ✓ | — | — |
| My Grades | ✓ | — | — |
| My Info | ✓ | ✓ | ✓ |
| Manage Users | — | — | ✓ |
| Notification Bell | — | ✓ | — |
| Logout | ✓ | ✓ | ✓ |

**Teachers** also see a notification bell icon that shows the count of pending enrollment requests. It polls for updates every 30 seconds.

---

## Student Guide

### Student Dashboard

The Dashboard (`/home`) displays all your enrolled courses as cards showing:

- Course name
- Number of assignments
- Number of students enrolled
- Next upcoming due date
- Number of pending peer reviews
- Your current course grade

Click a course card to open that course's home page.

### Browsing & Joining Courses

1. Click **Browse Courses** in the sidebar.
2. A list of all available courses is displayed.
3. Click **Request to Join** on the course you want.
4. Your request is sent to the course teacher for approval.
5. The enrollment status is shown on each course card (e.g., "Pending", "Enrolled").
6. Once approved, the course appears on your Dashboard.

### Viewing Assignments

1. Open a course from the Dashboard.
2. The **Home** tab lists all assignments with their names, due dates, and status.
3. Click an assignment to view its details:
   - Assignment description
   - Start date, due date, and time remaining
   - Peer review dates (if applicable)
   - Instructor-uploaded files (if any)

Use the tabs at the top of an assignment page to navigate between:
- **Home** — Assignment details
- **Members** — Class member list
- **Submission** — Submit your work
- **Peer Reviews** — Review classmates' work

### Submitting Work

1. Open an assignment and go to the **Submission** tab.
2. Upload a file and/or enter a text submission.
3. Click **Submit**.

You can **edit** or **delete** your submission before the deadline:
- To update, modify the text or replace the uploaded file and resubmit.
- To delete, click the delete button on your existing submission.

For **group assignments**, one submission covers the entire group.

### Peer Reviews

Peer reviews become available after the peer review start date set by the teacher.

1. Open an assignment and go to the **Peer Reviews** tab.
2. The system checks that you have submitted your own work before allowing reviews.
3. Choose a review target:
   - **Internal Review** (group assignments): Review a member within your group.
   - **External Review**: Review a student or group outside your own group.
4. View the target's submission (files and/or text).
5. For each rubric criterion:
   - Enter a **grade** (0 up to the maximum score for that criterion).
   - Optionally add a **comment**.
6. Click **Submit Review**.

You can update a submitted review later. A summary of reviews you have **submitted** and **received** is displayed on this tab.

### Viewing Grades

**Per-Course Grades:**
1. Open a course and click the **Grades** tab.
2. View your grades for each assignment, including:
   - Submission status
   - Peer evaluation completion
   - Computed grade, any applied penalties, and effective grade
   - Teacher overrides (if any)

**All-Course Grades (My Grades):**
1. Click **My Grades** in the sidebar.
2. View an aggregated summary across all courses:
   - Course totals and letter grades (A+ through F)
   - GPA calculation
   - Expandable per-assignment breakdowns
3. Click **Export to CSV** to download your grades.

---

## Teacher Guide

### Teacher Dashboard

The Dashboard displays all your courses as cards. From here you can:

- Click a course to manage it.
- Click **Create Class** to add a new course.
- View and **restore archived courses**.
- **Hide/unhide** courses from the active list.

### Creating a Course

1. Click the **Create Class** card on the Dashboard.
2. Enter a **class name**.
3. Click **Create**.
4. The course is created and appears on your Dashboard.

### Managing Enrollment

Navigate to a course and click the **Members** tab. Click **Manage Enrollment** to access three enrollment methods:

#### CSV Roster Upload
1. Click the **CSV** tab in the enrollment panel.
2. Upload a CSV file with columns: `student_id`, `name`, `email`.
3. The system automatically:
   - Creates new student accounts (with temporary passwords) for emails not yet registered.
   - Enrolls existing students into the course.
4. New students will be prompted to change their password on first login.

#### Add Registered Students
1. Click the **Registered** tab.
2. Search for existing students by name or email.
3. Select the students you want to add.
4. Click **Enroll Selected**.

#### Approve Join Requests
1. Click the **Requests** tab (or use the notification bell in the sidebar).
2. View pending enrollment requests from students.
3. Click **Approve** or **Reject** for each request.

To **remove a student** from the course, click the remove button next to their name on the Members page.

### Creating Assignments

1. Open a course and go to the **Home** tab.
2. Click **Create Assignment**.
3. Fill in the assignment details:
   - **Name** — Assignment title
   - **Description** — Instructions for students
   - **Submission Type** — Individual or Group
   - **Start Date** — When the assignment becomes visible
   - **Due Date** — Submission deadline
   - **Peer Review Start Date** — When peer reviews open
   - **Peer Review Due Date** — Peer review deadline
   - **Internal Review** — Toggle reviews between group members
   - **External Review** — Toggle reviews of students outside the group
   - **Anonymous Review** — Toggle whether reviewer identities are hidden
4. Click **Create**.

To **edit** or **delete** an assignment, open it and go to the **Manage** tab.

You can also **upload instructor files** (e.g., rubrics, instructions, starter code) from the assignment home page.

### Managing Groups

#### Course-Level Groups
1. Navigate to a course and click **Members**, then open the group management panel.
2. **Create** groups by name.
3. **Drag and drop** students between groups and the unassigned pool.
4. **Rename** or **delete** groups as needed.

#### Assignment-Level Groups
1. Open an assignment and go to the **Groups** tab.
2. Create groups for this specific assignment.
3. Use **Randomize** to automatically assign students to groups (Fisher-Yates shuffle).
4. Drag and drop to manually adjust assignments.

### Creating Rubrics

1. Open an assignment and go to the **Rubric** tab.
2. Click **Add Criterion** to add evaluation criteria. For each criterion, configure:
   - **Question** — What is being evaluated
   - **Max Score** — Maximum points for this criterion
   - **Comments** — Enable/disable comment field for reviewers
   - **Scoring** — Enable/disable numeric scoring
   - **Description** — Additional guidance for reviewers
   - **Criteria Type** — Who uses this criterion:
     - *Internal only* — Only for intra-group reviews
     - *External only* — Only for cross-group reviews
     - *Both* — Used in all reviews
3. Click **Save Rubric**.

Students will see the rubric criteria when performing peer reviews.

### Viewing Student Submissions

1. Open an assignment and go to the **Student Submissions** tab.
2. View all submissions with status indicators:
   - **Submitted** — On time
   - **Submitted Late** — After the due date
   - **Not Submitted** — No submission received
3. Click on a submission to view or download it.

You can also view submissions from the **Class Student Submissions** page for a course-wide overview across all assignments.

### Gradebook

#### Class Gradebook
1. Open a course and click the **Grades** tab.
2. View the full gradebook matrix: all students (rows) × all assignments (columns).
3. Each cell shows the student's grade for that assignment.
4. Click a **student name** to open a detailed grade breakdown dialog.
5. Click an **assignment column header** to view the assignment-specific gradebook.
6. View aggregate statistics: submitted/late/missing counts, class averages.

#### Assignment Gradebook
1. Open an assignment and go to the **Gradebook** tab.
2. View per-student submission status and grades for that assignment.

### Grade Policy & Overrides

#### Setting Grade Policy
1. Open the course **Grades** tab.
2. Click the grade policy editor.
3. Configure:
   - **Late Penalty %** — Percentage deducted from grades for late submissions.
   - **Incomplete Evaluation Penalty %** — Percentage deducted when a student does not complete all required peer evaluations.
4. Save the policy. It applies to all assignments in the course.

#### Grade Overrides
From the class gradebook, you can override grades at two levels:

- **Assignment Grade Override:** Click the edit icon on a student's assignment grade. Enter the override grade and a reason. The override replaces the computed grade.
- **Course Total Override:** Override a student's overall course grade with a manual value and reason.

Overrides are clearly marked in the gradebook so both teachers and students can see when a grade has been manually adjusted.

### Course Settings

1. Open a course and click the **Settings** tab.
2. Available options:
   - **Rename Course** — Update the displayed course name.
   - **View Stats** — See enrollment count and assignment count.
   - **Archive Course** — Removes the course from the active Dashboard list. Can be restored later from the archived courses view.
   - **Delete Course** — Permanently deletes the course and all associated data. Requires confirmation.

---

## Admin Guide

Admins have all teacher capabilities plus platform-wide user management.

### Creating Teacher Accounts

1. Navigate to **Manage Users** in the sidebar (or use the direct link at `/admin/create-teacher`).
2. Enter the teacher's **name**, **email**, and a **temporary password**.
3. Click **Create**.
4. The teacher will be prompted to change their password on first login.

### Managing Users

1. Navigate to **Manage Users** in the sidebar.
2. The user management page provides:
   - **Search** — Filter users by name, email, student ID, or role.
   - **Create User** — Add a user with any role (student, teacher, or admin). Optionally set the `must_change_password` flag.
   - **Edit User** — Modify name, email, role, or student ID.
   - **Change Password** — Set a new password for any user.
   - **Delete User** — Remove a user from the system.
3. Results are paginated for large user lists.

> **Note:** Admins cannot delete or demote their own account.

### Importing Students via CSV

1. Navigate to **Manage Users**.
2. Click **Import Students**.
3. Upload a CSV file with columns: `student_id`, `name`, `email`.
4. The system creates student accounts with temporary passwords for each entry.
5. New students will be prompted to change their password on first login.

---

## CLI Commands (Server Administration)

These commands are run from the `flask_backend/` directory with the virtual environment activated.

| Command | Description |
|---------|-------------|
| `flask init_db` | Create all database tables. |
| `flask drop_db` | Drop all database tables (prompts for confirmation). |
| `flask add_users` | Add 3 sample users: student, teacher, and admin (all with password `123456`). |
| `flask create_admin` | Interactively create an admin account (prompts for name, email, password). |
| `flask ensure_admin` | Create/update admin from environment variables (`DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`). Safe to run repeatedly. |
| `flask add_sample_courses` | Add sample courses with example assignments (assigned to teacher@example.com). |
| `flask migrate_add_start_date` | Migration: adds `start_date` column to the Assignment table for existing databases. |
