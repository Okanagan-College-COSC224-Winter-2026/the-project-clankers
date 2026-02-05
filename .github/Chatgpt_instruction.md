```txt
# Work Breakdown – Peer Review User Story

## Overview
This work breakdown outlines how responsibilities for implementing the peer review user story were divided among a five-person team. Tasks are grouped by backend logic, frontend user interface, and integration/testing to ensure clear ownership and alignment with acceptance criteria.

---

## 1. Backend Developer – Assignment & Permission Logic

**Focus:** Determining what peer reviews a student can see and access.

### Responsibilities
- Implement backend endpoint to retrieve peer reviews assigned to a student
- Validate that the user:
  - Is authenticated
  - Is enrolled in the course
  - Has been assigned peer reviews for the assignment
- Restrict access to unassigned submissions
- Return appropriate authorization and error responses

### Acceptance Criteria Covered
- Student can view a list of peer assignments to review
- Number of visible assignments matches what was assigned
- Student cannot open unassigned submissions

---

## 2. Backend Developer – Review Submission & Time Window Enforcement

**Focus:** Controlling when and how peer review feedback can be submitted.

### Responsibilities
- Implement endpoint for submitting peer review feedback
- Validate that:
  - The peer review is assigned to the student
  - The review window is currently open
  - The review has not already been completed
- Persist feedback and mark review as completed
- Prevent submissions after the review period ends and return clear error messages

### Acceptance Criteria Covered
- Submitted feedback marks that review as complete
- If the review period has ended, the student cannot submit feedback and is notified

---

## 3. Frontend Developer – Peer Review List Interface

**Focus:** Displaying assigned peer reviews to the student.

### Responsibilities
- Create a peer review list page for students
- Fetch assigned peer reviews from backend API
- Display:
  - Assignment titles
  - Review status (Pending / Completed)
  - Review deadlines
- Handle loading, empty, and error states

### Acceptance Criteria Covered
- Student can view a list of peer assignments to review
- Number of visible assignments matches backend data

---

## 4. Frontend Developer – Review Detail & Submission Interface

**Focus:** Allowing students to view submissions and submit feedback.

### Responsibilities
- Display assigned submission content
- Build peer review form (comments, rubric, or feedback fields)
- Submit feedback to backend API
- Disable submission functionality when review window is closed
- Display notification when review period has ended

### Acceptance Criteria Covered
- Opening an assigned submission shows the content and review interface
- If the review period has ended, the student cannot submit feedback and is notified

---

## 5. Integration, Testing & Documentation Lead

**Focus:** Ensuring system cohesion, correctness, and completeness.

### Responsibilities
- Coordinate frontend and backend integration
- Verify API request/response contracts
- Perform end-to-end testing of peer review workflow
- Test edge cases:
  - Unauthorized access
  - Unassigned review access
  - Expired review window
- Document system behavior and team contributions
- Assist with demo preparation

### Acceptance Criteria Covered
- All acceptance criteria are validated through integration and testing

---

## Summary
Responsibilities were divided by functional area to minimize overlap and ensure accountability. This structure aligns backend logic, frontend experience, and system integration directly with the defined acceptance criteria.

txt
