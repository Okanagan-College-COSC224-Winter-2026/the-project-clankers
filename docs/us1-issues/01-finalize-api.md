# US1 — Finalize API contract (Day 0)

Owner: BackendLead (Dev A)

Timebox: half-day

Description:
Define the API contract for US1 and lock the request/response shapes. Produce `docs/us1-api.md` with endpoints, status codes, error bodies, cookie auth notes, and example payloads.

Endpoints to specify (examples):
- `GET /assignments/:assignment_id/peer_reviews` — list assigned peer-review items for the current user
- `GET /peer_reviews/:review_id` — fetch submission content (only if assigned)
- `POST /peer_reviews/:review_id/submit` — submit review payload

Acceptance criteria:
- Documented example responses for assigned, unassigned (403), and expired/closed (409 or 403) states.
- Clear cookie-auth instructions: requests must use `credentials: 'include'` and backend uses HTTPOnly cookies.

Labels: backend, doc, US1
