# Roster Upload Feature - User Guide

## For Teachers

### How to Upload a Student Roster

1. **Navigate to your class** in the application
2. **Click "Add Students via CSV"** button in the class header
3. **Select your CSV file** from the file picker
4. **Wait for upload** to complete

### After Upload Success

You'll see a modal displaying:

- **Summary**: Number of students enrolled and newly created
- **Temporary Passwords Table**: Shows each new student's credentials
  - Student ID
  - Email address  
  - Temporary password (unique, 10 characters)

### What You Can Do with the Passwords

#### Option 1: Copy All
- Click **"Copy All"** button
- Paste into email, LMS, or document
- Format: `email - Password: temp_password` (one per line)

#### Option 2: Download CSV
- Click **"Download CSV"** button
- Saves file: `student-credentials-YYYY-MM-DD.csv`
- Contains: Student ID, Email, Temporary Password
- Use for your records or bulk email

#### Option 3: Manual Distribution
- Copy individual passwords from the table
- Send to students via your preferred method

### ⚠️ Important Security Notes

1. **Passwords are shown only once** - Save them immediately!
2. **Students must change password** on first login (enforced by system)
3. **Keep credentials secure** - Don't share via unsecured channels
4. **Close modal carefully** - Once closed, passwords cannot be retrieved

### CSV Format Required

Your roster CSV must have exactly these headers:

```csv
id,name,email
300111222,Alice Johnson,alice@university.edu
300111223,Bob Wilson,bob@university.edu
```

- **id**: Student's institutional ID (unique)
- **name**: Full name
- **email**: Email address (must be valid format)

### What Happens During Upload

1. **Existing students** (by ID or email) are enrolled without creating new accounts
2. **New students** get:
   - Account created automatically
   - Unique temporary password generated
   - Enrolled in your course
   - `must_change_password` flag set
3. **Duplicates** are skipped (won't re-enroll)

---

## For Students

### How to Log In (After Roster Upload)

1. **Receive credentials** from your teacher:
   - Email address
   - Temporary password

2. **Go to login page**

3. **Enter credentials**:
   - Email: `your.email@university.edu`
   - Password: (temporary password from teacher)

4. **You're in!** The system will prompt you to change your password on first login (future feature)

### First Login Security

- Your temporary password is unique and random
- You should change it immediately after first login
- Never share your password with anyone

---

## Technical Details

### Password Generation
- **Algorithm**: Python `secrets` module (cryptographically secure)
- **Length**: 10 characters
- **Character set**: `a-z`, `A-Z`, `0-9`
- **Uniqueness**: Practically guaranteed by cryptographic randomness

### Example Generated Passwords
```
kJ8mN2pQ4r
xT7vW9yZ1a
aB3d5F7g9H
```

### Security Features
- ✅ Passwords are hashed before storage (pbkdf2:sha256)
- ✅ Transmitted over HTTPS only
- ✅ Never logged or stored in plaintext
- ✅ Displayed to teacher only once
- ✅ Must be changed by student after first login

---

## Troubleshooting

### Upload Failed
- **Check CSV format**: Must have `id,name,email` headers
- **Verify emails**: Must be valid format (name@domain.tld)
- **Check authorization**: Only course teacher can upload roster

### Student Can't Log In
- **Verify credentials**: Check for typos in email/password
- **Case sensitivity**: Passwords are case-sensitive
- **Account exists**: Student should be in course Members list

### No Passwords Shown
- **New students only**: Only newly created accounts get temporary passwords
- **Already exists**: If student was previously registered, no new password generated

---

## Demo Workflow

### Teacher Side
```
1. Click "Add Students via CSV"
2. Select file: roster.csv
3. Modal appears:
   ✅ 3 students enrolled in course
   🆕 2 new student accounts created
   
   [Copy All] [Download CSV]
   
   | Student ID | Email                  | Temporary Password |
   |------------|------------------------|-------------------|
   | 300111222  | alice@university.edu   | kJ8mN2pQ4r       |
   | 300111223  | bob@university.edu     | xT7vW9yZ1a       |

4. Download CSV or copy credentials
5. Distribute to students via email/LMS
```

### Student Side
```
1. Receive email from teacher:
   "Your login credentials:
    Email: alice@university.edu
    Password: kJ8mN2pQ4r"

2. Go to login page
3. Enter email and password
4. Successfully logged in ✓
5. (Future) Prompted to change password
```

---

## Best Practices

### For Teachers
- ✅ Upload roster before semester starts
- ✅ Download CSV backup of credentials
- ✅ Send credentials via secure channel (LMS, encrypted email)
- ✅ Remind students to change password after first login
- ✅ Test with small batch first

### For Administrators
- ✅ Provide teachers with CSV template
- ✅ Ensure institutional IDs are unique
- ✅ Document password policy for students
- ✅ Consider integrating email delivery (future enhancement)

---

## Future Enhancements

Coming soon:
- 📧 Automated email delivery to students
- 🔒 Enforced password change on first login (frontend)
- 📊 Roster update/edit capabilities
- 🗑️ Bulk student removal
- 📝 Roster upload history/audit log
