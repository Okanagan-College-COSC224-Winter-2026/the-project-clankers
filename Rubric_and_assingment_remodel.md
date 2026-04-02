# Rubric and Assignment Remodel

## Setup Instructions

When pulling this branch on a fresh setup:
1. Run `npm install` in the frontend directory
2. Run `flask migrate_add_enrollment_tables` if backend returns 500 errors
3. Run `python migrate_assignment_description.py` in the flask_backend directory to add the description field
4. Restart both frontend and backend servers

## Backend Changes

### Assignment Model (`api/models/assignment_model.py`)
- Added `description` field (TEXT column) to store assignment details
- Updated `__init__` method to accept description parameter

### Assignment Controller (`api/controllers/assignment_controller.py`)
- Updated `create_assignment()` to accept and save description
- Updated `edit_assignment()` to handle description updates

### Assignment Schema (`api/models/schemas.py`)
- Added explicit `description` field (Str, allow_none=True) to AssignmentSchema
- Updated `AssignmentDetails` interface to use `description` field instead of `rubric_text`
- Updated date handling to use `datetime-local` format with `.slice(0, 16)` parsing

## Database Migration

- Created `migrate_assignment_description.py` to add the description column without data loss
- Run this migration after pulling the branch to update your local database

## Frontend - Assignment Creation & Editing

### API Updates (`frontend/src/util/api.ts`)
- Updated `createAssignment()` to accept description parameter

### ClassHome Page (`frontend/src/pages/ClassHome.tsx`)
- Refactored Assignment Creation Form: Replaced large Card component with clean modal dialog
- "Create Assignment" button moved next to "Assignments" heading for better UX
- Modal dialog sized at `max-w-6xl max-h-[90vh]` with scrolling support
- Added `description` state and Textarea import
- Added "Assignment Details" textarea field to modal (markdown-supported, optional)
- Date Fields in Modal: Start Date and Due Date fields included (optional, datetime-local input)

### AssignmentSettings Component (`frontend/src/components/AssignmentSettings.tsx`)
- Converted to dialog-based edit form (replacing inline editing)
- Modal size: `max-w-6xl max-h-[90vh]` with scrolling support
- **Edit Dialog Fields**:
  - Assignment Name (required)
  - Assignment Details (optional, markdown-supported textarea)
  - Start Date (optional, datetime-local picker)
  - Due Date (optional, datetime-local picker)
  - Submission Type (Individual/Group radios)
  - Peer Review Options (Internal, External, Anonymous checkboxes)
  - Cancel/Save buttons in dialog footer
- **Assignment Information Preview**:
  - Added Description field showing status (Green "Enabled" if exists, Gray "Disabled" if not)
  - Traditional card layout: Name, Description status, Start Date, Due Date, Assignment Type, Edit button
- Preserved all peer review settings and deletion functionality

## Frontend - Assignment Display & Student Experience

### Assignment Page (`frontend/src/pages/Assignment.tsx`)

#### Assignment Details Display
- Added "Assignment Details" card section at top of home tab (before files and rubric)
- Added ReactMarkdown component to render assignment descriptions
- Configured markdown plugins: `remarkGfm` and `rehypeSanitize` for XSS protection
- Custom component renderers for proper Tailwind styling of markdown elements (h1, h2, h3, ul, ol, li, p)
- Supports markdown formatting: headers, bold, lists, code blocks, links, etc.

#### Date Information Card (Student View Only)
- Added blue-highlighted info card at the top of the student assignment Home tab
- Displays start date and due date with full formatted text and weekday
- Format: "Thursday, 29 January 2026, 12:00 AM"
- Only visible to students (hidden from teachers)
- Only displays if dates are set on the assignment

#### Submission Details Table (Student View Only)
- Added comprehensive table at bottom of page showing submission status:
  - **Group** (optional, only shows if student is in a group)
  - **Submission status**: Badge showing "Submitted for grading" or "Not submitted"
  - **Grading status**: Badge showing "Graded" or "Not graded"
  - **Time remaining**: Calculates and displays time until due date or time overdue
  - **Last modified**: Shows last submission timestamp or "-" if no submissions
  - **File submissions**: Lists all submitted files with upload timestamps
- Student-only view (hidden from teachers)
- Always visible with relevant information, even if no submissions yet

#### Data Fetching
- Added API calls: `getStudentSubmissions()`, `listStuGroup()`, `getCurrentUserProfile()`
- Stores start_date and due_date from assignment details
- All data properly error-handled

#### Date/Time Utilities
- **`formatDate()`**: Converts ISO datetime strings to readable format with timezone handling
- **`calculateTimeRemaining()`**: Computes time until/past due date
  - Shows "X days Y hours remaining" format while future
  - Shows "Overdue by X days Y hours" format when past due
  - Both functions handle timezone conversion (backend stores times without timezone indicators, parsed as local time)

## Frontend - Rubric Management

### RubricViewModal Component (`frontend/src/components/RubricViewModal.tsx`)
- New modal dialog that displays rubrics split into **Internal** and **External** sections
- Each section shows:
  - Criterion question
  - Full description text
  - Max score (if applicable)
  - Comment-only indicator
  - Comments enabled badge
- **Conditional Display**: Rubric sections dynamically shown based on assignment settings:
  - External-only assignments: Only shows External section
  - Internal-only assignments: Only shows Internal section (group assignments only)
  - Both enabled: Shows both Internal and External sections
- Criteria filtered using `criteriaType` field ('internal', 'external', or 'both')

### Assignment Page - Rubric Changes (`frontend/src/pages/Assignment.tsx`)
- Removed `RubricDisplay` component from home tab for both students and teachers
- Teachers can still access rubric management via dedicated "Rubric" tab
- Teachers see rubric on `/assignments/{id}/rubric` page (AssignmentRubric.tsx)

### PeerReviews Page (`frontend/src/pages/PeerReviews.tsx`)
- Added dedicated "View Rubric" section card (separate from other sections)
- Positioned between header and "Your Submitted Reviews" section
- Fetches rubric on page load for the assignment
- Button disabled if no rubric exists
- Opens RubricViewModal with assignment's review settings passed as props

## Styling Updates

### CSS Changes (`frontend/src/index.css`)
- Added comprehensive `.prose` CSS classes for markdown elements:
  - Proper spacing, indentation, and nested list support
  - Color-coordinated with design system (text-foreground, text-muted-foreground, etc.)
- Removed problematic `@tailwindcss/typography` import (was causing Vite build error)

### Textarea UI Improvements
- Description Textarea Height: Increased min-height from `24` to `40` and max-height from `48` to `96`
- Fixed textarea overflow issue:
  - Set `resize-none` to prevent manual resizing
  - Added `max-h-[200px-400px]` with `overflow-y-auto` for scrolling

## Dependencies & Installation

### New NPM Dependencies
Teams pulling this branch must run:
```bash
npm install
```

This installs:
- `react-markdown@^10.1.0` - For rendering markdown content
- `rehype-sanitize@^6.0.0` - For XSS protection and HTML sanitization
- `remark-gfm@^4.0.1` - For GitHub Flavored Markdown support
- `@tailwindcss/typography@^0.5.19` - For better markdown styling

## Bug Fixes

### Button Component Ref Error
- Fixed "Function components cannot be given refs" error
- Wrapped Button component with `React.forwardRef()`
- Allows DialogPrimitive.Close to properly attach refs
- Resolved error when opening "Create Assignment" dialog

### Timezone Handling
- Fixed date display issue where times showed UTC-adjusted values instead of local time
- Backend stores times without timezone indicator (e.g., `"2026-04-19T23:59:00"`)
- Frontend now manually parses as local time instead of treating as UTC
- Resolves 5+ hour time differences for PST users and others

### TypeScript Configuration
- Removed `"ignoreDeprecations": "6.0"` from `frontend/tsconfig.app.json` (was causing compilation errors)

## Summary of Changes

### Files Created
- `frontend/src/components/RubricViewModal.tsx` - Split rubric display component

### Files Modified
- `frontend/src/util/api.ts` - Updated createAssignment() function
- `frontend/src/pages/ClassHome.tsx` - Assignment creation modal
- `frontend/src/components/AssignmentSettings.tsx` - Dialog-based edit form
- `frontend/src/pages/Assignment.tsx` - Description display, student info, rubric removal
- `frontend/src/pages/PeerReviews.tsx` - View Rubric button and modal integration
- `frontend/src/index.css` - Markdown styling
- `frontend/tsconfig.app.json` - Removed deprecated option
- `flask_backend/api/models/assignment_model.py` - Added description field
- `flask_backend/api/controllers/assignment_controller.py` - Updated create/edit functions
- `flask_backend/api/models/schemas.py` - Updated AssignmentSchema

### Database Migration
- `migrate_assignment_description.py` - Added to flask_backend directory

## User Experience Improvements

- ✅ Consistent dialog-based UI for creating and editing assignments
- ✅ Teachers have title and optional markdown details for assignments
- ✅ Students see important assignment dates prominently at top
- ✅ Clear submission and grading status indicators
- ✅ Time remaining calculation helps students manage deadlines
- ✅ Dates display correctly in user's local timezone
- ✅ Rubrics only appear in relevant contexts (Rubric management for teachers, Peer Reviews for students)
- ✅ Students see organized Internal/External rubric sections based on assignment type
- ✅ Quick status indicators for assignment features (description enabled/disabled)
- ✅ All dates use consistent datetime-local picker across app
- ✅ Markdown support with XSS protection
- ✅ Smooth scrolling modals for better readability