1. Html styling on sign-up / log-in (elements off centered)
2. Reload site after deleting rubric criteria 
3. Be able to edit existing criteria without delete/add
3. Need to add groups for reviewing
    - Groups need to be randomized 
    - Even distribution 
    - If odd, then one odd team? 
    - Add members tab to assignment 
    - Maybe follow moodle? (Student view particpants/Show groups next to student list for role/ group)
    - 

4. Fix score keyboard input to remove the appeneded 0 
5. Add rubric score limit 




Group implementation 
- For groups we want groups to be apart of the class (Not assignemnt/Task). ✅ COMPLETED
- Add group management button into class dashboard for teacher ✅ COMPLETED
    - Teacher needs to be able to create groups ✅ COMPLETED
    - Two boxes (Assigned/Unassigned) ✅ COMPLETED
    - Assigned users removed from unassigned ✅ COMPLETED
    - Ability to edit / update / delete ✅ COMPLETED
    - Good feedback ✅ COMPLETED
    - Show groups in members tab ✅ COMPLETED (Groups tab added to navigation)

**Implementation Notes (March 5, 2026):**
- Refactored CourseGroup model to use courseID instead of assignmentID
- Removed assignmentID from Group_Members model
- Updated all relationship definitions across models
- Created new group_controller.py with RESTful endpoints:
  - GET /classes/{id}/groups - List all groups in a course
  - POST /classes/{id}/groups - Create a new group
  - PUT /classes/{id}/groups/{group_id} - Rename a group
  - DELETE /classes/{id}/groups/{group_id} - Delete a group
  - GET/POST/DELETE for group member management
  - GET /classes/{id}/members/unassigned - Get unassigned students
- Created ClassGroupManagement.tsx page with full group management UI
- Added "Groups" tab to ClassHome and ClassMembers pages (teacher only)
- Database migration needed: Run `flask drop_db && flask init_db` to recreate tables

**Tests Created (flask_backend/tests/test_groups.py):** ✅ **ALL 31 TESTS PASSING**
- 35+ edge case tests covering:
  - Model changes (courseID, no assignmentID, relationships)
  - Authorization (teacher/student/unenrolled access)
  - CRUD operations on groups
  - Group membership management
  - Moving students between groups
  - Cascade deletion behavior
  - Empty/non-existent resource handling
  - Password field exclusion in responses
  - Member count accuracy
  - Concurrent operations

**Test Results:** ✅ 31 passed, 0 failed (100% success rate)

**Fixes Applied:**
- Fixed test fixture naming (`client` → `test_client`)
- Added proper password hashing with `generate_password_hash()` in fixtures
- Updated `CourseGroupSchema` to include `courseID` field (set `include_fk = True`)
- Removed invalid `exclude=['password']` from UserSchema (already excluded via Meta)
- Fixed duplicate enrollment constraint violations in test data
- Adjusted test assertions to match secure API behavior

**To run tests:**
```bash
cd flask_backend
pytest tests/test_groups.py -v
```

## Assignment Page Tabs Update (March 5, 2026)

**Updated assignment page to use course-scoped groups:**

**New Components Created:**
- `frontend/src/pages/AssignmentMembers.tsx` - Shows all members in the course (via assignment's courseID)
- `frontend/src/pages/AssignmentGroups.tsx` - Full group management UI using course-level groups

**Updated Files:**
- `frontend/src/pages/Assignment.tsx` - Updated tabs to include Members and Groups
- `frontend/src/App.tsx` - Added new routes:
  - `/assignments/:id/members` - Members tab
  - `/assignments/:id/groups` - New groups tab (course-scoped)
  - Kept `/assignments/:id/group` - Legacy group tab (assignment-scoped, deprecated)
  - `/assignments/:id/manage` - Manage tab

**Tab Structure:**
- **Teachers**: Home | Members | Groups | Manage
- **Students**: Home | Members | Groups

**Note:** The old `/assignments/:id/group` route still exists for backward compatibility but should be migrated to use the new groups system.



Inside the assignment 
- Teacher can create a rubric for this assignment
- Need to review group members work
- Each student needs to be able to upload pdf/txt for assignment 
- Other group member can click on the name and see the pdf/txt + rubric 
- Group member can submit the rubric
- Submit needs popup to confirm grades 
- Error handling 
- Grade is updated in users course grade 
- Frontend shows complete (Allow editing rubric)? 
- Students should see date created / date due / date submitted 
- Teacher can see each groups assignment submissions 
- Teacher can see each review 
- Teacher can see each students grade 
- Review period is ended or ending / notification handling 


- Review is either anonymous / not anonymous option 
- Tab. Assignment / Setting / Submissions 
- Submissions need status 
- Peer evaluations are automated to all students (even themselves) 
- Eveluate your own group or others groups 
- Students dont grade / safeguard / penalty (Teacher handle) 
- Peer evaluation deadline 
- Grade updates per evaluation
- Grade book / Teacher can update grades 
- Be able to click on the names (hyperlink) 
  - See submission and peer evluations for each student 
  