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

## US6 – System Maintenance and Management — **Complete**

**As an administrator, I want the ability to maintain and manage the system, so that I can ensure it remains stable and updated.**

### Assumptions and Details

- Admin is signed in with admin privileges  
- System is running  

### Capabilities and Acceptance Criteria

- [ ] Admin can view all user accounts  
- [ ] Admin can view system logs  
- [ ] Admin-only options are not visible to non-admin users  
- [ ] Admin has access to project files  

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

## US8 – Cross-Platform Accessibility — **In-Progress**

**As a user, I want to be able to access the system on both desktop and mobile, so that I can use whatever device I have available to me.**

### Assumptions and Details

- User has valid credentials  
- User has internet access  
- Application has a responsive UI  

### Capabilities and Acceptance Criteria

- [ ] UI renders correctly on common desktop resolutions  
- [ ] UI renders correctly on common mobile resolutions  
- [ ] Core actions work on both form factors  

---

## US9 – Assignment Management Interface — **In-Progress**

**As an instructor, I want a simple tabbed interface for managing assignments, their settings, and student submissions, so that I can configure peer evaluations and monitor progress from one place.**

### Assumptions and Details

- Instructor is signed in  
- Instructor already has at least one class  
- There are assignments to manage  

### Capabilities and Acceptance Criteria

- [ ] Assignment page uses a tabbed layout with: **Assignment** (details), **Settings**, and **Submissions** tabs  
- [ ] **Assignment tab**: Instructor can view assignment description, attached files, rubric, and due dates  
- [ ] **Settings tab**: Instructor can configure peer evaluation options including:  
  - Anonymous / non-anonymous reviews (see US3)  
  - Evaluation scope: own group vs. other groups (see US2)  
  - Peer evaluation deadline  
  - Start date / due date  
- [ ] **Submissions tab**: Instructor can see all student submissions with status (submitted / late / missing) and download files  
- [ ] Instructor can edit or delete the assignment from the interface  
- [ ] Actions provide clear success or error toast messages  

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

## US11 – Rubric Creation — **In-Progress**

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

## US14 – Teacher Dashboard Visibility — **In-Progress**

**As a teacher, I want to see my dashboard so that I can view my teaching-related items.**

### Assumptions and Details

- A dashboard exists for teachers  
- Teacher has at least one teaching-related item  

### Capabilities and Acceptance Criteria

- [ ] Given the teacher has accessed the system, when they open the dashboard, the expected widgets appear  
- [ ] Dashboard reflects real-time data for the teacher’s classes and assignments  
- [ ] Access to the dashboard respects teacher permissions  

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

## US16 – Student Login After Roster Upload

## Story
As a student, I want to log in after my teacher uploads the roster so that I can access the system.

## Assumptions and Details
* The student is included on a roster
* Logging in is possible

## Acceptance Criteria
- [ ] Given the student is on the roster
- [ ] When the student logs in
- [ ] Then the student gains access to the system

---

*Note: You may want to expand the acceptance criteria to include additional scenarios such as:*
- [ ] Student not on roster cannot log in
- [ ] Student receives appropriate error message if login fails
- [ ] Student is directed to their dashboard upon successful login

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

**As a student, I want to register if my email is already part of the course roster so that I can join my course.**

### Assumptions and Details

- Student’s email appears in the roster  
- Registration is possible  

### Capabilities and Acceptance Criteria

- [ ] Given the student’s email is on the roster, when they register, the system links them to the course automatically  
- [ ] Student receives confirmation of successful registration  
- [ ] Duplicate registrations are prevented  

---

## US19 – Student Access Registered Courses — **In-Progress**

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

## US23 – Peer Review Team Members — **Backlog**

**As a student, I want to peer review my team members privately so that I can evaluate their contributions.**

### Assumptions and Details

- Student has team members  
- Peer reviews are allowed  

### Capabilities and Acceptance Criteria

- [ ] Given the student has team members, they can submit a private review for each member  
- [ ] Submitted reviews remain hidden from other students  
- [ ] Instructor can monitor completion of the peer reviews  

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

## US26 – Admin User Management — **Backlog**

**As an administrator, I want to manage user accounts from the admin dashboard so that I can keep the user base accurate and up to date.**

### Assumptions and Details

- Admin is signed in and on the admin dashboard  
- System exposes CRUD operations over users via the frontend  
- Role-based access control enforces that only admins can perform these actions  

### Capabilities and Acceptance Criteria

- [ ] Admin can view a paginated or filterable list of all users  
- [ ] Admin can create a new user and assign an initial role  
- [ ] Admin can edit an existing user’s name, email, or role  
- [ ] Admin can deactivate or delete a user, with safeguards against self-deletion  
- [ ] Admin receives success or error feedback for each action  
- [ ] All actions go through the frontend admin page and persist to the backend

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
