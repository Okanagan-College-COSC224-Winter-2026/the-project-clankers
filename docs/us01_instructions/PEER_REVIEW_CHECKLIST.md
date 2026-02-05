# Peer Review Implementation - Quick Start Checklist

## 🎯 Overview
Implement peer review functionality allowing students to view assigned reviews, access submissions, and submit feedback within a review window.

---

## ✅ Phase 1: Backend Setup (Days 1-2)

### 1.1 Create Review Controller
- [ ] Create `flask_backend/api/controllers/review_controller.py`
- [ ] Implement `GET /review/my-reviews/<assignment_id>` 
  - Returns all reviews where current user = reviewer
  - Include: submission data, reviewee info, window status
- [ ] Implement `GET /review/<review_id>`
  - Get single review with all details for form
  - Verify user is assigned reviewer
- [ ] Implement `POST /review/<review_id>/submit`
  - Store Criterion records (grade + comments)
  - Validate window is open
  - Validate all required criteria filled

### 1.2 Register Blueprint
- [ ] Add to `flask_backend/api/__init__.py`:
  ```python
  from api.controllers.review_controller import bp as review_bp
  app.register_blueprint(review_bp)
  ```

### 1.3 Enhance Models
- [ ] **Assignment model**: Add `is_review_window_open()` method
  ```python
  def is_review_window_open(self):
      if self.due_date is None:
          return True
      return self._get_current_utc_time() < self._ensure_timezone_aware(self.due_date)
  ```
- [ ] **Review model**: Add `is_complete()` method to check if all criteria scored

### 1.4 Update Schemas (if needed)
- [ ] Extend ReviewListSchema to include submission + isCompleted flag
- [ ] Create ReviewDetailSchema with full relationships
- [ ] Ensure SubmissionSchema included

### 1.5 Write Tests
- Create `flask_backend/tests/test_peer_review.py`
- [ ] Test: Fetch assigned reviews (count correct)
- [ ] Test: Cannot access unassigned reviews (403)
- [ ] Test: Cannot submit if window closed (400)
- [ ] Test: Successful submission creates Criterion records
- [ ] Test: Submission marks review complete

---

## ✅ Phase 2: Frontend Setup (Days 3-4)

### 2.1 Create Components

#### PeerReviewList.tsx (NEW)
- [ ] Fetch reviews on mount: `GET /review/my-reviews/{assignmentId}`
- [ ] Display each review as card:
  - Reviewee name
  - Status (Pending/Complete)
  - Link to open review
- [ ] Show warning if window closed
- [ ] Display "Review window closes at: X"
- [ ] Show count: "You have X reviews to complete"

#### PeerReviewForm.tsx (NEW)
- [ ] Fetch review: `GET /review/{reviewId}`
- [ ] Display submission (embedded or linked)
- [ ] Render rubric with scoring interface:
  - For each criterion: input score + comments
- [ ] Submit handler:
  - Validate all required fields
  - POST to `/review/{reviewId}/submit`
  - Show success message
- [ ] Error handling:
  - If window closed: show message + disable submit
  - If not assigned: show 403 error
  - If submission missing: show 404 error

#### SubmissionViewer.tsx (NEW/ENHANCE)
- [ ] Display submission content
  - If file: embed or link
  - If text: display inline
- [ ] Show metadata: submission date, file name
- [ ] Show student info: name, email

### 2.2 Update Existing Components

#### Assignment.tsx
- [ ] Add section: "Peer Reviews to Complete" (if assignment has reviews)
- [ ] Import & render `<PeerReviewList />`
- [ ] Link to open individual reviews

#### Home.tsx
- [ ] Add widget: "Pending Reviews" showing count + deadline
- [ ] Link to assignments with outstanding reviews

### 2.3 Add API Utilities
In `frontend/src/util/api.ts`:
- [ ] `getMyReviews(assignmentId)`
- [ ] `getReview(reviewId)`
- [ ] `submitReview(reviewId, criteria)`

### 2.4 Add TypeScript Types
Add to `frontend/src/types.d.ts`:
```typescript
interface ReviewData { ... }
interface SubmissionData { ... }
interface CriterionInput { criterionRowID, grade, comments }
interface CriteriaDescriptionData { ... }
```

---

## ✅ Phase 3: Integration Testing (Days 5-6)

### 3.1 End-to-End Flow Test
- [ ] User logs in as student
- [ ] Navigate to assignment with peer reviews
- [ ] See list of assigned reviews (count correct)
- [ ] Click to open one review
- [ ] See submission content
- [ ] Fill rubric form
- [ ] Submit review
- [ ] See "Complete" status
- [ ] Verify cannot re-edit (optional: allow view-only)

### 3.2 Error Cases
- [ ] Try to access unassigned review → 403
- [ ] Try to submit after window closes → 400 + warning
- [ ] Try to submit incomplete form → validation error
- [ ] Try to access review for submission that doesn't exist → 404

### 3.3 UI/UX Polish
- [ ] Loading spinners while fetching
- [ ] Error toast notifications
- [ ] Success confirmation after submit
- [ ] Responsive layout on mobile
- [ ] Countdown timer for review window (optional)

---

## 📋 Implementation Order (Recommended)

### Week 1: Core Backend
```
Day 1-2:
  1. review_controller.py (all 3 endpoints)
  2. Model helper methods
  3. Blueprint registration
  4. Backend tests
```

### Week 2: Frontend
```
Day 1-2:
  1. API utilities + types
  2. SubmissionViewer + PeerReviewForm components
  3. PeerReviewList component
  
Day 3:
  1. Integration with Assignment.tsx
  2. E2E testing
  3. Error handling refinement
```

---

## 🔑 Key Validation Points

### Before Every Endpoint:
```python
# 1. JWT valid & user exists
current_user = User.get_by_email(get_jwt_identity())

# 2. User enrolled in course (for review access)
enrollment = User_Courses.query.filter(
    User_Courses.userID == current_user.id,
    User_Courses.courseID == assignment.courseID
).first()
if not enrollment: return 403

# 3. User is assigned reviewer (for submitting)
if review.reviewerID != current_user.id: return 403

# 4. Review window open (for submitting)
if not review.assignment.is_review_window_open(): return 400
```

---

## 📊 Data Model Summary

```
Review (linking table)
├─ id (PK)
├─ assignmentID (FK)
├─ reviewerID (FK) → student doing review
├─ revieweeID (FK) → student being reviewed
└─ [relationships: assignment, reviewer, reviewee, criteria]

Submission
├─ id (PK)
├─ studentID (FK)
├─ assignmentID (FK)
└─ path (file reference)

Criterion (review feedback)
├─ id (PK)
├─ reviewID (FK)
├─ criterionRowID (FK → CriteriaDescription)
├─ grade (int)
└─ comments (string)

CriteriaDescription (rubric rows)
├─ id (PK)
├─ rubricID (FK)
├─ question (string)
├─ scoreMax (int)
└─ hasScore (bool)

Assignment
├─ id (PK)
├─ courseID (FK)
├─ name
├─ rubric_text
└─ due_date (review window deadline)
```

---

## 🎨 UI Mockup (Pseudo)

### PeerReviewList
```
┌─────────────────────────────────────┐
│ Peer Reviews to Complete            │
│                                     │
│ Review window closes: Feb 15, 11:59 PM
│ ⏱ 5 hours remaining                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Reviewing: Jane Smith      [► View] │
│ │ Status: Pending                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Reviewing: Bob Johnson     [► View] │
│ │ Status: Complete            ✓    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Reviewing: Alice Brown     [► View] │
│ │ Status: Pending                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ You have 2 reviews remaining        │
└─────────────────────────────────────┘
```

### PeerReviewForm
```
┌─────────────────────────────────────┐
│ ✕ Peer Review                       │
├─────────────────────────────────────┤
│ Reviewing: Jane Smith's Work        │
│                                     │
│ [Submission Content - PDF Preview]  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓              │
│                                     │
├─────────────────────────────────────┤
│ Evaluation Rubric                   │
│                                     │
│ ☐ Code Quality          ★★★★☆       │
│   Comments: [text area]             │
│                                     │
│ ☐ Completeness          ★★★★★       │
│   Comments: [text area]             │
│                                     │
│ ☐ Presentation          ★★★☆☆       │
│   Comments: [text area]             │
│                                     │
│ [ Submit Review ] [ Cancel ]        │
│                                     │
│ Review window closes: 5 hours       │
└─────────────────────────────────────┘
```

---

## 🚀 Success Criteria

✅ Student sees correct number of assigned reviews
✅ Student cannot access unassigned reviews (403)
✅ Student cannot submit review after deadline (400)
✅ Submitted review persists in database
✅ Review shows "Complete" status after submission  
✅ Cannot re-edit review after submission (view-only)
✅ Submission content displays correctly
✅ Rubric form validates before submit
✅ Error messages clear and helpful

---

## 💡 Tips

1. **Test with real review window dates**: Create assignments with past/future due dates to test window logic
2. **Use N+1 query prevention**: Always `joinedload()` relationships when fetching reviews
3. **Timezone handling**: Ensure UTC consistency throughout
4. **Submission file serving**: May need separate endpoint for retrieving file content
5. **Criteria validation**: Ensure grade is between 0 and scoreMax

---

## 📚 Reference Files

- Implementation details: `docs/PEER_REVIEW_IMPLEMENTATION.md`
- Database schema: `docs/schema/database-schema.md`
- Existing patterns: `flask_backend/api/controllers/assignment_controller.py`
- Test patterns: `flask_backend/tests/test_*.py`
