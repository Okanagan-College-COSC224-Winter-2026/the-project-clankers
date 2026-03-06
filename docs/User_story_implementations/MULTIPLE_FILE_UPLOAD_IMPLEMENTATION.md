# Multiple File Upload Implementation

**Date:** March 5, 2026  
**Feature:** Assignment Multiple File Attachment System  
**Status:** ✅ Completed

---

## Overview

Implemented a system that allows teachers to upload multiple files (PDF, DOCX, TXT, ZIP) to assignments, with students able to view and download all attached files. Files are accumulated over time rather than replaced, allowing teachers to add additional materials after the initial upload.

### User Stories Addressed

- **Teachers**: Can upload multiple document files to an assignment, add more files later, and delete individual files
- **Students**: Can view all files attached to an assignment and download them individually

---

## Architecture Decisions

### 1. Database Schema: Many-to-Many Relationship

**Decision:** Create a separate `AssignmentFile` table instead of storing file info directly on the `Assignment` model.

**Rationale:**
- Allows unlimited files per assignment
- Each file has its own metadata (uploader, timestamp)
- Clean separation of concerns
- Easy to query all files for an assignment

**Schema:**
```
Assignment (1) ←→ (many) AssignmentFile (many) ←→ (1) User
```

### 2. File Storage: UUID-Based Naming

**Decision:** Store files with UUID-based names on disk, but preserve original filename in database for display.

**Implementation:**
```python
unique_filename = f"{assignment_id}_{uuid.uuid4().hex}.{ext}"  # Filesystem
filename = file.filename  # Database (display name)
```

**Rationale:**
- **Security**: Eliminates path traversal attacks and special character issues
- **Collision-free**: UUIDs guarantee no filename conflicts
- **UX**: Students see original filename "COSC328 Midterm Notes.pdf" not "15_a3f2e1b9.pdf"
- **No sanitization needed**: `secure_filename()` not required since we control the storage name

### 3. API Design: File-Centric Operations

**Decision:** Endpoints operate on individual file IDs, not assignment-level file operations.

**Endpoints:**
- `POST /upload_file/:assignment_id` - Upload new file (creates `AssignmentFile` record)
- `GET /files/:assignment_id` - List all files for assignment
- `GET /download_file/:file_id` - Download specific file by ID
- `DELETE /delete_file/:file_id` - Delete specific file by ID

**Rationale:**
- Supports multiple files naturally
- Delete/download operations target specific files, not "the assignment's file"
- RESTful design where each file is a resource

---

## Implementation Details

### Backend Changes

#### 1. New Model: `AssignmentFile`

**File:** `flask_backend/api/models/assignment_file_model.py`

**Purpose:** Represents a single file attached to an assignment.

**Fields:**
```python
id: Integer (primary key)
assignment_id: Integer (foreign key to Assignment)
filename: String (original filename for display)
file_path: String (UUID-based filename on disk)
uploaded_at: DateTime (auto-set to current time)
uploaded_by: Integer (foreign key to User)
```

**Key Methods:**
- `create(file)` - Insert new file record
- `delete_by_id(file_id)` - Remove file record
- `get_by_id(file_id)` - Retrieve single file
- `get_by_assignment_id(assignment_id)` - Get all files for assignment

**Relationships:**
```python
assignment = db.relationship('Assignment', backref=db.backref('files', lazy='dynamic'))
uploader = db.relationship('User', backref=db.backref('uploaded_assignment_files', lazy='dynamic'))
```

#### 2. Updated Controller: `assignment_controller.py`

**File:** `flask_backend/api/controllers/assignment_controller.py`

**Changes Made:**

**a) Upload Endpoint (Modified):**
```python
@bp.route("/upload_file/<int:assignment_id>", methods=["POST"])
@jwt_teacher_required
def upload_assignment_file(assignment_id):
    # Key changes:
    # 1. Creates NEW AssignmentFile record instead of updating Assignment
    # 2. Stores original filename without secure_filename() sanitization
    # 3. Uses UUID for filesystem safety
    
    unique_filename = f"{assignment_id}_{uuid.uuid4().hex}.{ext}"
    file.save(filepath)
    
    new_file = AssignmentFile(
        assignment_id=assignment_id,
        filename=file.filename,  # Original name preserved
        file_path=unique_filename,
        uploaded_by=user.id
    )
    AssignmentFile.create(new_file)
```

**b) List Files Endpoint (New):**
```python
@bp.route("/files/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment_files(assignment_id):
    # Returns array of all files for assignment
    files = AssignmentFile.get_by_assignment_id(assignment_id)
    return jsonify(AssignmentFileSchema(many=True).dump(files)), 200
```

**c) Download Endpoint (Modified):**
```python
@bp.route("/download_file/<int:file_id>", methods=["GET"])
@jwt_required()
def download_assignment_file(file_id):
    # Changed from assignment_id to file_id parameter
    file = AssignmentFile.get_by_id(file_id)
    return send_from_directory(folder, file.file_path, as_attachment=True, download_name=file.filename)
```

**d) Delete Endpoint (Modified):**
```python
@bp.route("/delete_file/<int:file_id>", methods=["DELETE"])
@jwt_teacher_required
def delete_assignment_file(file_id):
    # Changed from assignment_id to file_id parameter
    # Deletes specific file record and filesystem file
    file = AssignmentFile.get_by_id(file_id)
    os.remove(file_path)
    AssignmentFile.delete_by_id(file_id)
```

#### 3. Schema Addition: `schemas.py`

**File:** `flask_backend/api/models/schemas.py`

**Added:**
```python
class AssignmentFileSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = AssignmentFile
        load_instance = True
    
    uploaded_at = ma.auto_field(dump_only=True)
```

#### 4. Model Exports: `models/__init__.py`

**File:** `flask_backend/api/models/__init__.py`

**Added to imports:**
```python
from .assignment_file_model import AssignmentFile
from .schemas import AssignmentFileSchema
```

**Added to `__all__`:**
```python
"AssignmentFile",
"AssignmentFileSchema",
```

---

### Frontend Changes

#### 1. API Client: `api.ts`

**File:** `frontend/src/util/api.ts`

**New Functions:**
```typescript
// Get all files for an assignment
export async function getAssignmentFiles(assignmentId: number): Promise<AssignmentFile[]> {
  const response = await fetch(`${BASE_URL}/assignments/files/${assignmentId}`, {
    credentials: 'include'
  });
  return response.json();
}
```

**Modified Functions:**
```typescript
// Download by file ID instead of assignment ID
export async function downloadAssignmentFile(fileId: number): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/assignments/download_file/${fileId}`, {
    credentials: 'include'
  });
  return response.blob();
}

// Delete by file ID instead of assignment ID
export async function deleteAssignmentFile(fileId: number): Promise<void> {
  await fetch(`${BASE_URL}/assignments/delete_file/${fileId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
}
```

**Upload function unchanged** (backend changed to create new records internally).

#### 2. Teacher Component: `AssignmentFileUpload.tsx`

**File:** `frontend/src/components/AssignmentFileUpload.tsx`

**Complete Rewrite - Key Changes:**

**Previous Design:**
- Conditional rendering: Show file info OR upload section
- Single file management
- Replace on upload

**New Design:**
- Always show file list + upload section
- Multiple file management
- Accumulative uploads

**Structure:**
```tsx
<div className="assignment-file-upload-container">
  <h3>Assignment Files</h3>
  
  {/* File List Section */}
  {loading ? "Loading..." : files.length === 0 ? "No files" : (
    <div className="files-list">
      {files.map(file => (
        <div className="file-item" key={file.id}>
          <div className="file-info">
            <span className="file-icon">📄</span>
            <span className="file-name">{file.filename}</span>
            <span className="file-date">{new Date(file.uploaded_at).toLocaleDateString()}</span>
          </div>
          <div className="file-actions">
            <button onClick={() => handleDownload(file.id, file.filename)}>Download</button>
            <button onClick={() => handleDelete(file.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )}
  
  {/* Upload Section (Always Visible) */}
  <div className="upload-section">
    <h4>Add New File</h4>
    <div className="file-drop-zone">
      {/* Drag-and-drop upload UI */}
    </div>
  </div>
</div>
```

**State Management:**
```typescript
const [files, setFiles] = useState<AssignmentFile[]>([]);

useEffect(() => {
  loadFiles();  // Fetch files on mount
}, [assignmentId]);

const loadFiles = async () => {
  const filesData = await getAssignmentFiles(assignmentId);
  setFiles(filesData);
};

// After upload or delete, reload the list
await uploadAssignmentFile(assignmentId, file);
await loadFiles();  // Refresh
```

#### 3. Student Component: `AssignmentFileDisplay.tsx`

**File:** `frontend/src/components/AssignmentFileDisplay.tsx`

**Complete Rewrite - Key Changes:**

**Previous Props:**
```typescript
// Old: Single file display
interface Props {
  assignmentId: number;
  filename: string | null;
}
```

**New Props:**
```typescript
// New: Fetches all files itself
interface Props {
  assignmentId: number;
}
```

**Implementation:**
```tsx
const [files, setFiles] = useState<AssignmentFile[]>([]);

useEffect(() => {
  loadFiles();
}, [assignmentId]);

// Displays list of files with download buttons (no delete)
<div className="files-list">
  {files.map(file => (
    <div className="file-card" key={file.id}>
      <div className="file-info">
        <span className="file-icon">📄</span>
        <span className="file-name">{file.filename}</span>
        <span className="file-date">{new Date(file.uploaded_at).toLocaleDateString()}</span>
      </div>
      <button onClick={() => handleDownload(file.id, file.filename)}>
        Download
      </button>
    </div>
  ))}
</div>
```

#### 4. Parent Component: `Assignment.tsx`

**File:** `frontend/src/pages/Assignment.tsx`

**Simplified Integration:**

**Removed:**
```typescript
// No longer needed - components fetch their own data
const [attachmentFilename, setAttachmentFilename] = useState<string | null>(null);

const fetchAssignmentDetails = async () => {
  // Removed file-related logic
};
```

**Updated Props:**
```tsx
{/* Teacher view */}
<AssignmentFileUpload assignmentId={Number(id)} />

{/* Student view */}
<AssignmentFileDisplay assignmentId={Number(id)} />
```

#### 5. Styling Updates

**Files:**
- `frontend/src/components/AssignmentFileUpload.css`
- `frontend/src/components/AssignmentFileDisplay.css`

**Key CSS Classes Added:**
```css
.files-list { /* Container for file items */ }
.file-item { /* Individual file row */ }
.file-info { /* Filename + metadata */ }
.file-actions { /* Button group */ }
.file-date { /* Upload timestamp */ }
.upload-section { /* Separated upload area */ }
.delete-file-button-small { /* Individual delete button */ }
```

---

## Security Considerations

### 1. Filename Sanitization Decision

**Original Approach:** Use `secure_filename()` from Werkzeug
- **Problem:** Converts "COSC328 Midterm Notes.pdf" → "COSC328_Midterm_Notes.pdf"
- **Impact:** Poor UX - students see sanitized names

**Final Approach:** Store original filename in DB, use UUID for filesystem
```python
# Storage (secure)
unique_filename = f"{assignment_id}_{uuid.uuid4().hex}.{ext}"

# Display (user-friendly)
filename = file.filename  # Original with spaces preserved
```

**Security Analysis:**
- ✅ **Path traversal**: Impossible - UUID controls filesystem name
- ✅ **Special characters**: No issue - never touches filesystem
- ✅ **Collisions**: UUID guarantees uniqueness
- ✅ **XSS risk**: Frontend escapes HTML by default (React)

### 2. Authorization

**Teacher-only operations:**
- Upload: `@jwt_teacher_required`
- Delete: `@jwt_teacher_required`
- Verified via `course.teacherID == user.id`

**Student operations:**
- Download: `@jwt_required()` (any authenticated user)
- View list: `@jwt_required()`
- Access controlled by course enrollment check

### 3. File Type Validation

```python
ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'docx', 'txt', 'zip'}

def allowed_document_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_DOCUMENT_EXTENSIONS
```

**Size limit:** 5MB (configured in Flask)

---

## Testing Workflow

### Database Migration

Since a new table was added, existing databases require migration:

```powershell
cd flask_backend
.\reset-db.ps1  # Drops and recreates database with new schema
```

**Alternative (manual):**
```powershell
flask --app api drop_db
flask --app api init_db
flask --app api add_users
```

### Manual Testing Checklist

**As Teacher:**
1. ✅ Upload first file to assignment
2. ✅ Verify file appears in list
3. ✅ Upload second file to same assignment
4. ✅ Verify both files show in list
5. ✅ Download each file individually
6. ✅ Delete one file
7. ✅ Verify other file remains
8. ✅ Verify filename with spaces displays correctly

**As Student:**
1. ✅ View assignment with multiple files
2. ✅ Download files individually
3. ✅ Verify no delete buttons visible
4. ✅ Verify filename matches teacher's upload

---

## File Structure Summary

### New Files Created
```
flask_backend/
  api/
    models/
      assignment_file_model.py          # New model
  setup.ps1                              # New setup script
  setup.sh                               # New setup script (macOS/Linux)
  reset-db.ps1                           # New database reset script
  reset-db.sh                            # New database reset script (macOS/Linux)

docs/
  User_story_implementations/
    MULTIPLE_FILE_UPLOAD_IMPLEMENTATION.md  # This document
```

### Modified Files
```
flask_backend/
  api/
    controllers/
      assignment_controller.py          # Updated endpoints
    models/
      __init__.py                       # Added exports
      schemas.py                        # Added AssignmentFileSchema

frontend/
  src/
    components/
      AssignmentFileUpload.tsx          # Complete rewrite
      AssignmentFileUpload.css          # Updated styles
      AssignmentFileDisplay.tsx         # Complete rewrite
      AssignmentFileDisplay.css         # Updated styles
    pages/
      Assignment.tsx                    # Simplified props
    util/
      api.ts                            # Updated API functions

docs/
  GETTING_STARTED.md                    # Added setup script instructions
```

---

## Future Enhancements

### Potential Improvements

1. **File Preview**
   - PDF preview in browser
   - Document thumbnails

2. **Bulk Operations**
   - Upload multiple files at once
   - Bulk delete/download

3. **File Metadata**
   - File size display
   - File type icons based on extension
   - Last modified date

4. **Advanced Features**
   - File versioning (replace with history)
   - Comments/notes per file
   - Student file submissions (reverse flow)

5. **Storage Optimization**
   - Move to cloud storage (S3, Azure Blob)
   - Compression for large files
   - CDN for faster downloads

6. **Admin Features**
   - Storage quota management
   - File audit logs
   - Bulk cleanup tools

---

## Lessons Learned

### What Worked Well

1. **Separation of concerns**: UUID storage names vs display names solved both security and UX
2. **Component independence**: Teacher/student components fetch their own data
3. **Accumulative design**: Teachers appreciate ability to add files incrementally
4. **Helper scripts**: `setup.ps1` and `reset-db.ps1` dramatically improved developer experience

### Challenges Encountered

1. **PowerShell encoding**: Emoji characters in scripts caused parser errors
   - **Solution**: Removed emojis, used plain text

2. **Filename sanitization**: `secure_filename()` degraded UX
   - **Solution**: UUID-based storage made sanitization unnecessary

3. **State synchronization**: Component needed to reload after upload/delete
   - **Solution**: `loadFiles()` called after mutations

4. **Legacy code confusion**: Initially unclear if Assignment.tsx should manage file state
   - **Solution**: Moved file fetching into upload/display components

---

## Related Documentation

- [Database Schema](../schema/database-schema.md)
- [API Endpoints](../dev-guidelines/ENDPOINT_SUMMARY.md)
- [Getting Started Guide](../GETTING_STARTED.md)
- [Testing Guide](../TESTING.md)
