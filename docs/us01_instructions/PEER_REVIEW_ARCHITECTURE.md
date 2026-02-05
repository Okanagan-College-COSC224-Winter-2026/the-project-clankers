# Peer Review System - Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Assignment Page (Assignment.tsx)               │   │
│  │  - Shows list of assignments for course                    │   │
│  │  - For peer-review assignments, includes section:          │   │
│  │    "Peer Reviews to Complete"                              │   │
│  │                                                             │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │  <PeerReviewList />                                   │ │   │
│  │  │  - Fetches: GET /review/my-reviews/{assignmentId}    │ │   │
│  │  │  - Renders list of assigned reviews:                 │ │   │
│  │  │    • Reviewee name                                   │ │   │
│  │  │    • Completion status (Pending/✓Complete)           │ │   │
│  │  │    • Time remaining until deadline                   │ │   │
│  │  │  - Button [Open] for each review                     │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  │                                                             │   │
│  │  ┌─────────── Modal/Drawer ──────────────────────────────┐ │   │
│  │  │  <PeerReviewForm />                                   │ │   │
│  │  │  - Fetches: GET /review/{reviewId}                   │ │   │
│  │  │  - Renders in modal/drawer:                          │ │   │
│  │  │                                                       │ │   │
│  │  │  ┌───────────────────────────────────────────────┐  │ │   │
│  │  │  │ Reviewing: [Reviewee Name]                     │  │ │   │
│  │  │  │                                               │  │ │   │
│  │  │  │ ┌─ Submission Viewer ──────────────────────┐ │  │ │   │
│  │  │  │ │ [File content - PDF/text/image viewer]   │ │  │ │   │
│  │  │  │ │ Filename: project_submission.pdf         │ │  │ │   │
│  │  │  │ │ Size: 2.5 MB                             │ │  │ │   │
│  │  │  │ └─────────────────────────────────────────┘ │  │ │   │
│  │  │  │                                               │  │ │   │
│  │  │  │ ┌─ Rubric Form ────────────────────────────┐ │  │ │   │
│  │  │  │ │ Criterion 1: Code Quality                │ │  │ │   │
│  │  │  │ │   Score: ★★★★☆ (4/5)                    │ │  │ │   │
│  │  │  │ │   Comments: [text input area]            │ │  │ │   │
│  │  │  │ │                                           │ │  │ │   │
│  │  │  │ │ Criterion 2: Completeness                │ │  │ │   │
│  │  │  │ │   Score: ★★★★★ (5/5)                    │ │  │ │   │
│  │  │  │ │   Comments: [text input area]            │ │  │ │   │
│  │  │  │ │                                           │ │  │ │   │
│  │  │  │ │ [Submit Review] [Cancel]                 │ │  │ │   │
│  │  │  │ └─────────────────────────────────────────┘ │  │ │   │
│  │  │  │                                               │  │ │   │
│  │  │  │ Window closes: 5 hours remaining ⏱️           │  │ │   │
│  │  │  └───────────────────────────────────────────────┘  │ │   │
│  │  │                                                       │ │   │
│  │  │  API calls:                                           │ │   │
│  │  │  - POST /review/{reviewId}/submit {criteria}         │ │   │
│  │  │  - Success → shows confirmation, marks as ✓Complete  │ │   │
│  │  │  - Error → shows error type (window closed, etc)     │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Utilities: frontend/src/util/api.ts                              │
│  - getMyReviews(assignmentId)                                     │
│  - getReview(reviewId)                                            │
│  - submitReview(reviewId, criteria)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ⬇ HTTP/JSON ⬇
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND API (Flask + SQLAlchemy)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        review_controller.py (NEW)                           │   │
│  │                                                             │   │
│  │  GET /review/my-reviews/<assignment_id>                    │   │
│  │  ├─ @jwt_required()                                        │   │
│  │  ├─ Verify user enrolled in course                        │   │
│  │  ├─ Query: Review.query.filter(                          │   │
│  │  │          assignmentID=id, reviewerID=user_id)         │   │
│  │  ├─ Include: submission, reviewee, isCompleted flag      │   │
│  │  ├─ Include: reviewWindowOpen, closesAt                  │   │
│  │  └─ Return: [ReviewData, ReviewData, ...]                │   │
│  │                                                             │   │
│  │  GET /review/<review_id>                                   │   │
│  │  ├─ @jwt_required()                                        │   │
│  │  ├─ Verify user is reviewer                                │   │
│  │  ├─ Query: Review with nested (submission, rubric, ...)  │   │
│  │  ├─ Check window status                                   │   │
│  │  └─ Return: {review, submission, rubric, windowStatus}   │   │
│  │                                                             │   │
│  │  POST /review/<review_id>/submit                           │   │
│  │  ├─ @jwt_required()                                        │   │
│  │  ├─ Request: {criteria: [{criterionRowID, grade, ...}]}  │   │
│  │  ├─ Verify: reviewer + window open + data valid          │   │
│  │  ├─ Create: Criterion records for each rubric row        │   │
│  │  ├─ Set: review.is_complete() = true                     │   │
│  │  └─ Return: {msg, updatedReview, success}                │   │
│  │                                                             │   │
│  │  Error Responses:                                          │   │
│  │  - 401: Unauthorized (JWT invalid/expired)               │   │
│  │  - 403: Forbidden (not assigned reviewer, not enrolled)  │   │
│  │  - 404: Not Found (review/submission missing)            │   │
│  │  - 400: Bad Request (window closed, validation error)    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Model Methods (Enhanced):                                         │
│                                                                     │
│  Assignment.is_review_window_open()                               │
│  └─ Returns: True if due_date is None or > now, else False       │
│                                                                     │
│  Review.is_complete()                                              │
│  └─ Returns: True if all hasScore=True criteria have grades      │
│                                                                     │
│  Schemas (marshmallow):                                            │
│  - ReviewListSchema: id, assignmentID, reviewer, reviewee, ...    │
│  - ReviewDetailSchema: + submission, rubric, criteria               │
│  - SubmissionSchema: id, path, studentID, assignmentID            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ⬇ SQL ⬇
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE (SQLite / PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │    User      │  │   Course     │  │ Assignment   │             │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤             │
│  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │             │
│  │ name         │  │ teacherID    │  │ courseID (FK)│             │
│  │ email ⬅──────┼──├──────────────┤  │ name         │             │
│  │ hash_pass    │  │              │  │ due_date ⬅──┼─ Review window
│  │ role         │  │              │  │ rubric_text  │
│  └──────────────┘  └──────────────┘  └──────────────┘
│       ⬆️                                      ⬆️
│       │                                      │
│       └──────────────────────────────────────┘
│                      ⬇️
│  ┌──────────────┐
│  │   Review     │ ⬅─ Peer review assignment
│  ├──────────────┤
│  │ id (PK)      │
│  │ assignmentID │
│  │ reviewerID   │ ⬅─ Student doing the review
│  │ revieweeID   │ ⬅─ Student being reviewed
│  └──────────────┘
│       ⬇️
│  ┌──────────────────────┐  ┌────────────────────┐
│  │  Criterion           │  │   Submission       │
│  ├──────────────────────┤  ├────────────────────┤
│  │ id (PK)              │  │ id (PK)            │
│  │ reviewID (FK)        │  │ studentID (FK)     │
│  │ criterionRowID (FK)  │  │ assignmentID (FK)  │
│  │ grade                │  │ path (file)        │
│  │ comments             │  └────────────────────┘
│  └──────────────────────┘          ⬆️
│            ⬆️                       │
│            └───────── Linked by assignmentID
│
│  ┌──────────────────────┐
│  │ CriteriaDescription  │ (Rubric rows)
│  ├──────────────────────┤
│  │ id (PK)              │
│  │ rubricID (FK)        │
│  │ question             │
│  │ scoreMax             │
│  │ hasScore             │
│  └──────────────────────┘
│
│  ┌──────────────────────┐
│  │ User_Courses         │ (Enrollment)
│  ├──────────────────────┤
│  │ userID (FK)          │
│  │ courseID (FK)        │
│  └──────────────────────┘
│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow Diagram

### Flow 1: Getting List of Assigned Reviews

```
FRONTEND                           BACKEND                      DATABASE
   │                                 │                              │
   │─ GET /review/my-reviews/5 ────→ │                              │
   │  (JWT in cookie)                │                              │
   │                                 │─ Verify JWT token           │
   │                                 │  Extract current_user_id    │
   │                                 │                              │
   │                                 │─ Query Review where ...──────┼──→ │
   │                                 │  assignmentID=5 AND          │    │
   │                                 │  reviewerID=user_id          │    │
   │                                 │                              │
   │                                 │← Rows with relationships ────│
   │                                 │                              │
   │                                 │- Serialize with             │
   │                                 │  ReviewListSchema           │
   │                                 │- Add window status check    │
   │                                 │- Add submission link        │
   │                                 │                              │
   │← {reviews: [...], 200} ─────────│                              │
   │                                 │                              │
   │ Update state with reviews       │                              │
   │ Render PeerReviewList           │                              │
```

### Flow 2: Opening a Review & Fetching Details

```
FRONTEND                           BACKEND                      DATABASE
   │                                 │                              │
   │─ GET /review/7 ───────────────→ │                              │
   │  (JWT + reviewId)                │                              │
   │                                 │─ Verify JWT                 │
   │                                 │- Check review.reviewerID     │
   │                                 │  == current_user_id         │
   │                                 │                              │
   │                                 │─ Query Review(7) ────────────┼──→ │
   │                                 │  with eager load:            │    │
   │                                 │  - submission                │    │
   │                                 │  - rubric                    │    │
   │                                 │  - criteria (existing)       │    │
   │                                 │  - assignment                │    │
   │                                 │                              │
   │                                 │← Full Review object ─────────│
   │                                 │                              │
   │                                 │- Check assignment.due_date   │
   │                                 │- Set windowOpen = now <      │
   │                                 │                 due_date     │
   │                                 │                              │
   │← {review, submission,           │                              │
   │   rubric, windowOpen, 200} ─────│                              │
   │                                 │                              │
   │ Open modal with PeerReviewForm  │                              │
   │ Render submission content       │                              │
   │ Render rubric form              │                              │
```

### Flow 3: Submitting Review Feedback

```
FRONTEND                           BACKEND                      DATABASE
   │                                 │                              │
   │ User fills form & clicks        │                              │
   │ "Submit Review"                 │                              │
   │                                 │                              │
   │─ POST /review/7/submit ────────→ │                              │
   │  {criteria: [                    │                              │
   │    {criterionRowID:3,            │                              │
   │     grade:4,                     │                              │
   │     comments:"Good"}]}           │                              │
   │                                 │                              │
   │                                 │─ Verify JWT                 │
   │                                 │- Check user is reviewer      │
   │                                 │- Check window open           │
   │                                 │- Validate data               │
   │                                 │                              │
   │                                 │─ For each criterion: ─────────┼──→ │
   │                                 │  CREATE Criterion record      │    │
   │                                 │  INSERT INTO Criterion(...)   │    │
   │                                 │                              │
   │                                 │← Success ──────────────────-│
   │                                 │                              │
   │                                 │- review.is_complete() = true │
   │                                 │- return updated review       │
   │                                 │                              │
   │← {msg, review, 200} ────────────│                              │
   │                                 │                              │
   │ Show success toast              │                              │
   │ Mark review as "✓ Complete"     │                              │
   │ Disable submit button           │                              │
   │ Close modal                     │                              │
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Possible Error Scenarios & Responses                            │
└─────────────────────────────────────────────────────────────────┘

1. NOT SIGNED IN or JWT EXPIRED
   ↓
   Backend: 401 Unauthorized
   Frontend: {msg: "Please log in", code: "UNAUTHORIZED"}
   Action: Redirect to login page

2. TRYING TO ACCESS UNASSIGNED REVIEW
   ↓
   Backend: 403 Forbidden
   Frontend: {msg: "You are not assigned to review...", code: "NOT_REVIEWER"}
   Action: Show error, redirect to review list

3. NOT ENROLLED IN THE COURSE
   ↓
   Backend: 403 Forbidden
   Frontend: {msg: "You are not enrolled in this course", code: "NOT_ENROLLED"}
   Action: Show error

4. REVIEW WINDOW CLOSED (try to GET)
   ↓
   Backend: Can still GET (view-only mode)
   Response includes: {windowOpen: false, closesAt: "2026-02-15T..."}
   Frontend: Show "Review window closed" message, disable submit

5. REVIEW WINDOW CLOSED (try to POST)
   ↓
   Backend: 400 Bad Request
   Response: {msg: "Review window has closed", code: "WINDOW_CLOSED", 
              closedAt: "2026-02-15T..."}
   Frontend: Show warning toast with deadline info

6. SUBMISSION NOT FOUND
   ↓
   Backend: 404 Not Found
   Frontend: {msg: "Submission not found", code: "SUBMISSION_MISSING"}
   Action: Data consistency error (shouldn't happen)

7. VALIDATION ERROR (incomplete criteria)
   ↓
   Backend: 422 Unprocessable Entity
   Frontend: {msg: "Some criteria missing scores", errors: [...]}
   Action: Show field-level errors in form
```

---

## State Management Pattern

```
PeerReviewList Component State:
├─ reviews: ReviewData[]            (list from API)
├─ loading: boolean                 (fetching state)
├─ error: string | null             (error message)
├─ selectedReviewId: number | null  (which to open)
├─ windowOpen: boolean              (is deadline still active)
└─ closesAt: string                 (ISO timestamp)

PeerReviewForm Component State:
├─ submission: SubmissionData        (file/content to review)
├─ rubric: RubricData               (criteria list)
├─ criteria: Map<rowID, {grade, comments}>  (form state)
├─ submitting: boolean              (POST in progress)
├─ submitted: boolean               (successfully saved)
├─ error: {type, message}           (error from API)
├─ windowOpen: boolean              (can still submit)
└─ windowClosesAt: string           (deadline countdown)
```

---

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│ Authorization Matrix                                            │
└─────────────────────────────────────────────────────────────────┘

User Type    | Can GET my-reviews | Can GET other/review | Can POST submit
─────────────┼────────────────────┼──────────────────────┼─────────────────
Student      | ✓ (own reviews)    | ✗ (403)              | ✓ (if open)
Teacher      | ✗ (403)            | ✗ (403)              | ✗ (403)
Admin        | ✗ (403)            | ? (maybe view audit)  | ✗ (403)
Not Signed In| ✗ (401)            | ✗ (401)              | ✗ (401)

Filters Applied:
- GET /review/my-reviews/{id}
  WHERE assignmentID = {id}
    AND reviewerID = current_user.id
    AND User_Courses row exists (verify enrollment)

- GET /review/{id}
  WHERE review.reviewerID = current_user.id
    AND User_Courses row exists

- POST /review/{id}/submit
  WHERE review.reviewerID = current_user.id
    AND review.assignment.due_date > now
    AND submission exists
    AND User_Courses row exists
```

---

## Database Relationships (SQL-level)

```sql
-- Review links reviewer to reviewee for an assignment
CREATE TABLE Review (
    id INT PRIMARY KEY,
    assignmentID INT REFERENCES Assignment(id),
    reviewerID INT REFERENCES User(id),     -- Student doing review
    revieweeID INT REFERENCES User(id),     -- Student being reviewed
    UNIQUE(assignmentID, reviewerID)        -- One review per reviewer per assignment
);

-- Submission is what reviewee is submitting
CREATE TABLE Submission (
    id INT PRIMARY KEY,
    assignmentID INT REFERENCES Assignment(id),
    studentID INT REFERENCES User(id),      -- Who submitted
    path VARCHAR(255),                      -- File path or content
    UNIQUE(assignmentID, studentID)         -- One submission per student per assignment
);

-- Reviewer fills out criteria for each rubric row
CREATE TABLE Criterion (
    id INT PRIMARY KEY,
    reviewID INT REFERENCES Review(id),
    criterionRowID INT REFERENCES Criteria_Description(id),
    grade INT,                              -- 0 to scoreMax
    comments TEXT
);

-- Assignment with review window deadline
CREATE TABLE Assignment (
    id INT PRIMARY KEY,
    courseID INT REFERENCES Course(id),
    name VARCHAR(255),
    due_date DATETIME,                      -- Review window deadline
    rubric_text TEXT
);
```

