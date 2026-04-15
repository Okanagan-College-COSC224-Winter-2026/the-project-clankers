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
└─ No Reviews Allowed                              ✅ test_assignment_without_reviews


GROUP ASSIGNMENTS
├─ Internal Review ONLY
│  ├─ Named (Teammate → Teammate)                  ✅ test_group_internal_review_named
│  └─ Anonymous (Teammate → Teammate)              ✅ test_group_internal_review_anonymous
│
├─ External Review ONLY
│  ├─ Named (Group member → Other Group)           ✅ test_group_external_review_named
│  ├─ Anonymous (Group member → Other Group)       ✅ test_group_external_review_anonymous
│  └─ Group-level reviewer                         ✅ test_group_external_review_with_group_reviewer
│
└─ Internal + External (BOTH)
   └─ Named + Anonymous                            ✅ test_group_both_internal_and_external

EDGE CASES
├─ Self-review prevention                          ✅ test_student_cannot_review_self
├─ Solo group handling                             ✅ test_solo_group
└─ Group reviewer uniqueness                       ✅ test_group_reviewer_uniqueness

DATE CONSTRAINTS
├─ Not visible before start date                   ✅ test_assignment_not_visible_before_start
├─ Visible after start date                        ✅ test_assignment_visible_after_start
├─ Modifiable before due date                      ✅ test_can_modify_before_due
└─ Locked after due date                           ✅ test_cannot_modify_after_due

DATA INTEGRITY
├─ Multiple criteria per review                    ✅ test_multiple_criteria
└─ Review with no criteria                         ✅ test_review_no_criteria

REVIEW FLAGS
└─ All flag combinations (9 combos)                ✅ test_all_flag_combinations
```

## Running Tests

### Run All Peer Review Tests
```bash
pytest tests/test_peer_reviews.py -v
```

### Run Specific Test Class
```bash
pytest tests/test_peer_reviews.py::TestIndividualAssignmentExternalReview -v
pytest tests/test_peer_reviews.py::TestGroupAssignmentExternalReview -v
pytest tests/test_peer_reviews.py::TestCombinedReviews -v
pytest tests/test_peer_reviews.py::TestEdgeCases -v
pytest tests/test_peer_reviews.py::TestDateConstraints -v
pytest tests/test_peer_reviews.py::TestReviewDataIntegrity -v
pytest tests/test_peer_reviews.py::TestGroupReviewer -v
```

### Run Specific Test
```bash
pytest tests/test_peer_reviews.py::TestGroupAssignmentExternalReview::test_group_external_review_named -v
```

### Run with Coverage
```bash
pytest tests/test_peer_reviews.py --cov=api --cov-report=html
```

## Test Statistics

| Metric | Count |
|--------|-------|
| Test Classes | 8 |
| Test Methods | 22 |
| Submission Types | 2 (Individual, Group) |
| Review Types | 3 (None, Internal, External) |
| Anonymity Options | 2 (Named, Anonymous) |
| Flag Combinations | 9 |
