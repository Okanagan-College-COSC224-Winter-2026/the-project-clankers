# US1 — Frontend: Review Interface & Submit (Days 3–5)

Owners: Dev D (implement) + Dev C (review)

Timebox: 3 days

Description:
Build `ReviewForm` component with rubric, rating, comments, and submit flow.

Tasks:
- Ensure route guard prevents access to unassigned submissions.
- Disable submit when the review window is closed.
- POST review to `/peer_reviews/:review_id/submit` and update UI to 'completed'.

Acceptance:
- On submit, review is marked complete and the list updates accordingly.

Labels: frontend, UI, US1
