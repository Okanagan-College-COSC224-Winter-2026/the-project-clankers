# Peer Review User Story Implementation Guide

## Overview
This guide implements the peer review workflow where students can view assigned peer reviews, access submissions, and submit feedback within an open review window.

## User Story Summary
**Given:** Student signed in with valid credentials, enrolled in class using peer review, instructor created assignment and assigned peer reviews, review window is open

**Capabilities:**
1. Student can view a list of peer assignments to review
2. Number of visible assignments matches what was assigned
3. Student cannot open unassigned submissions
4. Opening assigned submission shows content and review interface
5. Submitted feedback marks review as complete
6. If review period ended, student cannot submit feedback (notified)

---

## Architecture Overview

### Data Flow
```
Student (Signed In)
  ↓
Enrolled in Course
  ↓
Course has Assignment with Review Window
  ↓
Student assigned Review records pointing to reviewee submissions
  ↓
Student views assigned reviews → Opens submission → Completes review
```

### Key Entities & Relationships
- **Review**: Links reviewer (student) → assignment → reviewee
- **Assignment**: Stores `due_date` (review window deadline)
- **Submission**: Student's work to be reviewed
- **User**: Reviewer and reviewee
- **Criterion/CriteriaDescription**: Review form (rubric)

---

## Backend Implementation

### 1. New Review Controller Endpoints

**File:** `flask_backend/api/controllers/review_controller.py`

#### Endpoint 1: Get Assigned Reviews for Student
```
GET /review/my-reviews/<int:assignment_id>
Purpose: Fetch all reviews assigned to the authenticated student for a specific assignment
Auth: @jwt_required() - Student must be enrolled in course
Response:
{
  "reviews": [
    {
      "id": 1,
      "assignmentID": 10,
      "reviewerID": 5,  // current user
      "revieweeID": 7,
      "reviewer": { "id": 5, "name": "John", "email": "john@..." },
      "reviewee": { "id": 7, "name": "Jane", "email": "jane@..." },
      "assignment": { "id": 10, "name": "Project 1", "due_date": "2026-02-15T23:59:00Z" },
      "isCompleted": true/false,  // Whether submission feedback was saved
      "submission": { "id": 20, "path": "..." }
    },
    ...
  ],
  "reviewWindowOpen": true,  // Is due_date in future?
  "reviewWindowClosesAt": "2026-02-15T23:59:00Z"
}
```

#### Endpoint 2: Get Review Details (with submission)
```
GET /review/<int:review_id>
Purpose: Fetch a specific review including the reviewee's submission
Auth: @jwt_required() - Must be the reviewer OR authorization check
Response:
{
  "review": {
    "id": 1,
    "assignmentID": 10,
    "reviewerID": 5,
    "revieweeID": 7,
    "reviewer": { "id": 5, "name": "John", ... },
    "reviewee": { "id": 7, "name": "Jane", ... },
    "submission": { "id": 20, "path": "student-submission.pdf", "studentID": 7 },
    "assignment": { "id": 10, "name": "Project 1", "due_date": "2026-02-15T23:59:00Z" },
    "rubric": { "id": 5, ... }  // Active rubric for assignment
  },
  "reviewWindowOpen": true,
  "reviewWindowClosesAt": "2026-02-15T23:59:00Z"
}
```

#### Endpoint 3: Submit/Update Review Feedback
```
POST /review/<int:review_id>/submit
Purpose: Save peer feedback (marks review as complete)
Auth: @jwt_required() - Must be reviewer
Request:
{
  "criteria": [
    { "criterionRowID": 3, "grade": 5, "comments": "Great work" },
    { "criterionRowID": 4, "grade": 4, "comments": "Could improve" }
  ]
}
Response:
{
  "msg": "Review submitted successfully",
  "review": { ... },
  "markedComplete": true
}
Error Cases:
- 403: If user is not the assigned reviewer
- 400: If review window has closed (due_date passed)
- 400: If submission not found
- 422: If criteria validation fails
```

### 2. Update Review Model

**File:** `flask_backend/api/models/review_model.py`

Add helper method to check completion status:
```python
def is_complete(self):
    """Check if all required criteria have been scored"""
    if not self.criteria:
        return False
    # All criteria with hasScore=True must have a grade
    required_criteria = db.session.query(Criterion).filter(
        Criterion.reviewID == self.id,
        CriteriaDescription.hasScore == True  # joined through reviewID
    ).all()
    return len(required_criteria) == len([c for c in self.criteria if c.grade is not None])
```

### 3. Update Assignment Model

**File:** `flask_backend/api/models/assignment_model.py`

Add method to check if review window is open:
```python
def is_review_window_open(self):
    """Check if the review window (due date) is still open"""
    if self.due_date is None:
        return True
    return self._get_current_utc_time() < self._ensure_timezone_aware(self.due_date)
```

### 4. Validation & Authorization

**Key validations in review endpoints:**

```python
# 1. Verify reviewer is assigned to this review
if review.reviewerID != current_user.id:
    return 403 Forbidden

# 2. Verify reviewer is enrolled in the course
course_enrollment = User_Courses.query.filter(
    User_Courses.userID == current_user.id,
    User_Courses.courseID == review.assignment.courseID
).first()
if not course_enrollment:
    return 403 Forbidden

# 3. Verify review window is open
if not review.assignment.is_review_window_open():
    return 400 {"msg": "Review window has closed", "closedAt": assignment.due_date}

# 4. Verify submission exists
submission = Submission.query.filter(
    Submission.assignmentID == review.assignmentID,
    Submission.studentID == review.revieweeID
).first()
if not submission:
    return 404 {"msg": "Submission not found"}
```

### 5. Database Queries to Optimize

```python
# Get all reviews for a student on an assignment (N+1 prevention)
Review.query.options(
    joinedload(Review.assignment).joinedload(Assignment.course),
    joinedload(Review.reviewee),
    joinedload(Review.reviewer)
).filter(
    Review.assignmentID == assignment_id,
    Review.reviewerID == student_id
).all()

# Get submission for a review
Submission.query.filter(
    Submission.assignmentID == review.assignmentID,
    Submission.studentID == review.revieweeID
).first()
```

### 6. Error Responses (Consistent Format)

```json
// Review window closed
{
  "msg": "Review window has closed",
  "type": "REVIEW_WINDOW_CLOSED",
  "closedAt": "2026-02-15T23:59:00Z"
}

// Not assigned to this review
{
  "msg": "You are not assigned to review this submission",
  "type": "UNAUTHORIZED_REVIEW"
}

// Submission not found (shouldn't happen if data is consistent)
{
  "msg": "Submission not found",
  "type": "SUBMISSION_NOT_FOUND"
}

// Criteria validation error
{
  "msg": "Invalid criteria submitted",
  "type": "VALIDATION_ERROR",
  "errors": [
    {"criterionRowID": 3, "error": "Grade must be between 0 and 5"}
  ]
}
```

---

## Frontend Implementation

### 1. New Pages/Components

#### Component: `PeerReviewList.tsx`
- **Purpose:** Display all assigned reviews for a student in an assignment
- **Props:**
  - `assignmentId: number`
  - `courseId: number`
- **State:**
  - `reviews: ReviewData[]`
  - `loading: boolean`
  - `error: string | null`
  - `reviewWindowOpen: boolean`
  - `reviewWindowClosesAt: string`
- **Features:**
  - Fetch reviews on mount
  - Display count ("You have 3 reviews to complete")
  - Show review status (Complete/Pending)
  - Display reviewee names and submission status
  - Link to open each review
  - Show warning if review window closed
  - Show time until review window closes

#### Component: `PeerReviewForm.tsx`
- **Purpose:** Display submission and review form
- **Props:**
  - `reviewId: number`
  - `onSubmit: (criteria: CriterionInput[]) => Promise<void>`
  - `onClose: () => void`
- **State:**
  - `submission: SubmissionData`
  - `rubric: RubricData`
  - `criteria: CriterionInput[]`
  - `loading: boolean`
  - `error: string | null`
  - `windowClosed: boolean`
- **Features:**
  - Display submission content (if file, embed or provide link)
  - Render rubric with scoring interface
  - Handle form submission
  - Show error if window closed
  - Show success message after submit
  - Disable submit button if window closed

#### Component: `SubmissionViewer.tsx` (or enhance)
- **Purpose:** Display the submission content
- **Props:**
  - `submission: SubmissionData`
  - `revieweeInfo: UserData`
- **Features:**
  - Render based on file type (PDF, image, text, etc.)
  - Show metadata (submission date, file size)
  - Show student name and info

### 2. Update Existing Components

#### Update: `Assignment.tsx`
- Add section for "Peer Reviews to Complete"
- If assignment has review component, show peer review list
- Link to/embed PeerReviewForm

#### Update: `Home.tsx`
- Show "Pending Reviews" widget
- Link to assignments with outstanding reviews
- Show count and deadline warnings

### 3. API Utility Functions

**File:** `frontend/src/util/api.ts`

```typescript
// Get list of reviews assigned to current student
export const getMyReviews = async (assignmentId: number) => {
  const response = await fetch(
    `${BASE_URL}/review/my-reviews/${assignmentId}`,
    { credentials: 'include' }
  );
  return handleResponse(response);
};

// Get specific review with submission
export const getReview = async (reviewId: number) => {
  const response = await fetch(
    `${BASE_URL}/review/${reviewId}`,
    { credentials: 'include' }
  );
  return handleResponse(response);
};

// Submit review feedback
export const submitReview = async (
  reviewId: number,
  criteria: CriterionInput[]
) => {
  const response = await fetch(
    `${BASE_URL}/review/${reviewId}/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria }),
      credentials: 'include'
    }
  );
  return handleResponse(response);
};
```

### 4. TypeScript Types

**File:** `frontend/src/types.d.ts` (or new file)

```typescript
interface ReviewData {
  id: number;
  assignmentID: number;
  reviewerID: number;
  revieweeID: number;
  reviewer: UserData;
  reviewee: UserData;
  assignment: AssignmentData;
  isCompleted: boolean;
  submission: SubmissionData;
}

interface SubmissionData {
  id: number;
  path: string;
  studentID: number;
  assignmentID: number;
  submittedAt?: string;
}

interface CriterionInput {
  criterionRowID: number;
  grade: number;
  comments: string;
}

interface CriteriaDescriptionData {
  id: number;
  rubricID: number;
  question: string;
  scoreMax: number;
  hasScore: boolean;
}
```

---

## Testing Strategy

### Backend Tests

**File:** `flask_backend/tests/test_peer_review.py`

Test cases:

```python
# 1. Student can view assigned reviews
def test_get_my_reviews_success():
    # Given: student enrolled, assignment with reviews assigned
    # When: GET /review/my-reviews/{assignment_id}
    # Then: 200, list of assigned reviews returned

# 2. Verify correct number of reviews
def test_get_my_reviews_count():
    # Given: 5 reviews assigned to student
    # When: fetch reviews
    # Then: count == 5

# 3. Cannot view unassigned reviews
def test_get_other_reviews_forbidden():
    # Given: reviews assigned to another student
    # When: current student tries to fetch
    # Then: 403 Forbidden

# 4. Cannot submit review if window closed
def test_submit_review_window_closed():
    # Given: assignment.due_date = past time
    # When: POST /review/{id}/submit
    # Then: 400, msg: "Review window has closed"

# 5. Cannot submit review after accessing submission
def test_unauthorized_review_submission():
    # Given: reviewer != current_user
    # When: try to submit review
    # Then: 403 Forbidden

# 6. Submission not found returns 404
def test_review_submission_not_found():
    # Given: review exists but no submission
    # When: GET /review/{id}
    # Then: 404 "Submission not found"

# 7. Review completion flag works
def test_review_completion_status():
    # Given: review with some criteria filled
    # When: check is_complete()
    # Then: returns correct boolean

# 8. Review window open check
def test_review_window_check():
    # Given: assignment.due_date = future time
    # When: is_review_window_open()
    # Then: returns True
```

### Frontend Tests

Test structure:
- PeerReviewList fetches and displays reviews
- Cannot click submit if window closed
- Error messages display correctly
- Reviewee name visible
- Submit button disabled after submission

---

## Implementation Roadmap

### Phase 1: Backend Core (Days 1-2)
1. ✅ Create `review_controller.py` with endpoints
2. ✅ Add validation logic
3. ✅ Add helper methods to models
4. ✅ Write backend tests
5. ✅ Update schemas

### Phase 2: Frontend Components (Days 3-4)
1. ✅ Create PeerReviewList component
2. ✅ Create PeerReviewForm component
3. ✅ Create SubmissionViewer component
4. ✅ Update Assignment page to include reviews section
5. ✅ Add API utilities
6. ✅ Add types

### Phase 3: Integration & Testing (Days 5-6)
1. ✅ E2E testing with real workflows
2. ✅ Error handling refinement
3. ✅ UI/UX polish
4. ✅ Performance optimization

### Phase 4: Refinements (Day 7+)
1. ✅ Add sorting/filtering to review lists
2. ✅ Add notifications for upcoming deadlines
3. ✅ Add review history/transcripts

---

## Key Implementation Details

### 1. Authorization Pattern
Every endpoint must verify:
- User is authenticated (JWT valid)
- User is enrolled in the course
- User is the assigned reviewer (for accessing reviews)
- Review belongs to assignment in the course

```python
def authorize_review_access(review_id, current_user):
    review = Review.get_by_id(review_id)
    if not review or review.reviewerID != current_user.id:
        return False
    
    # Verify enrollment
    enrollment = User_Courses.query.filter(
        User_Courses.userID == current_user.id,
        User_Courses.courseID == review.assignment.courseID
    ).first()
    return enrollment is not None
```

### 2. Error Handling
- **403 Forbidden**: Not the reviewer, not enrolled
- **400 Bad Request**: Review window closed, validation errors
- **404 Not Found**: Review doesn't exist, submission missing
- **422 Unprocessable Entity**: Invalid criteria data

### 3. Review Window Logic
```python
# Check if window still open
is_open = assignment.due_date is None or assignment.due_date > now

# Return closure time with every response
response_data['reviewWindowClosesAt'] = assignment.due_date
response_data['reviewWindowOpen'] = is_open
```

### 4. Completion Tracking
- Review is "incomplete" until all required criteria have grades
- After submission, frontend should show "Completed" status
- Once submitted, user can still view their review but not edit

### 5. Database Consistency
- Ensure `Submission` exists before showing review
- Cascade deletes work correctly (deleting assignment → deletes reviews)
- Use transactions for multi-step operations

---

## Frontend/Backend Contract

### Review List Response
```json
{
  "reviews": [ReviewData],
  "reviewWindowOpen": boolean,
  "reviewWindowClosesAt": "ISO-8601 timestamp"
}
```

### Review Detail Response
```json
{
  "review": {
    "id": number,
    "assignment": { "id", "name", "due_date" },
    "renderer": "rubric",  // or "form", "feedback-only"
    "reviewee": { "id", "name" },
    "submission": { "id", "path" }
  },
  "rubric": { /* full rubric data */ },
  "reviewWindowOpen": boolean,
  "reviewWindowClosesAt": "ISO-8601 timestamp"
}
```

### Submission Response (POST)
```json
{
  "msg": "Review submitted successfully",
  "review": { /* updated review */ },
  "markedComplete": boolean
}
```

---

## Acceptance Criteria Mapping

| Criteria | Implementation | Location |
|----------|---|---|
| Student can view assigned reviews | `GET /review/my-reviews/{assignment_id}` | review_controller.py |
| Count matches assignment | Query filters by assignment & reviewer | review_model.py |
| Cannot open unassigned | Bearer token + DB check | review_controller.py |
| Shows content & interface | Submission embedded + rubric form | PeerReviewForm.tsx |
| Submitted feedback marks complete | POST endpoint saves criteria + `is_complete()` flag | review_controller.py |
| Window closed = no submit & notified | `is_review_window_open()` check + 400 response | assignment_model.py |

---

## Example Workflow

```
1. Student logs in (identity = email via JWT)
2. Navigate to Assignment → "Peer Reviews to Complete" section
3. Fetch GET /review/my-reviews/{assignment_id}
   - API checks reviewerID == current_user.id
   - Returns list of assigned reviews
4. Click a review to open
5. Fetch GET /review/{review_id}
   - API verifies reviewer access
   - Returns submission content + rubric
6. Fill rubric form (score + comments per criterion)
7. Click "Submit Review"
   - Fetch POST /review/{review_id}/submit with criteria
   - API checks window is open
   - Saves Criterion records
   - Returns updated review with isCompleted=true
8. UI shows "Review Complete" badge
```

---

## Notes & Gotchas

1. **Timezone Handling**: `due_date` stored as UTC, compare with `datetime.now(timezone.utc)`
2. **N+1 Queries**: Always use `joinedload()` when fetching reviews with nested relationships
3. **File Serving**: May need separate endpoint or CDN for submission files
4. **Rubric Versions**: Handle if rubric changes after assignment created
5. **Double-Submit Protection**: Consider adding submission ID/nonce to prevent accidental re-submits
