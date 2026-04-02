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

### File Submission Download (Fixed 2026-04-02)
- **Issue**: Submitted files in the "File Submissions" section were displayed as links but clicking them did nothing
- **Fix**: Added `handleDownload()` function to Assignment.tsx that:
  - Calls `downloadStudentSubmission()` API to fetch the file
  - Creates a blob and triggers browser download with original filename
  - Includes error handling and user feedback
- **Changes**:
  - Added `downloadStudentSubmission` to imports from api.ts
  - Added `downloadError` state for displaying download errors
  - Converted filename span to clickable button with download handler
  - Added error card display for download failures

### Grading Status Display (Fixed 2026-04-02)
- **Issue**: "Grading status" badge showed "Graded" as soon as a student submitted, even though teacher hadn't graded yet
- **Fix**: Changed logic to only show "Graded" when a submission has an actual `grade` value (not null/undefined)
- **Implementation**: Updated condition from `submissions.length > 0` to `submissions.length > 0 && submissions[0].grade != null`
- **Result**: Shows "Not graded" until grading functionality adds grade values to submissions

## Peer Review Start and Due Dates (Added 2026-04-02)

### What Was Added
Teachers can now set optional start and end dates for peer review submissions on assignments. This prevents peer reviews from being available immediately and allows teachers to control when students can submit reviews.

### Backend Changes

#### Assignment Model (`flask_backend/api/models/assignment_model.py`)
- Added `peer_review_start_date` column (DateTime, nullable, indexed)
- Added `peer_review_due_date` column (DateTime, nullable, indexed)
- Updated `__init__` method to accept `peer_review_start_date` and `peer_review_due_date` parameters
- Added helper method `is_peer_review_available()`:
  - Checks if current time is within review window
  - Handles cases where start or due dates are not set
  - Returns true if reviews are open, false otherwise
- Added helper method `is_peer_review_started()`:
  - Returns true if start date has arrived (or no start date is set)
  - Used for determining availability messages

#### Assignment Schema (`flask_backend/api/models/schemas.py`)
- Added `peer_review_start_date` and `peer_review_due_date` fields to AssignmentSchema
- Allows optional datetime fields for display and API responses

### Frontend Changes

#### Assignment Creation Dialog (`frontend/src/pages/ClassHome.tsx`)
- Added `peerReviewStartDate` and `peerReviewDueDate` state variables
- Added two new datetime input fields to the modal:
  - "Peer Review Start Date" (optional)
  - "Peer Review Due Date" (optional)
- Passes these fields to `createAssignment()` API call
- Fields use `datetime-local` format matching existing start/due date pattern

#### Assignment Edit Dialog (`frontend/src/components/AssignmentSettings.tsx`)
- Added state for `editedPeerReviewStartDate` and `editedPeerReviewDueDate`
- **Assignment Information Card** now displays:
  - Peer Review Start Date displayed as "Peer Review Start:" with date or "Not Set"
  - Peer Review Due Date displayed as "Peer Review Due:" with date or "Not Set"
  - Shows dates even when no edit is in progress (improved UX for teachers)
- **Edit Dialog** includes:
  - "Peer Review Start Date" input field (optional)
  - "Peer Review Due Date" input field (optional)
  - Properly loaded from assignment data using `.slice(0, 16)` parsing pattern
  - Submitted as ISO strings to backend

#### Peer Reviews Page (`frontend/src/pages/PeerReviews.tsx`)
- Updated `isPeerReviewAvailable()` helper to check peer review date windows
- Returns object with `{ available: boolean; message?: string }`
- Messages show formatted dates with time using `formatDateWithTime()` function
- Two scenarios:
  - **Before start date**: "Peer reviews are not yet available. They will start on [date]"
  - **After due date**: "Peer review deadline has passed (was due [date])"
- Added alert display that shows either message with conditional styling
- Alert styling: **All peer review unavailability messages now display in red** (`border-red-300 bg-red-50`, `text-red-800`)
- Peer review info section displays:
  - "Review starts:" with formatted date and time
  - "Review due:" with formatted date and time
- Submit Review button disabled when reviews not available

#### API Utilities (`frontend/src/util/api.ts`)
- Updated `createAssignment()` to accept and send `peer_review_start_date` and `peer_review_due_date`
- Updated `editAssignment()` to accept and send these fields

### User Experience Improvements
- ✅ Teachers can optionally set when peer reviews should be available
- ✅ Students see clear unavailability messages at top of peer reviews page
- ✅ Teachers can see peer review dates in Manage tab without needing to edit
- ✅ All peer review unavailability states display in red (blocking/alert color)
- ✅ Dates display in full format with time: "Apr 2, 2026, 11:59 PM"
- ✅ Consistent datetime picker experience across all date fields

## Student Submissions in Peer Reviews (Added 2026-04-02)

### What Was Added
Students can now view and download submitted files directly within the peer review modal when reviewing peers. This allows reviewers to easily access the work they're evaluating without leaving the review interface.

### Backend Changes

#### Student Submission Controller (`flask_backend/api/controllers/student_submission_controller.py`)

**New Endpoint**: `GET /submissions/peer-review/<assignment_id>/<target_id>`
- Fetches submissions for a specific peer review target (student or group)
- Accepts query parameter `type=user|group` to determine target type
- For individual targets: returns all submissions from that student
- For group targets: returns submissions from all group members
- Authorization: User must be enrolled in the course
- Returns empty array if no submissions found

**Updated Endpoint**: `GET /submissions/download/<submission_id>`
- Added peer reviewer authorization check
- Students can now download submissions when:
  - Assignment has peer review enabled (`internal_review` OR `external_review`)
  - Student is enrolled in the course
  - This supplements existing checks (owner, group member, teacher)
- Maintains security: only active peer review participants can access

### Frontend Changes

#### API Utilities (`frontend/src/util/api.ts`)
- Added `getPeerReviewSubmissions()` function
  - Parameters: `assignmentId`, `targetId`, `targetType` ('user' | 'group')
  - Query parameter handling for type filtering
  - Returns array of submission objects with id, filename, created_at, etc.
- Existing `downloadStudentSubmission()` function now serves peer review context

#### Peer Reviews Modal (`frontend/src/pages/PeerReviews.tsx`)

**Dynamic Submission Display**:
- New state: `submissionsExpanded` - controls dropdown visibility
- New section added right below "Review for: [Name]" heading
- Only displays when submissions exist for selected target

**Collapsible UI**:
- Discrete compact header: "📎 Submissions [count] ▼"
- Click to expand/collapse file list
- Arrow rotates 180° when expanded for visual feedback
- Clean white background with blue border when expanded
- Dropdown automatically resets when selecting new review target

**File Display**:
- Each file shown as clickable button with filename and download arrow
- Hover effects provide visual feedback
- Direct download on click using blob download pattern
- Error handling with user alerts if download fails

**Integration**:
- `loadTargetSubmissions()` function fetches submissions when target changes
- Handles both individual and group assignment contexts
- Works for both internal and external peer reviews
- Resets dropdown state when switching targets

### User Experience Improvements (Submissions in Peer Review)
- ✅ Reviewers can access submitted work without leaving review modal
- ✅ Discrete minimal UI doesn't clutter the review interface
- ✅ Expandable dropdown keeps submissions hidden until needed
- ✅ Works seamlessly for both individual and group assignments
- ✅ Supports multiple submissions per student/group
- ✅ Clear visual indicators (count badge, arrow rotation)
- ✅ Error handling for failed downloads

## Summary of Changes

### Files Created
- `frontend/src/components/RubricViewModal.tsx` - Split rubric display component

### Files Modified
- `frontend/src/util/api.ts` - Updated createAssignment() function; added peer review date parameters; added getPeerReviewSubmissions() for peer review submissions
- `frontend/src/pages/ClassHome.tsx` - Assignment creation modal; added peer review date fields
- `frontend/src/components/AssignmentSettings.tsx` - Dialog-based edit form; shows peer review dates in Manage tab; added peer review date edit fields
- `frontend/src/pages/Assignment.tsx` - Description display, student info, rubric removal, file download functionality, grading status logic
- `frontend/src/pages/PeerReviews.tsx` - View Rubric button and modal integration; peer review availability checking; red alert styling for all unavailability states; collapsible submissions display with download functionality
- `frontend/src/index.css` - Markdown styling
- `frontend/tsconfig.app.json` - Removed deprecated option
- `flask_backend/api/models/assignment_model.py` - Added description, peer_review_start_date, peer_review_due_date fields; added availability check methods
- `flask_backend/api/controllers/assignment_controller.py` - Updated create/edit functions
- `flask_backend/api/controllers/student_submission_controller.py` - Added peer review submission endpoint; added peer reviewer authorization to download endpoint
- `flask_backend/api/models/schemas.py` - Updated AssignmentSchema; added peer review date fields

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
- ✅ Submitted files are downloadable from assignment submission details table
- ✅ Grading status accurately reflects whether teacher has graded (not just submitted)
- ✅ Optional peer review start and end dates control when students can submit reviews
- ✅ Teachers see peer review dates in Manage tab without editing
- ✅ Students get red alert when peer reviews unavailable (either not started or deadline passed)
- ✅ All unavailability messages display with formatted date and time in student's timezone