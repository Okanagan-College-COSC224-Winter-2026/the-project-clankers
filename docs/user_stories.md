# User Stories

<!-- markdownlint-disable MD024 -->

## US1 – Automated Peer Evaluation — **Backlog**

**As a student, I want peer evaluations to be automatically assigned to me for all students in my group (including myself), so that I can evaluate every member's contribution without the instructor manually assigning reviews.**

### Assumptions and Details

- User is signed in with valid credentials  
- User is enrolled in a class and assigned to a group  
- Instructor has created the assignment and enabled peer evaluation  
- Peer evaluations are automatically generated for every student in the group (including self-evaluation)  
- Instructor has set a peer evaluation deadline on the assignment  
- The evaluation scope (own group vs. other groups) is configured by the instructor (see US2)  

### Capabilities and Acceptance Criteria

- [ ] When an instructor enables peer evaluation on an assignment, reviews are automatically created for every student in the relevant group(s)  
- [ ] Each student is assigned to evaluate **all** group members, including themselves (self-evaluation)  
- [ ] Student can view a list of peers they need to evaluate for each assignment  
- [ ] Opening a peer evaluation shows the peer's submission and the rubric to score against  
- [ ] Submitting a completed evaluation marks that review as done and triggers a grade update (see US20)  
- [ ] Students **cannot assign or modify grades directly** — only the instructor can adjust final grades (see US5)  
- [ ] The peer evaluation deadline is clearly displayed on the assignment  
- [ ] If the peer evaluation deadline has passed, the student cannot submit and sees a clear notification  
- [ ] A submission confirmation popup appears before the evaluation is finalized  

---

## US2 – Group Contribution Evaluation (Own Group or Other Groups) — **Backlog**

**As a student, I want to evaluate my peers' contributions in group projects — either within my own group or across other groups as configured by the instructor — so that individual efforts are recognized fairly.**

### Assumptions and Details

- User is signed in with valid credentials  
- User is assigned to a course-level group (see US28)  
- Instructor has enabled peer evaluation and configured the evaluation scope:  
  - **Intra-group**: students evaluate members of their own group (including themselves)  
  - **Inter-group**: students evaluate members of other groups  
- Review period is active (before the peer evaluation deadline)  

### Capabilities and Acceptance Criteria

- [ ] Student can see a list of peers they must evaluate, based on the instructor's scope setting  
- [ ] If scope is intra-group, the list contains only the student's own group members (including self)  
- [ ] If scope is inter-group, the list contains members of other groups  
- [ ] Student can submit ratings via rubric and optional comments for each peer  
- [ ] Submitted evaluations are stored and visible to the instructor  
- [ ] Students **do not assign final grades** — evaluations contribute to a computed score but the instructor has full control (see US5)  
- [ ] Once submitted, an evaluation cannot be edited by the student  
- [ ] If the peer evaluation deadline has passed, submission is blocked with a clear message  

---

## US3 – Anonymous / Non-Anonymous Peer Review Option — **Backlog**

**As an instructor, I want to choose whether the peer review process is anonymous or non-anonymous per assignment, so that I can promote honest feedback when needed or open collaboration when appropriate.**

### Assumptions and Details

- Instructor is signed in  
- Instructor has at least one class with enrolled students  
- Peer reviews have been generated and assigned (see US1)  
- Assignment has an "anonymous review" toggle in its settings (see US9)  

### Capabilities and Acceptance Criteria

- [ ] Instructor can enable or disable anonymous reviews per assignment via assignment settings  
- [ ] When anonymous is **enabled**: students cannot see the names of their reviewers, and reviewer identities are hidden in received feedback  
- [ ] When anonymous is **disabled**: students can see who reviewed them and who they reviewed  
- [ ] Regardless of the setting, the instructor can always see who reviewed whom  
- [ ] Instructor can view completion status for all assigned peer reviews  
- [ ] The anonymity setting is displayed clearly on the assignment so students know before submitting  

---

## US4 – Class and Assignment Creation — **Complete**

**As an instructor, I want to be able to create classes and associated assignments with evaluation events, so that I can provide my students with evaluation and review materials.**

### Assumptions and Details

- Instructor is signed in  
- Instructor has permission to create or manage classes  

### Capabilities and Acceptance Criteria

- [ ] Instructor can create a class  
- [ ] Instructor can create an assignment under that class  
- [ ] Students in that class can see the assignment  
- [ ] Instructor can edit or delete the assignment before its start or due date  

---

## US5 – Grade Book and Student Progress Dashboard — **Backlog**

**As an instructor, I want a comprehensive grade book and progress view, so that I can monitor submissions, peer evaluations, and grades — and override grades when needed.**

### Assumptions and Details

- Instructor is signed in  
- Students have submitted assignments and/or peer reviews  
- There is at least one active assignment in the class  
- Students do not assign final grades — the system computes scores from peer evaluations but the instructor has full authority to adjust  

### Capabilities and Acceptance Criteria

- [ ] Instructor can see per-student submission status (submitted / submitted late / no submission)  
- [ ] Instructor can see per-assignment submission status  
- [ ] Instructor can see per-student peer evaluation completion status  
- [ ] Instructor can view a grade book showing computed grades per student per assignment  
- [ ] Instructor can **manually update/override** any student's grade  
- [ ] Student names in the grade book are clickable hyperlinks  
- [ ] Clicking a student name shows that student's submission and all peer evaluations they received  
- [ ] Instructor can apply safeguards or penalties (e.g., late penalty, incomplete evaluation penalty)  
- [ ] Grade updates are reflected in real time as new evaluations are submitted  

---

## US6 – Admin User Management — **In-Progress**

**As an administrator, I want a complete Admin User Management feature so I can manage accounts and roles from both the backend API and a frontend dashboard.**

### Assumptions and Details

- Admin is signed in with admin privileges
- Role-based access control enforces admin-only actions
- Backend CRUD endpoints exist and are documented (`/admin/users`, `/admin/users/create`, `/admin/users/<id>/role`, `/admin/users/<id>`)  
- Frontend will provide an Admin Dashboard UI that uses the backend endpoints and enforces client-side safeguards (no self-delete/demote, confirmations)

### Capabilities and Acceptance Criteria

Backend (already implemented)
- [x] List all user accounts (`GET /admin/users`)
- [x] Create a new user with any role (`POST /admin/users/create`)
- [x] Update a user's role (`PUT /admin/users/<id>/role`)
- [x] Delete a user account (`DELETE /admin/users/<id>`)
- [x] Prevent admins from deleting or demoting themselves
- [x] Duplicate-email validation on user creation
- [x] Admin-only endpoints protected by `@jwt_admin_required`

Frontend (dashboard tasks)
- [ ] Admin dashboard page listing users (paginated/filterable) with role and status columns
- [ ] Admin can create users of any role from the dashboard (form validation + server errors surfaced)
- [ ] Admin can edit a user's name, email, or role inline or via edit form
- [ ] Admin can deactivate or delete a user from the dashboard, with confirmation and safeguard against self-deletion
- [ ] Search and filter users by name, email, or role
- [ ] Admin receives clear success/error feedback on all actions (toasts/status messages)

Notes
- Keep backend tests as the source of truth; frontend features should call the implemented APIs and reuse existing response shapes.
- If desired, split frontend tasks into smaller stories (create/edit/delete/search) for tracking in the board.

---

## US7 – User Registration — **Complete**

**As a user, I want to create an account using my name, email, and password so that I can securely log in to the peer review platform.**

### Assumptions and Details

- User is on the registration page  
- Email address is not already in use  
- Network connection is available  

### Capabilities and Acceptance Criteria

- [ ] Registration form requires name, email, and password  
- [ ] System validates email format and password strength  
- [ ] On success, the user is created in the system  
- [ ] User can log in afterward with those credentials  

---

## US8 – UI Polish, Validation & Cross-Platform Accessibility — **In-Progress**

**As a user, I want a polished, responsive interface with proper input validation so that I can use the application reliably on any device.**

### Assumptions and Details

- User has valid credentials and internet access  
- Application uses responsive CSS (flexbox/grid, media queries)  
- Form validation occurs on both client and server side  
- Target devices: desktop (1024px+), tablet (768px–1023px), mobile (< 768px)  

### Capabilities and Acceptance Criteria

**Responsiveness & Cross-Platform**
- [ ] UI renders correctly on common desktop resolutions (1080p, 1440p)  
- [ ] UI renders correctly on tablet resolutions (iPad, Surface)  
- [ ] UI renders correctly on common mobile resolutions (iPhone, Android)  
- [ ] Navigation adapts for smaller screens (e.g., hamburger menu or collapsible sidebar)  
- [ ] Tables and data-heavy views are scrollable or restructured on mobile  
- [ ] Core actions (login, view courses, submit reviews) work on all form factors  

**UI Consistency & Polish**
- [ ] Consistent color scheme, typography, and spacing across all pages  
- [ ] Buttons, inputs, and interactive elements have clear hover/focus/active states  
- [ ] Loading states shown during async operations (spinners, skeleton screens)  
- [ ] Toast notifications for success/error feedback on all user actions  
- [ ] Modals and dialogs are accessible and dismissible  

**Form Validation**
- [ ] All required fields show clear validation errors on empty or invalid input  
- [ ] Email fields validate format before submission  
- [ ] Password fields enforce minimum strength requirements with visual feedback  
- [ ] Duplicate-entry errors (e.g., duplicate email, duplicate group name) display user-friendly messages  
- [ ] Form submissions are disabled while a request is in-flight (prevent double-submit)  

---

## US9 – Assignment Management Interface — **Complete**     

**As an instructor, I want a simple tabbed interface for managing assignments, their settings, and student submissions, so that I can configure peer evaluations and monitor progress from one place.**

### Assumptions and Details

- Instructor is signed in  
- Instructor already has at least one class  
- There are assignments to manage  
- Tab layout: Home | Members | Groups | Rubric | Submissions | Settings (teacher view)  
- Student view: Home | Members | Submission  
- Settings tab contains peer evaluation configuration (anonymity, scope, deadline) per US29

### Capabilities and Acceptance Criteria

- [x] Assignment page uses a tabbed layout for organizing content  
- [x] Instructor can view attached files and upload new files (PDF, DOCX, TXT, ZIP) with drag-and-drop  
- [x] Instructor can view rubric on the Home tab  
- [x] Instructor can view start date and due date  
- [x] Submissions tab shows all student submissions with status icons (submitted / late / missing)  
- [x] Instructor can download submitted files  
- [x] Late submissions are detected by comparing to due date  
- [x] Settings tab allows instructor to edit assignment name, rubric text, start date, and due date  
- [x] Settings tab allows instructor to configure peer evaluation options (see US29)  
- [x] Instructor can delete the assignment with a confirmation dialog  
- [x] Edit/delete is blocked after the due date (`can_modify()` check)  
- [x] Success/error feedback via StatusMessage (toast) on most actions  

---

## US10 – Data Privacy and Security — **Complete**

**As a system administrator, I want to ensure student data is protected by clear privacy guidelines, so that all users' information remains secure.**

### Assumptions and Details

- Admin is signed in  
- System has role-based access control  
- Organization has a privacy and security policy  

### Capabilities and Acceptance Criteria

- [ ] Sensitive data is only visible to authorized roles  
- [ ] Data in transit is protected  

---

## US11 – Rubric Creation — **Complete**

**As an instructor, I want to be able to create a rubric, so that students have a set of criteria to mark against.**

### Assumptions and Details

- Instructor is signed in  
- Instructor has an assignment to attach the rubric to  
- Rubric builder UI is available  

### Capabilities and Acceptance Criteria

- [ ] Instructor can add multiple rubric criteria  
- [ ] Instructor can set scale or score for each criterion  
- [ ] Instructor can save the rubric and attach it to an assignment  
- [ ] Students see that rubric when performing a peer review  

---

## US12 – Student Feedback Viewing — **Backlog**

**As a student, I want to be able to view the feedback I receive from my peers, so that I can understand how to improve my work.**

### Assumptions and Details

- Student is signed in  
- Student has submitted an assignment that was peer reviewed  

### Capabilities and Acceptance Criteria

- [ ] Student can open an assignment and see received feedback  
- [ ] Feedback shows rubric scores and comments  
- [ ] Feedback remains available after viewing  

---

## US13 – Teacher Change Password — **Backlog**

**As a teacher, I want to change my password so that I can update my login information.**

### Assumptions and Details

- Teacher has a current password  
- A workflow to change the password exists  

### Capabilities and Acceptance Criteria

- [ ] Given the teacher has a current password, when they submit a password change, the system updates it successfully  
- [ ] Teacher receives confirmation that the password change occurred  
- [ ] Updated credentials allow the teacher to log in immediately  

---

## US14 – Teacher Dashboard — **In-Progress**

**As a teacher, I want a dashboard that shows all my courses with key metrics, quick actions, and easy navigation, so that I can efficiently manage my classes and monitor student progress at a glance.**

### Assumptions and Details

- Teacher is signed in with teacher privileges  
- Teacher may have zero or more courses  
- Dashboard is the landing page after login (`/home`)  
- Course data is fetched from `/class/classes` and `/assignment/{classId}`  
- Dashboard should surface the most actionable information without requiring the teacher to drill into each course  

### Capabilities and Acceptance Criteria

**Course Cards & Display**
- [x] Dashboard displays a grid of course cards for all courses owned by the teacher  
- [x] Each course card shows the course name and assignment count  
- [x] Clicking a course card navigates to that course's detail page (`/classes/{id}/home`)  
- [ ] Each course card shows the number of enrolled students  
- [ ] Each course card shows upcoming due dates or next deadline  
- [ ] Each course card shows pending peer evaluation count (reviews not yet completed)  
- [ ] Course cards have distinct visuals or color coding (not all identical placeholder images)

---

## US15 – Course Page Shows Assignments — **In-Progress**

**As a teacher, I want my dashboard to show my courses and their assignments so that I can see what I have created.**

### Assumptions and Details

- Courses exist  
- Assignments exist for those courses  

### Capabilities and Acceptance Criteria

- [ ] Given the teacher has created courses and assignments, the dashboard lists each course  
- [ ] Each course entry shows the assignments associated with it  
- [ ] Assignment listings include key metadata such as due dates or status  

---

## US16 – Student Login After Roster Upload — **Complete**

## Story
As a student, I want to log in after my teacher uploads the roster so that I can access the system.

## Assumptions and Details
* The student is included on a roster uploaded by the teacher
* Student receives temporary password from teacher
* Logging in is possible with institutional email and temporary password

## Acceptance Criteria
- [x] Given the student is on the roster uploaded by the teacher
- [x] When the student logs in with their institutional email and temporary password
- [x] Then the student gains access to the system
- [x] Student is required to change password on first login
- [x] Student receives appropriate error message if login fails
- [x] Student is directed to their dashboard upon successful login
- [x] Students not on roster cannot log in with roster credentials

**Implementation:** See [US16_IMPLEMENTATION.md](User_story_implementations/US16_IMPLEMENTATION.md)

---

## US17 – Student Course Search — **Backlog**

**As a student, I want to search for my course so that I can find it easily.**

### Assumptions and Details

- A course exists to be found  
- Search UI is available  

### Capabilities and Acceptance Criteria

- [ ] Given a course exists, when the student searches by name or code, the course appears in the results  
- [ ] Search results include essential course metadata  
- [ ] Search handles no-result scenarios with clear messaging  

---

## US18 – Student Registration (Roster-Matched) — **Backlog**

**As a student, I want to register with my email and be automatically enrolled in any courses where my teacher has already added me to the roster, so that I don't have to manually find and join my courses.**

### Assumptions and Details

- Teacher has previously uploaded a CSV roster containing the student's email (see US16)  
- Roster upload currently creates a student account with a temporary password and `must_change_password = True`  
- If a student self-registers with an email that already exists (from roster upload), registration currently **fails** with "User already registered"  
- The system needs to handle two scenarios:  
  1. **Roster uploaded first**: Student's account already exists — registration should recognize this and let them set their own password  
  2. **Student registers first**: Account exists but has no enrollment — when the teacher later uploads the roster, the existing account should be enrolled (this path already works)  
- Enrollment is tracked via the `User_Course` join table  

### Capabilities and Acceptance Criteria

**Registration with Existing Roster Account**
- [ ] If a student registers with an email that already exists from a roster upload, the system updates the existing account's password instead of rejecting the registration  
- [ ] After successful registration, `must_change_password` is set to `False` (student chose their own password)  
- [ ] Student is automatically enrolled in all courses where their email appears on a roster  
- [ ] Student receives confirmation of registration and is shown which courses they were enrolled in  

**Registration Without Existing Roster Entry**
- [ ] If the student's email is not on any roster, standard registration proceeds normally (account created, no course enrollment)  
- [ ] Student can still be enrolled later when a teacher uploads a roster containing their email  

**Duplicate & Edge Case Handling**
- [ ] Duplicate registrations are prevented — a student cannot register twice with the same email  
- [ ] If the student already has an active account (not from roster), registration is rejected with a clear message  
- [ ] Email matching is case-insensitive (e.g., `Alice@school.edu` matches `alice@school.edu` on the roster)  

**Frontend**
- [ ] Registration form shows a success message indicating auto-enrollment when courses are matched  
- [ ] If no courses are matched, the success message simply confirms account creation  

**Backend**
- [ ] `/auth/register` checks for existing roster-created accounts (where `must_change_password = True`) and updates rather than rejects  
- [ ] `/auth/register` queries `User_Course` or a roster lookup to determine auto-enrollment  
- [ ] Response includes list of enrolled course names (if any)  

---

## US19 – Student Access Registered Courses — **Complete**

**As a student, I want to view courses I am registered for so that I can access course content.**

### Assumptions and Details

- Student is registered for courses  

### Capabilities and Acceptance Criteria

- [ ] Given the student is registered for courses, their dashboard lists those courses after login  
- [ ] Each course link opens the associated content  
- [ ] If no courses exist, the student sees a helpful empty state  

---

## US20 – Student Course Grade on Course Card — **Backlog**

**As a student, I want to see my total grade on each course card — updated automatically as each peer evaluation is completed — so that I always know how I am performing.**

### Assumptions and Details

- Student has a total grade for the course  
- Grades are computed from peer evaluation scores  
- Each completed peer evaluation triggers a grade recalculation for the reviewee  

### Capabilities and Acceptance Criteria

- [ ] Given the student has a total grade, the course card displays it prominently  
- [ ] Grade automatically updates each time a peer evaluation is submitted for the student  
- [ ] Course cards indicate when grade data is unavailable or pending evaluations  
- [ ] Grade reflects any instructor overrides applied via the grade book (see US5)  

---

## US21 – Student Profile Viewing — **Complete**

**As a student, I want to see my profile information so that I can confirm my details.**

### Assumptions and Details

- Student has profile information stored  

### Capabilities and Acceptance Criteria

- [ ] Given the student has profile information, the profile page shows their details  
- [ ] Profile data includes name, email, and role  
- [ ] Students can request corrections if data is inaccurate  

---

## US22 – Student View Team Submissions — **Backlog**

**As a student, I want to see the submitted assignments from my team members — with clear submission status — so that I can review their work and know who has submitted.**

### Assumptions and Details

- Student has team members (assigned via course-level groups, see US28)  
- Team members have assignments to submit  

### Capabilities and Acceptance Criteria

- [ ] Given submitted assignments from team members exist, the student can view them in a single place  
- [ ] Access is limited to the student's own team  
- [ ] Each submission shows a clear status: **Submitted**, **Submitted Late**, or **No Submission**  
- [ ] Submissions display timestamp and attached files  
- [ ] Student can click a team member's name to view their submission details  

---

## US23 – Peer Review Scope Configuration (Team Members or All Groups) — **Backlog**

**As an instructor, I want to configure peer review assignments to allow students to review either their own team members only or all groups in the class, so that I can control the scope of peer evaluations based on the assignment type.**

### Assumptions and Details

- Instructor is signed in with valid credentials  
- Instructor has created an assignment with peer review enabled  
- Students are organized into groups within the class  
- The review scope can be toggled between two modes:
  - **Team Members Only**: Students review only members of their own group
  - **All Groups**: Students review members across all groups in the class
- Review assignments are automatically generated based on the selected scope

### Capabilities and Acceptance Criteria

- [ ] Instructor can toggle peer review scope when creating or editing an assignment
- [ ] When "Team Members Only" is selected, each student is assigned to review only their own group members (including self-evaluation)
- [ ] When "All Groups" is selected, each student is assigned to review members from all groups in the class
- [ ] The selected scope is clearly displayed on the assignment details
- [ ] Students see only the peers they are assigned to review based on the configured scope
- [ ] Submitted reviews remain private and hidden from other students
- [ ] Instructor can monitor completion of peer reviews for all students
- [ ] Changing the scope after reviews have been started warns the instructor and requires confirmation  

---

## US24 – Developer Documentation — **Complete**

**As a developer, I want instructions on how to start and test the project with mock credentials so that I can work on the system.**

### Assumptions and Details

- Documentation is provided  
- Mock credentials exist  

### Capabilities and Acceptance Criteria

- [ ] Given a developer needs to start and test the project, the documentation walks through setup  
- [ ] Developer can run the project locally with mock credentials  
- [ ] Documentation covers testing workflows and expected results  

---

## US25 – Teacher Account Provisioning — **Backlog**

**As an administrator, I want to create teacher accounts so that instructors can access the system with the correct permissions.**

### Assumptions and Details

- Admin is signed in with admin privileges  
- Teacher accounts require a name, institutional email, and temporary password  
- System enforces role-based access control  

### Capabilities and Acceptance Criteria

- [ ] Admin can create a teacher account with required fields  
- [ ] System prevents duplicate teacher emails  
- [ ] Newly created teachers receive the `teacher` role automatically  
- [ ] Admin receives confirmation that the account was created  
- [ ] Teacher can log in with the provided credentials and is prompted to change the temporary password  

---

## US26 – Admin User Management — **Merged**

This story has been consolidated into **US6 – Admin User Management** (backend + frontend). See US6 for the combined acceptance criteria and frontend tasks.

---

## US27 – Password View Toggle — **In Review**

**As a User, I want to be able to click a button to reveal my password while I login or register.**

### Assumptions and Details

- The user is on the login or register page
- The user has begun typing

### Capabilities and Acceptance Criteria
- [ ] Given the user is on the login or registration page
- [ ] There is a clickable button next to the password field
- [ ] When the button is clicked, the password becomes visible/invisible
- [ ] Button cannot be clicked if password field is empty
- [ ] Password criteria is displayed below the password field
- [ ] Password criteria updates as password is entered

---

## US28 – Course-Level Group Management — **Complete**

**As an instructor, I want to create and manage student groups at the course level, so that I can organize students into teams for group assignments and peer evaluations.**

### Assumptions and Details

- Instructor is signed in and owns the course  
- Students are enrolled in the course (via roster upload or manual enrollment)  
- Groups are scoped to the **course**, not individual assignments — all assignments in a course share the same groups  
- Group management UI is accessible from the class dashboard and assignment pages  

### Capabilities and Acceptance Criteria

- [x] Instructor can create named groups within a course  
- [x] Instructor can rename or delete groups  
- [x] Duplicate group names within the same course are rejected (case-insensitive, whitespace-trimmed) with a clear error  
- [x] The same group name is allowed in different courses  
- [x] Instructor can assign students to groups from an unassigned student pool  
- [x] Assigning a student already in another group moves them automatically  
- [x] Instructor can remove students from a group (returns them to unassigned pool)  
- [x] Deleting a group removes all memberships (cascade delete) and returns students to unassigned  
- [x] Instructor can randomize group assignments with even distribution (minimum 2 per group)  
- [x] If there are too few students for all groups, only enough groups are filled to maintain the minimum size  
- [x] Students can view their group and group members but cannot modify groups  
- [x] Unenrolled students and unauthorized teachers cannot access group endpoints  
- [x] Password/hash fields are never exposed in member list responses  
- [x] Groups tab is visible to teachers on class and assignment pages  
- [x] A confirmation dialog appears before destructive actions (delete, randomize)  

### Implementation Notes

- **Backend**: `group_controller.py` — RESTful endpoints under `/classes/{id}/groups`  
- **Frontend**: `ClassGroupManagement.tsx` (class-level), `AssignmentGroups.tsx` (assignment-level, same course groups)  
- **Model**: `CourseGroup` with `courseID` foreign key; `Group_Members` join table  
- **Tests**: 43 tests in `flask_backend/tests/test_groups.py` — all passing  

---

## US29 – Peer Evaluation Settings & Assignments— **Backlog**

**As an instructor, I want to configure peer evaluation options (anonymity, scope, deadline) per assignment and have a polished assignment experience, so that I can control how students evaluate each other.**

### Assumptions and Details

- Instructor is signed in and has assignments (see US9)  
- Assignment management interface is complete (US9)  
- Peer evaluation settings are per-assignment configuration  
- These settings feed into US1 (auto-assign reviews), US2 (scope), and US3 (anonymity)  

### Capabilities and Acceptance Criteria

**Peer Evaluation Settings**
- [ ] Settings tab: anonymous / non-anonymous review toggle (see US3)  
- [ ] Settings tab: evaluation scope — own group vs. other groups (see US2)  
- [ ] Settings tab: separate peer evaluation deadline (distinct from assignment due date)  
- [ ] Backend: `anonymous_review`, `evaluation_scope`, `peer_eval_deadline` fields added to Assignment model  
- [ ] Backend: endpoint to update peer evaluation settings  
- [ ] Settings are saved and reflected when viewing the assignment  

**Assignment Polish**
- [ ] Assignment tab shows a dedicated description field (currently only rubric text)  
- [ ] Replace remaining `alert()` calls with toast notifications  

---
