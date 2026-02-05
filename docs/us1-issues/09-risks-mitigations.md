# Risks & Mitigations

Owner: BackendLead (Dev A)

Description:
Key risks and mitigations for the sprint.

Risks:
- DB migration conflicts: keep migrations small and review in PR.
- Cookie/auth edge-cases: add integration tests for cookie auth flows.
- API contract mismatch: freeze contract day 0, iterative PRs.

Mitigations:
- Feature flags; add integration tests; small incremental PRs.

Labels: risk, US1
