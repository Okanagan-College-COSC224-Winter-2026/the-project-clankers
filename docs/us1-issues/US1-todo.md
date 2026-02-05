## US1 — Sprint Todo (Student Peer Review Access)

Reference: see `docs/user_stories.md` (US1)

### Goal
Implement US1 so students can view and complete assigned peer reviews. Target: next Thursday.

### Sprint plan (5 devs)

- **Day 0 (API contract, half-day)** — PO + Backend Lead
  - Deliver: `docs/us1-api.md` with endpoints, request/response, and example payloads.

- **Days 1–2 (DB & Models)** — BackendLead (Dev A) + BackendDev (Dev B)
  - Add/extend SQLAlchemy models for assigned peer reviews, review windows, and completion flags.
  - Add migrations/fixtures.

- **Days 2–4 (Controllers & Access Control)** — Dev B + BackendLead
  - Implement endpoints: list assigned reviews, fetch submission content, submit review.
  - Enforce RBAC (`jwt_role_required`) and review-window checks.
  - Add pytest integration tests under `flask_backend/tests/`.

- **Days 1–3 (Frontend: list & integration)** — FrontendLead (Dev C) + Dev D
  - Implement assigned-review list page, counts, locked/unassigned states.
  - Use `frontend/src/util/api.ts` with `credentials: 'include'`.

- **Days 3–5 (Frontend: review UI & submit flow)** — Dev D + Dev C
  - Implement review form (rubric, comments), block unassigned submissions, disable when window closed.
  - Mark review complete on successful submit.

- **Days 2–6 (Tests & CI)** — Dev E (QA/Dev)
  - Add pytest backend tests, frontend component/E2E tests (Playwright/Cypress), and CI job to run them.

- **Day 6–7 (Merge, QA, docs, demo)** — All
  - Final QA, update `docs/user_stories.md` and `docs/us1-api.md`, prepare demo and deployment notes.

### Acceptance criteria (from US1)

- Student can view a list of peer assignments to review.
- Number of visible assignments matches what was assigned.
- Student cannot open unassigned submissions.
- Opening an assigned submission shows the content and review interface.
- Submitted feedback marks that review as complete.
- If the review period has ended, the student cannot submit feedback and is notified.

### Risks & Mitigations

- DB migration conflicts: keep migrations small; feature-flag DB changes if needed.
- Auth/cookie issues: lock API contract on Day 0; add integration tests for cookie auth.
- Contract mismatch: maintain `docs/us1-api.md` as source-of-truth; small incremental PRs.

### Communication

- Daily 15-min standups; PR review SLA 6–8 hours; CI must pass before merge.
