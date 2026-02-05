# Peer Review User Story - Implementation Summary

## 📖 Overview

I've created a comprehensive implementation guide for the peer review user story. This document maps the user story requirements to specific technical implementation details.

---

## 📋 Documentation Created

### 1. **PEER_REVIEW_IMPLEMENTATION.md** (Main Reference)
   - **Length**: Detailed (2,500+ lines equivalent of content)
   - **Content**:
     - Complete backend endpoint specifications
     - Frontend component architecture
     - Database queries and optimization patterns
     - Error handling and response formats
     - Testing strategy with specific test cases
     - Implementation roadmap and timeline
   - **Use this when**: Building features, writing tests, designing endpoints

### 2. **PEER_REVIEW_CHECKLIST.md** (Quick Reference)
   - **Length**: Concise (500+ lines)
   - **Content**:
     - ✅ Phase-by-phase checklist (3 phases, 7 days)
     - Task breakdown with specific file locations
     - Implementation order recommendations
     - Key validation points (code snippets)
     - UI mockups (ASCII art)
     - Success criteria checklist
   - **Use this when**: Planning work, tracking progress, quick lookups

### 3. **PEER_REVIEW_ARCHITECTURE.md** (Visual Reference)
   - **Length**: Visual (1,000+ lines)
   - **Content**:
     - ASCII system architecture diagram (full stack)
     - Request/response flow diagrams (3 main flows)
     - Error handling flow diagram
     - State management patterns
     - Security & authorization matrix
     - Database relationships (SQL-level)
   - **Use this when**: Understanding system design, explaining to team mates, debugging

---

## 🎯 How These Map to Your User Story

### User Story Requirement → Implementation

| Story Element | Implementation Location | Key Files |
|---|---|---|
| **Student signed in** | JWT auth via HTTPOnly cookies | `flask_backend/api/controllers/auth_controller.py` (existing) |
| **Enrolled in class** | User_Courses enrollment check | `review_controller.py` (to create) |
| **Instructor created assignment** | Assignment model with due_date | `flask_backend/api/models/assignment_model.py` (enhance) |
| **Peer reviews assigned** | Review model linking reviewer→reviewee | `flask_backend/api/models/review_model.py` (existing) |
| **Review window open** | Check `assignment.due_date > now` | `PEER_REVIEW_IMPLEMENTATION.md` §Backend Validation |
| | | |
| **Student can view list** | `GET /review/my-reviews/{assignment_id}` | `review_controller.py` Endpoint 1 |
| **Count matches assignment** | Query filter by `reviewerID=student_id` | `PEER_REVIEW_IMPLEMENTATION.md` §Database Queries |
| **Cannot open unassigned** | Authorization check: `reviewerID != current_user` | `PEER_REVIEW_IMPLEMENTATION.md` §Authorization |
| **Shows content & interface** | `GET /review/{review_id}` returns submission + rubric | `review_controller.py` Endpoint 2 |
| **Submit marks complete** | `POST /review/{id}/submit` saves Criterion rows | `review_controller.py` Endpoint 3 |
| **Period ended → no submit** | Check `is_review_window_open()` before POST | `PEER_REVIEW_CHECKLIST.md` §Key Validation |

---

## 🏗️ Architecture Summary

### Backend (Flask)
```
review_controller.py (NEW) ← review_model.py (enhanced)
     ↓
  3 endpoints
     ├─ GET /review/my-reviews/{assignment_id}  ← List assigned reviews
     ├─ GET /review/{review_id}                 ← Get review details
     └─ POST /review/{review_id}/submit         ← Submit feedback
```

### Frontend (React)
```
PeerReviewList.tsx (NEW)
     ├─ Fetches: GET /review/my-reviews/{x}
     └─ Shows: [Review1, Review2, ...] with status

PeerReviewForm.tsx (NEW) ← Opened from PeerReviewList
     ├─ Fetches: GET /review/{id}
     ├─ Shows: SubmissionViewer.tsx + Rubric form
     └─ Submits: POST /review/{id}/submit

Assignment.tsx (ENHANCE)
     └─ Includes: <PeerReviewList /> section
```

### Database (SQL)
```
Review (existing)
   ├─ reviewerID → Student doing review
   ├─ revieweeID → Student being reviewed
   └─ assignmentID → Links to assignment

Submission (existing)
   ├─ studentID → Who submitted
   └─ path → File/content reference

Criterion (existing)
   ├─ reviewID → Which review
   ├─ grade → Reviewer's score
   └─ comments → Feedback

Assignment (existing, ENHANCE)
   └─ due_date → Review window deadline
```

---

## 📊 Implementation Phases

### Phase 1: Backend (Days 1-2)
**Deliverables:**
- ✅ `flask_backend/api/controllers/review_controller.py` (3 endpoints)
- ✅ Enhanced models (`Assignment.is_review_window_open()`, `Review.is_complete()`)
- ✅ Blueprint registration in `__init__.py`
- ✅ Tests: `test_peer_review.py`

**Acceptance Criteria:**
- Endpoints respond with correct status codes
- Authorization checks work (403 for unassigned)
- Window check prevents submit when closed (400)
- All tests pass

### Phase 2: Frontend (Days 3-4)
**Deliverables:**
- ✅ `PeerReviewList.tsx` (list of reviews)
- ✅ `PeerReviewForm.tsx` (review interface)
- ✅ `SubmissionViewer.tsx` (display submission)
- ✅ API utilities in `util/api.ts`
- ✅ TypeScript types
- ✅ Integration with `Assignment.tsx`

**Acceptance Criteria:**
- Correct number of reviews displayed
- Cannot access unassigned reviews
- Form submits successfully
- Status updates to "Complete"

### Phase 3: Integration (Days 5-6)
**Deliverables:**
- ✅ E2E testing (happy path + errors)
- ✅ Error handling refinement
- ✅ UI polish (spinners, toasts, responsive)

**Acceptance Criteria:**
- All user story requirements met
- Error messages helpful
- Performance acceptable (<200ms response)

---

## 🔑 Key Implementation Details

### Authorization Pattern
```python
# Every endpoint must check:
if review.reviewerID != current_user.id:
    return 403  # Not assigned

if not User_Courses.query.filter(...).first():
    return 403  # Not enrolled

if not review.assignment.is_review_window_open():
    return 400  # Window closed
```

### API Response Pattern
```python
# GET /review/my-reviews/{id}
{
    "reviews": [ReviewData],
    "reviewWindowOpen": boolean,
    "reviewWindowClosesAt": "ISO-8601"
}

# POST /review/{id}/submit
{
    "msg": "Review submitted successfully",
    "review": ReviewData,
    "markedComplete": boolean
}
```

### Frontend State Pattern
```typescript
// PeerReviewList
const [reviews, setReviews] = useState<ReviewData[]>([]);
const [windowOpen, setWindowOpen] = useState(true);
const [loading, setLoading] = useState(true);

// PeerReviewForm
const [criteria, setCriteria] = useState(new Map());
const [submitted, setSubmitted] = useState(false);
const [windowClosed, setWindowClosed] = useState(false);
```

---

## ✅ Acceptance Criteria Checklist

| Criteria | How It's Implemented | Test |
|---|---|---|
| Student can view assigned reviews | `GET /review/my-reviews/{id}` returns filtered list | `test_get_my_reviews_success` |
| Count matches what assigned | Query: `WHERE reviewerID = user_id` | `test_get_my_reviews_count` |
| Cannot open unassigned | `reviewerID != current_user.id` → 403 | `test_unauthorized_review_submission` |
| Shows content & interface | `GET /review/{id}` + SubmissionViewer + Rubric | Integration test |
| Submitted marks complete | Save Criterion rows + `is_complete()=true` | `test_review_completion_status` |
| Window closed → no submit | `assignment.is_review_window_open()` → 400 | `test_submit_review_window_closed` |
| Window closed → notified | Response includes error message + `closedAt` | Integration test |

---

## 🎨 UI Component Hierarchy

```
Assignment.tsx
├─ <PeerReviewList /> ─────────────────────────────┐
│  ├─ Lists reviews                               │
│  ├─ Shows: reviewee, status, time remaining     │
│  ├─ Button [Open Review] ┐                      │
│  │                       └─────────┐            │
│  │                                 ↓ opens      │
│  └─ State: reviews[], loading, selected        │
│                                                 │
├─ Modal / Drawer ─────────────────────────────────┤ (conditional)
│  └─ <PeerReviewForm /> ◄─ Passed reviewId      │
│     ├─ <SubmissionViewer />                     │
│     │  ├─ Shows file/content                    │
│     │  └─ Metadata (date, size)                 │
│     ├─ Rubric Section                           │
│     │  └─ For each criterion:                   │
│     │     ├─ Question                           │
│     │     ├─ Score input (stars/slider)         │
│     │     └─ Comments textarea                  │
│     ├─ [Submit Review] button                   │
│     ├─ Window status + countdown                │
│     └─ State: submission, rubric, criteria...   │
│                                                 │
└─ Home.tsx (Dashboard) ──────────────────────────┤
   ├─ Widget: "Pending Reviews"                  │
   │  ├─ Count of outstanding reviews            │
   │  ├─ Earliest deadline                        │
   │  └─ Link to assignments                      │
   └─ State: pendingCount, earliestDue            │
```

---

## 🧪 Testing Strategy

### Backend Tests (pytest)
```python
# test_peer_review.py
test_get_my_reviews_success()
test_get_my_reviews_count()
test_get_other_reviews_forbidden()
test_submit_review_window_closed()
test_unauthorized_review_submission()
test_review_window_check()
test_review_completion_status()
```

### Frontend Tests (React Testing Library)
```typescript
// PeerReviewList.test.tsx
Fetches and displays correct count
Filters out unassigned reviews
Shows deadline countdown
Links work correctly

// PeerReviewForm.test.tsx
Displays submission content
Rubric renders with correct criteria
Submit button disabled when window closed
Success message shown after submit
Error messages display (403, 400, etc)
```

### E2E Tests (Cypress/Playwright)
```javascript
// e2e: Student peer review workflow
1. Log in as student
2. Navigate to assignment with peer reviews
3. See "3 reviews to complete"
4. Click first review
5. See submission content
6. Fill rubric (scores + comments)
7. Click "Submit Review"
8. See "Complete" status
9. Verify cannot re-submit
```

---

## 📈 Next Steps

1. **Read the detailed guide**: Start with `PEER_REVIEW_IMPLEMENTATION.md`
2. **Review the checklist**: Use `PEER_REVIEW_CHECKLIST.md` for daily progress
3. **Reference architecture**: Check `PEER_REVIEW_ARCHITECTURE.md` when designing components
4. **Execute Phase 1**: Create `review_controller.py` following Endpoint specifications
5. **Write tests**: Add tests in `test_peer_review.py` as you build
6. **Build frontend**: Create components following the component hierarchy
7. **Integrate & test**: E2E testing with real workflows

---

## 📚 Reference Files

| Document | Purpose | Read When |
|---|---|---|
| `PEER_REVIEW_IMPLEMENTATION.md` | Detailed specifications | Building features, writing code |
| `PEER_REVIEW_CHECKLIST.md` | Quick reference & tracking | Daily standup, quick lookups |
| `PEER_REVIEW_ARCHITECTURE.md` | Visual system design | Team presentations, debugging |
| **Existing Code** | Reference patterns | Writing new controllers/components |
| `flask_backend/api/controllers/assignment_controller.py` | Flask controller pattern | Building review_controller.py |
| `flask_backend/tests/test_assignments.py` | Test patterns | Writing test_peer_review.py |
| `frontend/src/pages/Assignment.tsx` | Component patterns | Building peer review components |

---

## 💡 Key Insights

1. **Models Exist**: Review, Submission, User, Assignment, Criterion - all already defined. You're mostly wiring endpoints.

2. **Pattern Matching**: The project follows consistent Flask/React patterns. Copy from `assignment_controller.py` and `Assignment.tsx`.

3. **Authorization First**: Every endpoint must verify JWT + enrollment + reviewer assignment. Do this first.

4. **Window Validation**: The `due_date` field already exists on Assignment. Use `is_review_window_open()` method in both backend AND frontend.

5. **Database Ready**: All tables exist with proper relationships. No migrations needed.

6. **Testing Priority**: Write tests alongside code. The existing tests (`test_assignments.py`, `test_model.py`) show the pattern.

---

## 🚀 Quick Command Reference

```bash
# Run Flask backend
cd flask_backend
flask --app api run

# Run tests
pytest tests/test_peer_review.py -v

# Run frontend
cd frontend
npm run dev

# Database
flask init_db              # Initialize
flask add_users            # Add sample users
sqlite3 instance/app.sqlite  # Open DB
```

---

## ❓ FAQ

**Q: Can I start on frontend before backend?**
A: No - frontend calls backend endpoints. Backend must exist first.

**Q: Do I need to create the Review model?**
A: No - Review model already exists. Just add helper methods.

**Q: How do I handle file uploads/submissions?**
A: The Submission.path field stores reference. May need separate file serving endpoint (out of scope for this story).

**Q: What about rubric selection?**
A: Assignment.rubric_text stores the rubric. Expand if needed for multiple rubrics.

**Q: Can students edit their review after submitting?**
A: Story says "complete" = final. Design as view-only after submit (can be changed later).

