# User Stories Status Report
**Updated:** April 14, 2026

## ✅ Completed User Stories (25)

| ID | Title | Stack |
|----|-------|-------|
| US1 | Automated Peer Evaluation | Full Stack |
| US2 | Group Contribution Evaluation | Full Stack |
| US3 | Anonymous / Non-Anonymous Peer Review | Full Stack |
| US4 | Class and Assignment Creation | Full Stack |
| US5 | Grade Book and Student Progress Dashboard | Full Stack |
| US6 | Admin User Management | Full Stack |
| US7 | User Registration | Full Stack |
| US9 | Assignment Management Interface | Full Stack |
| US10 | Data Privacy and Security | Full Stack |
| US11 | Rubric Creation | Full Stack |
| US12 | Student Feedback Viewing | Full Stack |
| US13 | Password Management | Full Stack |
| US14 | Teacher Dashboard | Full Stack |
| US15 | Course Page Shows Assignments | Full Stack |
| US16 | Student Login After Roster Upload | Full Stack |
| US17 | Student Course Search | Full Stack |
| US19 | Student Access Registered Courses | Full Stack |
| US20 | Student Course Grade on Course Card | Full Stack |
| US21 | Student Profile Viewing | Full Stack |
| US22 | Student View Team Submissions | Full Stack |
| US24 | Developer Documentation | Documentation |
| US25 | Teacher Account Provisioning | Full Stack |
| US27 | Password View Toggle | Frontend |
| US28 | Course-Level Group Management | Full Stack |
| US29 | Peer Evaluation Settings & Assignments | Full Stack |

---

## 🔄 In-Progress User Stories (2)

| ID | Title | Type | Stack | Notes |
|----|-------|------|-------|-------|
| US8 | UI Polish, Validation & Cross-Platform | Bug/Enhancement | Frontend | Ongoing styling and usability improvements |
| US23 | Peer Review Scope Configuration | Feature | Full Stack | Internal/external review model fields exist; UI configuration pending |

---

## 📋 Backlog (2)

| ID | Title | Type | Stack | Description |
|----|-------|------|-------|-------------|
| US18 | Student Registration (Roster-Matched) | Feature | Full Stack | Students self-register and match to roster entries |
| US26 | (Merged into US6) | — | — | Consolidated into Admin User Management |

---

## 📊 Summary Statistics

- **Total User Stories:** 29
- **Completed:** 25 (86%)
- **In-Progress:** 2 (7%)
- **Backlog:** 2 (7%)

---

## 📝 Notes

- **US26** was consolidated into US6 (Admin User Management)
- **US16** has comprehensive implementation with 12 passing tests
- **US28** has 31 passing tests for group management
- The Assignment model supports `anonymous_review`, `internal_review`, `external_review`, `peer_review_start_date`, and `peer_review_due_date` fields
- Gradebook includes grade policies, grade overrides, course total overrides, and letter grade calculations
- 18 test files cover backend functionality with pytest
