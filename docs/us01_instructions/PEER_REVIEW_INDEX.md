# 📖 Peer Review User Story - Documentation Index

## 🎯 Start Here

**New to this implementation?** → Start with [**PEER_REVIEW_SUMMARY.md**](./PEER_REVIEW_SUMMARY.md)
- 5-minute overview
- Maps user story to code
- Shows all 4 documents and their purpose

---

## 📚 The 4 Documentation Files

### 1️⃣ PEER_REVIEW_SUMMARY.md
**Your entry point & navigation hub**

- 📊 Overview of all documentation
- 🗺️ Maps story requirements to implementation
- 📋 Phase breakdown with deliverables
- ✅ Acceptance criteria checklist
- 🎨 Component hierarchy
- 📚 Reference guide to all files
- ❓ FAQ

| Use Case | Suggested Reading Order |
|----------|------------------------|
| "I'm new to this project" | Summary → Checklist → Implementation |
| "I need to know what to build" | Summary → Architecture |
| "I'm starting Phase 1 (backend)" | Implementation → Checklist |
| "I'm starting Phase 2 (frontend)" | Checklist → Architecture → Implementation |
| "I need to understand the full system" | Architecture → Implementation → Checklist |
| "I'm in standup and need quick status" | Checklist (Phase X checklist) |

---

### 2️⃣ PEER_REVIEW_CHECKLIST.md
**Your daily tactical reference**

- ✅ Phase-by-phase breakdown (3 phases, 7 days)
- 🎯 Specific file locations & tasks
- 📝 Implementation order recommendations
- 🔐 Key validation points (code snippets)
- 🎨 ASCII UI mockups
- ⚡ Quick command reference

**Perfect for:**
- Planning your day
- Tracking what's done/in-progress
- Looking up specific code patterns
- Quick answers ("what file do I edit first?")

---

### 3️⃣ PEER_REVIEW_IMPLEMENTATION.md
**Your detailed technical reference**

- 📋 Complete endpoint specifications (request/response)
- 🗃️ Database queries & optimization patterns
- 🔐 Authorization & validation logic
- 🎨 Frontend component architecture
- 📊 API contract (request/response JSON)
- 🧪 Testing strategy with test names
- 📈 Implementation roadmap

**Perfect for:**
- Writing backend endpoints
- Understanding data flow
- Writing tests
- Designing frontend components
- Error handling specifics

**Sections:**
- Backend Implementation (6 subsections)
- Frontend Implementation (4 subsections)
- Testing Strategy
- Implementation Roadmap

---

### 4️⃣ PEER_REVIEW_ARCHITECTURE.md
**Your visual & system design reference**

- 🏗️ Full-stack ASCII architecture diagram
- 🔄 Request/response flow diagrams (3 flows)
- ❌ Error handling flow diagram
- 🧠 State management patterns
- 🔒 Security & authorization matrix
- 💾 Database relationships (SQL)

**Perfect for:**
- Understanding system design
- Explaining to team members
- Debugging issues
- Design reviews
- Understanding data relationships

**Diagrams:**
1. Full system architecture (UI → API → DB)
2. Get list of reviews flow
3. Open review & fetch details flow
4. Submit review feedback flow
5. Error handling scenarios
6. Authorization matrix
7. SQL relationships

---

## 🗺️ Content Map by Topic

### Backend Development
**File to Edit:** `flask_backend/api/controllers/review_controller.py`

| What | Where | Doc |
|------|-------|-----|
| What endpoints to build | Implementation §Backend | IMPLEMENTATION |
| Endpoint specifications | Implementation §Full Backend Implementation | IMPLEMENTATION |
| Authorization checks | Implementation §Validation & Authorization | IMPLEMENTATION |
| Database queries | Implementation §Database Queries | IMPLEMENTATION |
| Error responses | Implementation §Error Responses | IMPLEMENTATION |
| Model enhancements | Checklist §1.3 Enhance Models | CHECKLIST |
| Test cases | Implementation §Testing Strategy | IMPLEMENTATION |

### Frontend Development
**File to Create:** `frontend/src/pages/PeerReviewList.tsx`, `PeerReviewForm.tsx`

| What | Where | Doc |
|------|-------|-----|
| Component architecture | Implementation §Frontend Implementation | IMPLEMENTATION |
| Component specs | Implementation §1.1-1.4 | IMPLEMENTATION |
| API utilities | Implementation §3 + Checklist §2.3 | IMPLEMENTATION |
| TypeScript types | Implementation §4 + Checklist §2.4 | IMPLEMENTATION |
| Component hierarchy | Summary §UI Component Hierarchy | SUMMARY |
| State patterns | Architecture §State Management | ARCHITECTURE |

### Database & Queries
| What | Where | Doc |
|------|-------|-----|
| Models (existing) | Implementation §2-3 | IMPLEMENTATION |
| Relationships | Architecture §Database Relationships | ARCHITECTURE |
| Queries & optimization | Implementation §5 (Database Queries) | IMPLEMENTATION |
| Validation logic | Implementation §4 (Validation) | IMPLEMENTATION |

### Testing
| What | Where | Doc |
|------|-------|-----|
| Backend test cases | Implementation §Testing Strategy | IMPLEMENTATION |
| Test patterns | Checklist §3 Integration Testing | CHECKLIST |
| Test files | Checklist §1.5 Write Tests | CHECKLIST |

### Authorization & Security
| What | Where | Doc |
|------|-------|-----|
| Authorization pattern | Implementation §4 (Validation) | IMPLEMENTATION |
| Authorization matrix | Architecture §Security & Access Control | ARCHITECTURE |
| Checks needed | Checklist §Key Validation Points | CHECKLIST |

### API Contract
| What | Where | Doc |
|------|-------|-----|
| All endpoints | Implementation §Backend Implementation | IMPLEMENTATION |
| Request/response format | Implementation §Frontend/Backend Contract | IMPLEMENTATION |
| Error responses | Implementation §Error Responses | IMPLEMENTATION |
| Request flows | Architecture §Request/Response Flow | ARCHITECTURE |

---

## 📅 Day-by-Day Reference

### Day 1: Planning & Setup
- Read: SUMMARY (5 min) → ARCHITECTURE (10 min) → CHECKLIST Phase 1.1-1.2 (5 min)
- Do: Set up development environment, review existing code patterns
- Reference: IMPLEMENTATION §Backend Implementation overview

### Day 2-3: Backend Development
- Read: IMPLEMENTATION §Backend Implementation (detailed)
- Do: Create `review_controller.py` with 3 endpoints
- Reference: CHECKLIST §1.1-1.5, existing `assignment_controller.py`
- Test: Write test cases following IMPLEMENTATION §Testing

### Day 4-5: Frontend Development
- Read: IMPLEMENTATION §Frontend Implementation (detailed)
- Do: Create components, add API utilities
- Reference: CHECKLIST §2.1-2.4, ARCHITECTURE §System Architecture
- Test: Component tests

### Day 6: Integration
- Read: CHECKLIST §3 Integration Testing
- Do: E2E testing, error handling
- Reference: ARCHITECTURE §Error Handling Flow

### Day 7: Polish & Documentation
- Test all acceptance criteria (SUMMARY §Acceptance Criteria)
- Final review against user story requirements
- Update code comments & documentation

---

## 🎓 Learning Paths

### "I want to understand the whole system"
1. SUMMARY (5 min)
2. ARCHITECTURE - System Architecture Diagram (10 min)
3. ARCHITECTURE - Request/Response Flows (15 min)
4. CHECKLIST - Overview (3 min)
5. IMPLEMENTATION - Overview (5 min)

### "I want to implement the backend"
1. SUMMARY §Key Implementation Details (5 min)
2. IMPLEMENTATION §Backend Implementation (30 min) specifically:
   - §1 New Review Controller Endpoints (20 min)
   - §2 Update Review Model (5 min) 
   - §3 Update Assignment Model (2 min)
3. CHECKLIST §Phase 1 (10 min)
4. IMPLEMENTATION §Testing Strategy (10 min)

### "I want to implement the frontend"
1. ARCHITECTURE §System Architecture Diagram (10 min)
2. CHECKLIST §Phase 2 (15 min)
3. IMPLEMENTATION §Frontend Implementation (20 min)
4. IMPLEMENTATION §Frontend/Backend Contract (5 min)

### "I'm debugging a specific issue"
1. ARCHITECTURE - Find relevant flow diagram
2. IMPLEMENTATION - Find validation/error section
3. CHECKLIST - Find Key Validation Points
4. Code itself

---

## 🔍 Quick Reference by Question

**"What endpoints do I need to build?"**
→ CHECKLIST §Phase 1.1 OR IMPLEMENTATION §Backend Implementation §1

**"How do I authorize users?"**
→ CHECKLIST §Key Validation Points OR ARCHITECTURE §Security & Access Control

**"What's the database schema?"**
→ ARCHITECTURE §Database Relationships OR docs/schema/database-schema.md

**"What components do I need?"**
→ CHECKLIST §Phase 2.1 OR IMPLEMENTATION §Frontend Implementation §1

**"What should the API response look like?"**
→ IMPLEMENTATION §Backend Implementation §1. (for each endpoint)

**"How do I test this?"**
→ CHECKLIST §Phase 3 OR IMPLEMENTATION §Testing Strategy

**"What if the review window closes?"**
→ CHECKLIST §Key Validation Points #4 OR IMPLEMENTATION §Backend Implementation §3

**"How do I handle errors?"**
→ IMPLEMENTATION §Error Responses OR ARCHITECTURE §Error Handling Flow

**"What TypeScript types do I need?"**
→ CHECKLIST §2.4 OR IMPLEMENTATION §Frontend Implementation §4

**"Which files do I need to create/modify?"**
→ CHECKLIST §Implementation Order

---

## 📊 Document Statistics

| Document | Length | Sections | Code Examples |
|----------|--------|----------|---|
| PEER_REVIEW_SUMMARY.md | ~600 lines | 10 | 3 |
| PEER_REVIEW_CHECKLIST.md | ~400 lines | 8 | 5 |
| PEER_REVIEW_IMPLEMENTATION.md | ~1000 lines | 16 | 15+ |
| PEER_REVIEW_ARCHITECTURE.md | ~800 lines | 8 | 8+ |
| **TOTAL** | **~2800 lines** | **42** | **30+** |

---

## ✅ Getting Started (Right Now)

**If you have 5 minutes:**
→ Read SUMMARY

**If you have 15 minutes:**
→ Read SUMMARY + ARCHITECTURE (System Architecture Diagram)

**If you have 30 minutes:**
→ Read SUMMARY + ARCHITECTURE (all diagrams) + CHECKLIST (Phase 1 overview)

**If you have 1 hour:**
→ Read SUMMARY + CHECKLIST + ARCHITECTURE, skim IMPLEMENTATION

**If you have 2+ hours:**
→ Read all documents in order: SUMMARY → CHECKLIST → ARCHITECTURE → IMPLEMENTATION

---

## 💾 File Locations

All documentation is in: `docs/`

```
docs/
├── PEER_REVIEW_SUMMARY.md          ← Start here!
├── PEER_REVIEW_CHECKLIST.md        ← Daily reference
├── PEER_REVIEW_ARCHITECTURE.md     ← Visual reference
├── PEER_REVIEW_IMPLEMENTATION.md   ← Detailed specs
├── schema/
│   └── database-schema.md          ← Existing models
└── dev-guidelines/
    ├── ENDPOINT_SUMMARY.md         ← Existing endpoints
    └── ROLE_PERMISSION_SUMMARY.md  ← Auth patterns
```

---

## 🔗 Cross-Document Navigation

**In SUMMARY:** Links to specific sections in IMPLEMENTATION, CHECKLIST, ARCHITECTURE
**In CHECKLIST:** Links to IMPLEMENTATION for details, reference existing code patterns
**In ARCHITECTURE:** Diagrams that explain concepts from IMPLEMENTATION
**In IMPLEMENTATION:** References to CHECKLIST for task breakdown, ARCHITECTURE for visual context

---

## 📞 Quick Answers

**"Where's the code I need to write?"**
- Backend: `flask_backend/api/controllers/review_controller.py`
- Frontend: `frontend/src/pages/PeerReviewList.tsx`, `PeerReviewForm.tsx`, `SubmissionViewer.tsx`
- Tests: `flask_backend/tests/test_peer_review.py`

**"What existing code should I reference?"**
- Controllers: `flask_backend/api/controllers/assignment_controller.py` (pattern)
- Tests: `flask_backend/tests/test_assignments.py` (test pattern)
- Frontend: `frontend/src/pages/Assignment.tsx` (component pattern)
- Models: `flask_backend/api/models/review_model.py`, `assignment_model.py` (exist)

**"How long will this take?"**
- Backend: 2-3 days (3 endpoints + models + tests)
- Frontend: 2-3 days (3 components + API + integration)
- Testing & Polish: 1-2 days
- Total: ~7 days for full implementation

**"Do I need to create new database tables?"**
No - all tables (Review, Submission, Criterion, Assignment, User, etc.) already exist.

---

## Notes for Teams

If working as a team:

1. **Backend Dev** → Use IMPLEMENTATION for detailed specs, CHECKLIST for task tracking
2. **Frontend Dev** → Use IMPLEMENTATION for API contract, ARCHITECTURE for data flow
3. **QA/Testing** → Use CHECKLIST §Phase 3 + IMPLEMENTATION §Testing Strategy
4. **Product Manager** → Use SUMMARY for requirements mapping, ARCHITECTURE for system design
5. **Tech Lead** → Keep all 4 docs handy for design reviews, pair programming, and debugging

---

## Checklist to Start Now

- [ ] Read PEER_REVIEW_SUMMARY.md (5 min)
- [ ] Skim PEER_REVIEW_CHECKLIST.md (5 min)
- [ ] Review existing code patterns:
  - [ ] `flask_backend/api/controllers/assignment_controller.py`
  - [ ] `flask_backend/api/models/review_model.py`
  - [ ] `frontend/src/pages/Assignment.tsx`
- [ ] Set up development environment
  - [ ] Backend: `cd flask_backend && pip install -e . && pip install -r requirements-dev.txt`
  - [ ] Frontend: `cd frontend && npm install`
- [ ] Create feature branch: `git checkout -b feat/peer-review`
- [ ] Read PEER_REVIEW_IMPLEMENTATION.md §Backend Implementation (detailed phase)
- [ ] Start coding Phase 1!

---

## Questions?

Refer to:
- **"What should this look like?"** → ARCHITECTURE (diagrams)
- **"What code do I write?"** → IMPLEMENTATION (specs + examples)
- **"What's my task for today?"** → CHECKLIST (phases + tasks)
- **"How does it fit together?"** → SUMMARY (relationships + flows)

Happy implementing! 🚀

