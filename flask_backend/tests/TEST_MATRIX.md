# Peer Evaluation Test Matrix

## Quick Reference: Test Coverage Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PEER REVIEW TYPE MATRIX                              │
└─────────────────────────────────────────────────────────────────────────┘

INDIVIDUAL ASSIGNMENTS
├─ External Review ONLY
│  ├─ Named (Student → Student)                    ✅ test_individual_external_review_named
│  └─ Anonymous (Student → Student)                ✅ test_individual_external_review_anonymous
└─ No Reviews Allowed                              ✅ test_assignment_without_reviews_enabled


GROUP ASSIGNMENTS
├─ Internal Review ONLY
│  ├─ Named (Teammate → Teammate)                  ✅ test_group_internal_review_named
│  └─ Anonymous (Teammate → Teammate)              ✅ test_group_internal_review_anonymous
│
├─ External Review ONLY
│  ├─ Named (Group member → Other Group)           ✅ test_group_external_review_named
│  └─ Anonymous (Group member → Other Group)       ✅ test_group_external_review_anonymous
│
└─ Internal + External (BOTH)
   ├─ Named                     ✅ test_group_assignment_both_internal_and_external_reviews
   └─ Anonymous                          (covered by combined test)
```

## Running Tests

### Run All Peer Review Tests
```bash
pytest flask_backend/tests/test_peer_reviews.py -v
```

### Run Specific Test Class
```bash
pytest flask_backend/tests/test_peer_reviews.py::TestIndividualAssignmentExternalReview -v
pytest flask_backend/tests/test_peer_reviews.py::TestGroupAssignmentExternalReview -v
pytest flask_backend/tests/test_peer_reviews.py::TestCombinedReviews -v
```

### Run Specific Test
```bash
pytest flask_backend/tests/test_peer_reviews.py::TestGroupAssignmentExternalReview::test_group_external_review_named -v
```

### Run with Coverage
```bash
pytest flask_backend/tests/test_peer_reviews.py --cov=api --cov-report=html
```

## Test Statistics

| Metric | Count |
|--------|-------|
| Test Classes | 8 |
| Test Methods | 19 |
| Submission Types | 2 (Individual, Group) |
| Review Types | 3 (None, Internal, External) |
| Anonymity Options | 2 (Named, Anonymous) |
| Flag Combinations | 9 |
