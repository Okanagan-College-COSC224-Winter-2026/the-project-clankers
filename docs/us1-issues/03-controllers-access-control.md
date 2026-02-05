# US1 — Controllers & Access Control (Days 2–4)

Owners: Dev B (implement) & Dev A (review)

Timebox: 3 days

Description:
Implement endpoints in `flask_backend/api/controllers/` that list assigned reviews (with count), fetch submission content only if assigned, and accept review submissions.

Tasks:
- Add routes and use `jwt_role_required('student')` where appropriate.
- Enforce review-window and assigned-only access.
- Add pagination & safety checks.
- Write pytest integration tests in `flask_backend/tests/`.

Acceptance:
- Tests confirm unassigned access returns 403 and expired window prevents submission.

Labels: backend, security, US1
