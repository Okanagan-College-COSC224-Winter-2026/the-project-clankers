# US1 — DB & Models (Days 1–2)

Owners: Dev A + Dev B

Timebox: 2 days

Description:
Extend `flask_backend/api/models/` to model assigned peer reviews, review window (start/end), completion flag, and reviewer->submission mapping.

Tasks:
- Add/modify SQLAlchemy models: `review_model.py`, `submission_model.py`.
- Write migration or `flask` CLI seed fixture.
- Add sample fixtures under `flask_backend/tests/fixtures/`.

Acceptance:
- DB can return assigned reviews for a given `user_id`.

Labels: backend, db, US1
