# User Stories Status Report
**Generated:** March 9, 2026

## ✅ Completed User Stories (11)

| ID | Title | Stack |
|----|-------|-------|
| US4 | Class and Assignment Creation | Full Stack |
| US7 | User Registration | Full Stack |
| US9 | Assignment Management Interface | Full Stack |
| US10 | Data Privacy and Security | Full Stack |
| US11 | Rubric Creation | Full Stack |
| US16 | Student Login After Roster Upload | Full Stack |
| US19 | Student Access Registered Courses | Full Stack |
| US21 | Student Profile Viewing | Full Stack |
| US24 | Developer Documentation | Documentation |
| US28 | Course-Level Group Management | Full Stack |

---

## 🔄 In-Progress User Stories (5)

| ID | Title | Type | Stack | Notes |
|----|-------|------|-------|-------|
| US6 | Admin User Management | Feature | Full Stack | Partial implementation exists |
| US8 | UI Polish, Validation & Cross-Platform | Bug/Enhancement | Frontend | Multiple styling issues in fix_notes.md |
| US14 | Teacher Dashboard | Feature | Frontend | Partial implementation |
| US15 | Course Page Shows Assignments | Feature | Frontend | Partial implementation |
| US27 | Password View Toggle | Feature | Frontend | In Review - has implementation doc |

---

## 📋 Backlog - Prioritized by Criticality

### P0 - Critical (Core Peer Review Functionality)

These are **blocking** features for the peer review system to function.

| ID | Title | Type | Stack | Description |
|----|-------|------|-------|-------------|
| **US1** | **Automated Peer Evaluation** | Feature | Full Stack | Auto-assign peer reviews to all students (including self). **BLOCKER** for peer review system |
| **US29** | **Peer Evaluation Settings & Assignments** | Feature | Full Stack | Configure anonymity, scope, deadline per assignment. **Required for US1** |
| **US5** | **Grade Book and Student Progress Dashboard** | Feature | Full Stack | View grades, submissions, peer eval status. Override grades. Clickable student names to view submissions + evaluations |
| **US22** | **Student View Team Submissions** | Feature | Full Stack | Students see team member submissions with status (submitted/late/missing) to review |

**Priority Count:** 4 stories

---

### P1 - High Priority (Essential Features)

Important for complete user experience and peer review workflow.

| ID | Title | Type | Stack | Description |
|----|-------|------|-------|-------------|
| **US2** | **Group Contribution Evaluation** | Feature | Full Stack | Students evaluate peers based on scope (own group vs other groups) |
| **US3** | **Anonymous / Non-Anonymous Peer Review** | Feature | Full Stack | Toggle anonymous reviews per assignment |
| **US23** | **Peer Review Scope Configuration** | Feature | Backend + Settings UI | Toggle: review team members only OR all groups |
| **US12** | **Student Feedback Viewing** | Feature | Frontend | Students view received peer feedback |
| **US20** | **Student Course Grade on Course Card** | Feature | Frontend | Display grade on course card, auto-updates per evaluation |

**Priority Count:** 5 stories

---

### P2 - Nice to Have (Enhanced Functionality)

Secondary features that improve experience but not critical for MVP.

| ID | Title | Type | Stack | Description |
|----|-------|------|-------|-------------|
| **US13** | **Teacher Change Password** | Feature | Full Stack | Password management for teachers |
| **US17** | **Student Course Search** | Feature | Frontend | Search/discover courses |
| **US18** | **Student Registration (Roster-Matched)** | Feature | Full Stack | Alternative to roster upload - students self-register |
| **US25** | **Teacher Account Provisioning** | Feature | Backend + Admin UI | Admins create teacher accounts |

**Priority Count:** 4 stories

---

## 📊 Summary Statistics

- **Total User Stories:** 29
- **Completed:** 11 (38%)
- **In-Progress:** 5 (17%)
- **Backlog:** 13 (45%)
  - P0 (Critical): 4
  - P1 (High): 5
  - P2 (Nice to Have): 4

---

## 🎯 Recommended Implementation Order

### Sprint 1 - Core Peer Review (P0)
1. **US29** - Peer Evaluation Settings (Backend models + Settings tab UI)
2. **US1** - Automated Peer Evaluation (Auto-assign logic)
3. **US22** - Student View Team Submissions (Submission viewing UI)
4. **US5** - Grade Book (Grade calculation + override UI)

### Sprint 2 - Review Features (P1)
5. **US2** - Group Contribution Evaluation (Review submission logic)
6. **US3** - Anonymous Review Toggle (Identity masking)
7. **US23** - Scope Configuration (Team vs All Groups toggle)
8. **US12** - Student Feedback Viewing (Feedback display)
9. **US20** - Grade on Course Card (Grade display)

### Sprint 3 - Polish & Secondary Features (P2 + In-Progress)
10. Complete **US6, US8, US14, US15, US27** (In-Progress items)
11. **US13, US17, US18, US25** (P2 features as needed)

---

## 🔧 Technical Breakdown

### Backend Work Required
- US1: Review auto-assignment logic
- US29: Assignment model updates (anonymous_review, evaluation_scope, peer_eval_deadline)
- US5: Grade calculation + override endpoints
- US2: Review submission endpoints
- US23: Scope validation logic
- US13, US18, US25: CRUD endpoints

### Frontend Work Required
- US29: Settings tab UI
- US22: Submission viewing UI
- US5: Grade book interface
- US3: Anonymous review UI handling
- US12: Feedback display
- US20: Grade badge on course cards
- US17: Search interface

### Full Stack Integration
- US1: Frontend review assignment + Backend auto-generation
- US2: Review form + submission handling
- US5: Grade book UI + calculation backend

---

## 🐛 Known Bugs (from fix_notes.md)

These should be addressed alongside US8:

1. HTML styling on sign-up / log-in (elements off centered)
2. Reload site after deleting rubric criteria
3. Be able to edit existing criteria without delete/add
4. Fix score keyboard input to remove the appended 0
5. Add rubric score limit
6. Groups need randomization with even distribution

---

## 📝 Notes

- **US26** is marked as "Merged" (consolidated into US6)
- **US16** has comprehensive implementation with 12 passing tests
- **US28** has 31 passing tests for group management
- Current tabs structure: Home | Members | Groups | Settings | Submissions (per US9 update)
- All P0 features must integrate with existing group management (US28)
