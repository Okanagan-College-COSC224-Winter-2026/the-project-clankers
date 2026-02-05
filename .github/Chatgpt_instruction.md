```txt
Suggested 5-Person Split
1️⃣ Backend – Assignment & Permission Logic

Focus: “What can this student see and open?”

Responsibilities

Endpoint to fetch assigned peer reviews for a student

Ensure:

Student is enrolled in class

Assignment exists

Peer review is assigned to this student

Prevent access to:

Unassigned submissions

Submissions outside the review window

Acceptance Criteria Covered

Student can view a list of peer assignments to review

Number of visible assignments matches what was assigned

Student cannot open unassigned submissions

Typical Tasks

API route: GET /peer-reviews

Authorization checks

Backend filtering logic

Error responses (403, 404)

2️⃣ Backend – Review Submission & Time Window

Focus: “Can they submit feedback right now?”

Responsibilities

Endpoint to submit peer review feedback

Validate:

Review window is open

Review is assigned

Review not already completed

Mark review as complete in DB

Acceptance Criteria Covered

Submitted feedback marks that review as complete

If review period ended, student cannot submit feedback

Typical Tasks

API route: POST /peer-reviews/:id/submit

Time window validation

DB updates

Clear error messages

3️⃣ Frontend – Review List Page

Focus: “What the student sees when they log in”

Responsibilities

Page showing list of assigned peer reviews

Display:

Assignment title

Status (Pending / Completed)

Review deadline

Disable or hide unassigned / unavailable items

Acceptance Criteria Covered

Student can view a list of peer assignments

Number of visible assignments matches backend data

Typical Tasks

API integration

UI states (loading / empty / error)

Basic styling

4️⃣ Frontend – Review Detail & Submission UI

Focus: “Actually doing the review”

Responsibilities

Page for opening an assigned submission

Display:

Submission content

Review form (rubric, comments, etc.)

Handle:

Submit feedback

Locked state if review period ended

Acceptance Criteria Covered

Opening assigned submission shows content + review interface

If review period ended, student is notified and blocked

Typical Tasks

Form validation

Error handling

UX messaging (“Review window closed”)

5️⃣ Integration, Testing & Documentation (Glue Person)

Focus: “Make it all work together”

Responsibilities

Coordinate frontend ↔ backend contracts

Write:

API documentation

User story traceability

End-to-end testing:

Happy path

Edge cases (expired window, unauthorized access)

Demo prep

Acceptance Criteria Covered

Verifies all acceptance criteria are met

Typical Tasks

Test scripts

Bug tracking

Merge conflict resolution

README / submission notes

```txt



