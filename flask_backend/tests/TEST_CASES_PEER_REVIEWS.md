# Peer Evaluation Test Cases Documentation

## Overview
This test suite provides comprehensive coverage for the peer evaluation/review functionality across all variations of submission types, review types, and anonymity settings.

## Test Structure

### 1. **Individual Assignment - External Review** (`TestIndividualAssignmentExternalReview`)
Tests for individual submissions where students review classmates.

- **test_create_individual_assignment_with_external_review**
  - Verifies assignment creation with individual submission type and external review enabled
  - Checks flags: `submission_type='individual'`, `external_review=True`, `internal_review=False`

- **test_individual_external_review_named**
  - Students review classmates with visible reviewer names
  - Validates review creation, criterion scores, and data storage
  - Checks: Reviewer name visible, scores properly stored, multiple criteria supported

- **test_individual_external_review_anonymous**
  - Students review classmates with anonymous reviewer hiding
  - Validates `anonymous_review=True` flag properly set
  - Checks: Reviewer data still stored in DB but hidden from student view

---

### 2. **Group Assignment - Internal Review** (`TestGroupAssignmentInternalReview`)
Tests for group submissions where teammates review each other within their group.

- **test_create_group_assignment_with_internal_review**
  - Verifies group assignment creation with internal review enabled
  - Checks flags: `submission_type='group'`, `internal_review=True`, `external_review=False`

- **test_group_internal_review_named**
  - Teammates review each other with visible reviewer names
  - Validates: Group creation, team member association, internal review tracking
  - Checks: Reviewer is a teammate of reviewee, scores stored correctly

- **test_group_internal_review_anonymous**
  - Teammates review each other anonymously
  - Validates `anonymous_review=True` with group assignments
  - Checks: Reviewer identity hidden but data maintained in DB

---

### 3. **Group Assignment - External Review** (`TestGroupAssignmentExternalReview`)
Tests for group submissions where groups review other groups.

- **test_create_group_assignment_with_external_review**
  - Verifies group assignment creation with external review enabled
  - Checks flags: `submission_type='group'`, `external_review=True`, `internal_review=False`

- **test_group_external_review_named**
  - Groups review other groups with visible reviewer names
  - Validates: Multiple groups created, cross-group review creation
  - Important: `revieweeID` is the GROUP ID (not individual student)
  - Checks: Reviewer from one group, reviewee is another group

- **test_group_external_review_anonymous**
  - Groups review other groups anonymously
  - Validates `anonymous_review=True` with group-to-group reviews
  - Checks: Group reviewer identity hidden from recipients

---

### 4. **Combined Internal & External Reviews** (`TestCombinedReviews`)
Tests for assignments with both internal and external reviews simultaneously.

- **test_group_assignment_both_internal_and_external_reviews**
  - Single assignment with `internal_review=True` AND `external_review=True`
  - Validates both types of reviews can coexist:
    - Internal: Student1 reviews Student2 (both in same group)
    - External: Student3 reviews Group1 as a whole
  - Checks: Multiple review types, different reviewer/reviewee combinations

---

### 5. **Edge Cases** (`TestEdgeCases`)
Tests for boundary conditions and unusual scenarios.

- **test_single_student_individual_assignment**
  - Verifies behavior with minimal students
  - Checks: External review targets list filtering works correctly

- **test_solo_group_external_review**
  - Verifies behavior when only one group exists (no external review targets)
  - Checks: Other groups list is empty, preventing self-review

- **test_student_cannot_review_self**
  - Validates filtering logic prevents self-review
  - Checks: Student doesn't appear in their own review targets

- **test_assignment_without_reviews_enabled**
  - Assignment with `internal_review=False` AND `external_review=False`
  - Checks: No review options available

- **test_anonymous_toggle_across_submission_types**
  - Tests anonymous flag independence from submission type
  - Validates: Both individual and group assignments can be anonymous or named

---

### 6. **Review Flag Combinations** (`TestReviewFlags`)
Exhaustive testing of all valid flag combinations.

- **test_all_flag_combinations**
  - Tests all 9 valid combinations:
    ```
    Individual only:          individual + external only (named/anonymous)
    Group internal only:      group + internal only (named/anonymous)
    Group external only:      group + external only (named/anonymous)
    Group both:              group + internal + external (named/anonymous)
    ```
  - Verifies each combination is correctly stored and retrievable

---

### 7. **Date Constraints** (`TestDateConstraints`)
Tests for assignment visibility and modification based on dates.

- **test_assignment_visibility_before_start_date**
  - Assignment with future `start_date` should not be visible to students
  - Validates: `is_visible_to_students()` returns False

- **test_assignment_visibility_after_start_date**
  - Assignment with past `start_date` should be visible to students
  - Validates: `is_visible_to_students()` returns True

- **test_assignment_modification_before_due_date**
  - Assignment before `due_date` should be modifiable
  - Validates: `can_modify()` returns True

- **test_assignment_modification_after_due_date**
  - Assignment after `due_date` should be read-only
  - Validates: `can_modify()` returns False

---

### 8. **Review Data Integrity** (`TestReviewDataIntegrity`)
Tests for proper storage and retrieval of review data.

- **test_review_with_multiple_criteria**
  - Creates review with 5 different criteria having different scores
  - Validates: All scores properly stored, can be retrieved independently
  - Checks: Score order preserved (100, 85, 90, 75, 88)

- **test_review_with_no_criteria_scores**
  - Creates review without any criterion entries
  - Validates: Empty reviews are valid (optional scoring)
  - Checks: Review created and stored even with no criteria

---

## Key Variations Tested

### Submission Type
- ✅ **Individual**: Single student submission, can receive external reviews
- ✅ **Group**: Team submission, can receive internal (same team) and external (other teams) reviews

### Review Type
- ✅ **Internal**: Only valid for group assignments, teammates review each other
- ✅ **External**:
  - Individual: Any classmate can review
  - Group: Any member from other groups can review

### Anonymity
- ✅ **Named**: Reviewer identity visible to reviewee (default)
- ✅ **Anonymous**: Reviewer identity hidden from reviewee (set by `anonymous_review=True`)

### Review Direction
- ✅ **Individual → Individual**: In individual assignments
- ✅ **Individual → Individual (group context)**: Internal reviews within groups
- ✅ **Individual → Group**: External reviews where individual reviews a group
- ✅ **Group → Group**: External reviews where groups review other groups

---

## Running the Tests

### Prerequisites
```bash
pip install pytest
# Ensure test database is configured in config.py
```

### Run All Tests
```bash
pytest tests/test_peer_reviews.py -v
```

### Run Specific Test Class
```bash
pytest tests/test_peer_reviews.py::TestIndividualAssignmentExternalReview -v
```

### Run Specific Test
```bash
pytest tests/test_peer_reviews.py::TestGroupAssignmentExternalReview::test_group_external_review_named -v
```

### Run with Coverage
```bash
pytest tests/test_peer_reviews.py --cov=flask_backend --cov-report=html
```

---

## Test Data Setup

Each test uses fixtures to create:
- **Users**: 1 teacher + 4 students (sufficient for all group/individual scenarios)
- **Course**: Single course with all 4 students enrolled
- **Groups**: Created per-test as needed (2-3 groups depending on scenario)
- **Rubric**: 2-5 criteria depending on test needs
- **Reviews**: Various review combinations based on test scenario

---

## Important Implementation Notes

### Individual Assignment Behavior
When `submission_type='individual'`:
- `internal_review` should be ignored/disabled (no "internal" in individual context)
- `external_review` enables classmate reviews
- Reviewer can be any student except self
- `revieweeID` is a student ID

### Group Assignment Behavior
When `submission_type='group'`:
- `internal_review`: Teammates review each other (still student-to-student)
- `external_review`: Members of other groups review as individuals
- For internal reviews: `revieweeID` is student ID of teammate
- For external reviews: `revieweeID` can be either:
  - Student ID (if single reviewer) - for group as a whole
  - Group ID (conceptually, but stored as target)

### Anonymous Review Behavior
- `anonymous_review=True`: Reviewer name shown as "Anonymous" in student-facing UI
- Reviewer ID still stored in database for teacher/admin access
- Flag is assignment-level, applies to all reviews for that assignment
- Both internal and external reviews respect this setting

---

## Coverage Summary

| Category | Individual | Group | Anonymous | Named |
|----------|-----------|-------|-----------|-------|
| External Review | ✅ | ✅ | ✅ | ✅ |
| Internal Review | N/A | ✅ | ✅ | ✅ |
| Combined | N/A | ✅ | ✅ | ✅ |
| Edge Cases | ✅ | ✅ | ✅ | ✅ |
| Date Constraints | ✅ | ✅ | ✅ | ✅ |
| Data Integrity | ✅ | ✅ | ✅ | ✅ |

---

## Future Test Additions

Consider adding tests for:
1. **Access Control**: Students can only review if enabled, teachers can see all
2. **Performance**: Large number of groups/students (pagination)
3. **Concurrent Reviews**: Multiple students submitting reviews simultaneously
4. **Review Modification**: Updating existing reviews (if supported)
5. **Review Comments**: Storing and retrieving criterion comments
6. **Rubric Variations**: Reviews with no max scores vs fixed scores
7. **API Responses**: JSON structure validation for frontend
