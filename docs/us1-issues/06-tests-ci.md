# US1 — Tests: Backend + Frontend + E2E (Days 2–6)

Owner: Dev E (QA/DevOps)

Timebox: 5 days (parallel ok)

Description:
Add tests to cover acceptance criteria end-to-end and gate merges with CI.

Tasks:
- Add pytest integration tests for controllers and model logic under `flask_backend/tests/`.
- Add frontend component tests and one E2E scenario (login -> view assigned -> open -> submit) using Playwright or Cypress.
- Add a GitHub Actions workflow to run backend and frontend tests on PRs.

Acceptance:
- CI job runs on PRs and passes for implemented features.

Labels: test, ci, US1
