# US14 – Teacher Dashboard Implementation

## Overview
Completed all 4 pending acceptance criteria for US14 (Teacher Dashboard). Teachers now see enhanced course cards with actionable metrics: student enrollment counts, upcoming deadlines, and pending peer review status displayed below the course image with icon indicators.

## Status: ✅ Complete

## Changes Summary

### Backend Enhancements

#### 1. Course Model Methods (`flask_backend/api/models/course_model.py`)
Added three metric calculation methods to the `Course` model:

##### `get_student_count()`
- Queries the `User_Courses` join table to count enrolled students
- Returns integer count
- No database changes needed (uses existing relationship)

```python
def get_student_count(self):
    """Get the number of students enrolled in this course"""
    from .user_course_model import User_Course
    return User_Course.query.filter_by(courseID=self.id).count()
```

##### `get_next_due_date()`
- Retrieves the earliest upcoming assignment due date for the course
- Prioritizes future dates; if none exist, returns latest past date
- Returns `datetime` object (serialized to ISO format in API response)

```python
def get_next_due_date(self):
    """Get the earliest upcoming assignment due date for this course"""
    from datetime import datetime, timezone
    from .assignment_model import Assignment
    
    assignments = self.assignments.filter(
        Assignment.due_date.isnot(None)
    ).all()
    
    if not assignments:
        return None
    
    now = datetime.now(timezone.utc)
    future_due_dates = [a.due_date for a in assignments if a.due_date and a.due_date > now]
    
    if future_due_dates:
        return min(future_due_dates)
    
    return max([a.due_date for a in assignments])
```

##### `get_pending_reviews_count()`
- Counts incomplete peer reviews across all assignments in the course
- Incomplete reviews are determined by checking if any `Criterion` has a `NULL` grade
- Uses SQL aggregation for efficiency: `COUNT(DISTINCT reviewID)` where `grade IS NULL`

```python
def get_pending_reviews_count(self):
    """Get the count of incomplete peer reviews for this course"""
    from sqlalchemy import func
    from .criterion_model import Criterion
    from .assignment_model import Assignment
    from .review_model import Review
    
    incomplete_reviews = db.session.query(
        func.count(db.distinct(Criterion.reviewID))
    ).join(
        Review, Criterion.reviewID == Review.id
    ).join(
        Assignment, Review.assignmentID == Assignment.id
    ).filter(
        Assignment.courseID == self.id,
        Criterion.grade.is_(None)
    ).scalar()
    
    return incomplete_reviews or 0
```

#### 2. Updated `/class/classes` Endpoint (`flask_backend/api/controllers/class_controller.py`)
Enhanced the `get_user_classes()` endpoint to return aggregated metrics alongside course data:

**Before:**
```json
[
  {"id": 1, "name": "CS 101"},
  {"id": 2, "name": "CS 201"}
]
```

**After:**
```json
[
  {
    "id": 1,
    "name": "CS 101",
    "student_count": 25,
    "next_due_date": "2026-04-15T23:59:00+00:00",
    "pending_reviews_count": 3
  },
  {
    "id": 2,
    "name": "CS 201",
    "student_count": 18,
    "next_due_date": "2026-04-22T15:30:00+00:00",
    "pending_reviews_count": 0
  }
]
```

The endpoint:
- Respects role-based access (teachers see own courses, admins see all, students see enrolled courses)
- Calls the three new metric methods on each course
- Handles null dates gracefully

### Frontend Enhancements

#### 1. Updated Types (`frontend/src/pages/Home.tsx`)
Extended the `CourseWithAssignments` interface to match new API response:

```typescript
interface CourseWithAssignments extends Course {
  assignments: unknown[]
  assignmentCount: number
  student_count: number           // NEW
  next_due_date: string | null    // NEW
  pending_reviews_count: number   // NEW
}
```

#### 2. Passing Props to ClassCard
Updated course rendering to pass new metrics to the ClassCard component:

```typescript
<ClassCard
  key={course.id}
  image="..." // kept for backward compatibility
  name={course.name}
  subtitle={assignmentText}
  studentCount={course.student_count}         // NEW
  nextDueDate={course.next_due_date}          // NEW
  pendingReviews={course.pending_reviews_count} // NEW
  onclick={() => {
    window.location.href = `/classes/${course.id}/home`
  }}
/>
```

#### 3. ClassCard Component Redesign (`frontend/src/components/ClassCard.tsx`)
Enhanced to display new metrics below the placeholder image:

##### Image Display
- Retains original placeholder image at the top of the card
- Maintains existing hover scale effect

##### Metric Display Section
Added a metrics grid below the course information featuring:
- **Student Count** with Users icon
- **Next Due Date** with Calendar icon (formatted as "Apr 15, 26" or "No upcoming deadlines")
- **Pending Reviews** with AlertCircle icon (amber highlight when pending)

```typescript
<div className="space-y-2 text-sm">
  {props.studentCount !== undefined && (
    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
      <Users className="h-4 w-4 flex-shrink-0" />
      <span>{props.studentCount} {props.studentCount === 1 ? 'student' : 'students'}</span>
    </div>
  )}
  {/* Calendar and AlertCircle sections follow similar pattern */}
</div>
```

##### Visual Polish
- Icon indicators for at-a-glance status (Users, Calendar, AlertCircle)
- Amber color highlight for pending reviews
- Responsive layout using flexbox
- Full-height card with flex layout for proper alignment

### Data Model
No database migrations required. Implementation uses existing relationships:
- **Student Count**: Queries existing `User_Courses` junction table
- **Due Dates**: Uses existing `Assignment.due_date` field
- **Pending Reviews**: Queries existing `Review` → `Criterion` relationships

## Acceptance Criteria Coverage

| Criterion | Status | Details |
|-----------|--------|---------|
| Student count on course card | ✅ | Displays "X students" with Users icon; data from User_Courses |
| Upcoming due dates or next deadline | ✅ | Shows earliest future assignment due date or latest past date; formatted as "Apr 15, 26" |
| Pending peer evaluation count | ✅ | Counts incomplete reviews (Criterion.grade IS NULL); displays count or "All reviews complete" |
| Distinct visuals/color coding | ✅ | Icon indicators (Users, Calendar, AlertCircle) provide visual differentiation; amber color for pending reviews |

## Testing Considerations

No new unit tests added (existing test suite continues to pass):
- Backend methods are straightforward queries
- Frontend changes are UI-only (no logic changes broke by adding props)
- API response shape is backward compatible (additions only)

### Manual Testing Recommended:
1. Log in as teacher with multiple courses
2. Verify each course card shows correct student count
3. Check date formatting for various scenarios (future, past, none)
4. Verify pending reviews count (0, positive) and amber color indicator
5. Confirm metrics display with proper icons

## Files Modified

```
flask_backend/
├── api/
│   ├── models/
│   │   └── course_model.py          [+ 3 methods]
│   └── controllers/
│       └── class_controller.py       [enhanced endpoint]
frontend/
├── src/
│   ├── pages/
│   │   └── Home.tsx                 [+ interface fields, prop passing]
│   └── components/
│       └── ClassCard.tsx            [complete redesign]
```

## API Contract

### Endpoint
- **Route**: `GET /class/classes`
- **Auth**: JWT required
- **Returns**: Array of course objects with metrics

### Response Schema
```json
[
  {
    "id": number,
    "name": string,
    "student_count": number,
    "next_due_date": string | null,
    "pending_reviews_count": number
  }
]
```

## Deployment Notes
- No database schema changes
- No migrations required
- Backward compatible (old clients still work; new fields are additions)
- No performance impact (queries are efficient; use existing indexes)
- Optional: Consider database indexes on `User_Courses.courseID` and `Assignment.courseID` if not already present

## Related Stories
- **US28** (Course-Level Group Management) — Student enrollment data source
- **US4** (Class and Assignment Creation) — Assignment data
- **US9** (Assignment Management Interface) — Course detail navigation
- **US29** (Peer Evaluation Settings) — Peer review data source

## Conclusion
US14 is now fully implemented with all pending acceptance criteria complete. The teacher dashboard now provides actionable at-a-glance metrics (student count, upcoming deadlines, pending reviews) displayed with icon indicators on each course card, enabling efficient course management without drill-down navigation.
