# US1 — Frontend: Assigned Review List (Days 1–3)

Owners: Dev C (lead) + Dev D

Timebox: 3 days

Description:
In `frontend/src/pages/` add `AssignedReviews` page and UI components to surface assigned peer-review items.

Tasks:
- Call `/assignments/:assignment_id/peer_reviews` via `frontend/src/util/api.ts` with `credentials: 'include'`.
- Display assigned count and list.
- Show locked/unassigned badges and handle empty/expired states.

Acceptance:
- List renders assigned items and blocks unassigned access.

Labels: frontend, UI, US1
