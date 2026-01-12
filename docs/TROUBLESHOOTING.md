# Troubleshooting Guide

Common issues and solutions when working with the Peer Evaluation App.

---

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Network & CORS Issues](#network--cors-issues)
- [Test Issues](#test-issues)
- [Git & Development Issues](#git--development-issues)

---

## 🔧 Installation Issues

### Python Not Found

**Symptoms:**
```bash
python: command not found
```

**Solution (macOS/Linux):**
```bash
# Try python3 instead
python3 --version

# If still not found, install Python
# macOS with Homebrew:
brew install python3

# Ubuntu/Debian:
sudo apt update && sudo apt install python3 python3-pip python3-venv

# Fedora/RHEL:
sudo dnf install python3 python3-pip
```

**Solution (Windows):**
1. Download from [python.org](https://www.python.org/downloads/)
2. Run installer and check **"Add Python to PATH"**
3. Restart terminal

### Node.js Not Found

**Symptoms:**
```bash
node: command not found
npm: command not found
```

**Solution (All OS):**
1. Download Node.js 20.x LTS from [nodejs.org](https://nodejs.org/)
2. Run installer (npm comes with it)
3. Restart terminal
4. Verify: `node --version && npm --version`

### Virtual Environment Activation Fails (Windows)

**Symptoms:**
```powershell
.\venv\Scripts\Activate.ps1 : cannot be loaded because running scripts is disabled
```

**Solution:**
```powershell
# Run as Administrator or use:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try activating again:
.\venv\Scripts\Activate.ps1
```

### pip install Fails

**Symptoms:**
```bash
ERROR: Could not find a version that satisfies the requirement <package>
```

**Solutions:**

1. **Update pip:**
   ```bash
   python -m pip install --upgrade pip
   ```

2. **Check Python version:**
   ```bash
   python --version  # Must be 3.8+
   ```

3. **Clear pip cache:**
   ```bash
   pip cache purge
   pip install -e . --no-cache-dir
   ```

4. **Install build tools (if compilation errors):**
   ```bash
   # macOS:
   xcode-select --install
   
   # Ubuntu/Debian:
   sudo apt install build-essential python3-dev
   
   # Windows:
   # Install Visual Studio Build Tools from microsoft.com
   ```

---

## 🐍 Backend Issues

### Flask Command Not Found

**Symptoms:**
```bash
flask: command not found
```

**Common Cause:** The `FLASK_APP` environment variable is not set for the current terminal session, or the virtual environment is not activated.

**Solution 1 - Set FLASK_APP environment variable:**
```bash
# macOS/Linux (bash/zsh):
cd flask_backend
export FLASK_APP=api
flask run

# Windows (PowerShell):
cd flask_backend
$env:FLASK_APP = "api"
flask run

# Windows (Command Prompt):
cd flask_backend
set FLASK_APP=api
flask run
```

**Solution 2 - Ensure virtual environment is activated:**
```bash
# macOS/Linux:
source venv/bin/activate

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Then set FLASK_APP and run
```

**Solution 3 - Reinstall if flask is missing:**
```bash
cd flask_backend
pip install -e .
```

**Pro Tip:** You need to set `FLASK_APP=api` in every new terminal session. To avoid this, you can:
- Use `flask --app api run` instead of setting the variable
- Or add `export FLASK_APP=api` to your shell profile (~/.bashrc, ~/.zshrc, etc.)

### Port 5000 Already in Use

**Symptoms:**
```bash
OSError: [Errno 48] Address already in use
```

**Solution 1 - Kill the process:**
```bash
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

**Solution 2 - Use a different port:**
```bash
flask run --port 5001
```

Then update `frontend/src/util/api.ts` BASE_URL to `http://localhost:5001`.

### Import Errors

**Symptoms:**
```python
ModuleNotFoundError: No module named 'api'
```

**Solutions:**

1. **Reinstall in editable mode:**
   ```bash
   cd flask_backend
   pip install -e .
   ```

2. **Check virtual environment:**
   ```bash
   which python  # Should show venv path
   ```

3. **Clear Python cache:**
   ```bash
   find . -type d -name __pycache__ -exec rm -rf {} +
   find . -type f -name "*.pyc" -delete
   ```

### Flask App Crashes on Startup

**Symptoms:**
```bash
sqlalchemy.exc.OperationalError: no such table
```

**Solution:**
```bash
# Recreate database
cd flask_backend
flask drop_db
flask init_db
flask add_users
```

---

## ⚛️ Frontend Issues

### Port 3000 Already in Use

**Symptoms:**
```bash
Port 3000 is already in use
```

**Solution 1 - Kill the process:**
```bash
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Solution 2 - Use different port:**

Edit `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3001  // Change port
  }
})
```

### npm install Fails

**Symptoms:**
```bash
npm ERR! code ENOENT
npm ERR! syscall open
```

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

3. **Check Node version:**
   ```bash
   node --version  # Should be 20.x+
   ```

### Module Not Found Errors

**Symptoms:**
```bash
Error: Cannot find module '@/components/Example'
```

**Solutions:**

1. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check import paths:**
   ```typescript
   // Correct
   import Example from './components/Example'
   
   // May fail if path alias not configured
   import Example from '@/components/Example'
   ```

### Frontend Shows Blank Page

**Solutions:**

1. **Check browser console** (F12) for errors
2. **Verify backend is running** at http://localhost:5000
3. **Check BASE_URL** in `frontend/src/util/api.ts`
4. **Hard refresh** browser (Ctrl+Shift+R or Cmd+Shift+R)
5. **Clear browser cache**

---

## 🗄️ Database Issues

### Database File Locked

**Symptoms:**
```bash
sqlite3.OperationalError: database is locked
```

**Solutions:**

1. **Close all connections:**
   - Stop Flask server (Ctrl+C)
   - Close any SQLite browser tools
   - Restart Flask

2. **Delete and recreate:**
   ```bash
   cd flask_backend
   rm instance/app.sqlite
   flask init_db
   flask add_users
   ```

### Table Does Not Exist

**Symptoms:**
```bash
sqlite3.OperationalError: no such table: User
```

**Solution:**
```bash
cd flask_backend
flask init_db
```

### Migration Errors

**Symptoms:**
```bash
alembic.util.exc.CommandError: Can't locate revision identified by 'xyz'
```

**Solution (Development Only):**
```bash
# Drop and recreate database
cd flask_backend
rm instance/app.sqlite
flask init_db
flask add_users
```

**For Production:** Contact team lead before modifying database.

### Cannot Connect to PostgreSQL (Production)

**Symptoms:**
```bash
psycopg2.OperationalError: could not connect to server
```

**Check:**
1. `DATABASE_URL` environment variable is set
2. PostgreSQL server is running
3. Credentials are correct
4. Network/firewall allows connection
5. SSL requirements (use `?sslmode=require` in URL)

---

## 🔐 Authentication Issues

### Login Always Returns 401

**Symptoms:**
- Correct credentials return "Invalid credentials"

**Solutions:**

1. **Verify user exists:**
   ```bash
   sqlite3 flask_backend/instance/app.sqlite
   SELECT * FROM User WHERE email = 'your-email@example.com';
   .quit
   ```

2. **Recreate test users:**
   ```bash
   cd flask_backend
   flask drop_db
   flask init_db
   flask add_users
   ```

3. **Check password hashing:**
   - Passwords must be hashed with `werkzeug.security.generate_password_hash()`
   - Never store plain text passwords

### JWT Token Expired

**Symptoms:**
```json
{"msg": "Token has expired"}
```

**Solution:**
- Login again to get a new token
- For development, increase JWT expiration in `flask_backend/api/__init__.py`:
  ```python
  app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
  ```

### Cookies Not Being Set

**Symptoms:**
- Login succeeds but subsequent requests are unauthorized

**Check:**

1. **Frontend uses `credentials: 'include'`:**
   ```typescript
   fetch(url, {
     credentials: 'include'  // Required!
   })
   ```

2. **Backend and frontend on same domain (dev):**
   - Backend: `localhost:5000`
   - Frontend: `localhost:3000`
   - ✅ Same domain, should work

3. **Check browser cookies:**
   - Open DevTools → Application → Cookies
   - Look for `access_token_cookie`

4. **CORS configuration:**
   - See [Network & CORS Issues](#network--cors-issues)

### "Missing Authorization Header" Error

**Symptom:**
```json
{"msg": "Missing Authorization Header"}
```

**Cause:** Using old authentication method (Bearer tokens).

**Solution:** 
- This app uses **HTTPOnly cookies**, not Authorization headers
- Ensure all requests include `credentials: 'include'`
- Remove any `Authorization: Bearer <token>` headers

---

## 🌐 Network & CORS Issues

### CORS Policy Blocking Requests

**Symptoms:**
```
Access to fetch at 'http://localhost:5000/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Solution:**

Check `flask_backend/api/__init__.py` has correct CORS config:
```python
from flask_cors import CORS

CORS(app, 
     origins=["http://localhost:3000"],
     supports_credentials=True)
```

### Cannot Reach Backend from Frontend

**Symptoms:**
```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```

**Check:**

1. **Backend is running:**
   ```bash
   curl http://localhost:5000/hello
   # Should return: {"message": "Hello, World!"}
   ```

2. **Port is correct:** Backend should be on 5000
3. **BASE_URL is correct** in `frontend/src/util/api.ts`
4. **Firewall not blocking** local connections

### Requests Hang/Timeout

**Check:**

1. **Backend is responsive:**
   ```bash
   curl -v http://localhost:5000/hello
   ```

2. **No infinite loops** in code
3. **Database not locked**
4. **Check Flask logs** in terminal for errors

---

## 🧪 Test Issues

### Tests Fail: "No module named 'api'"

**Solution:**
```bash
cd flask_backend
pip install -e .
```

### Tests Pass Locally but Fail in CI

**Common Causes:**

1. **Environment differences:** Check Python version in CI
2. **Missing dependencies:** Ensure `requirements-dev.txt` is complete
3. **Database state:** Tests should be independent (use fixtures)
4. **Timing issues:** Avoid `time.sleep()`, use events/mocks

### pytest: Command Not Found

**Solution:**
```bash
cd flask_backend
source venv/bin/activate
pip install pytest
```

### Import Errors in Tests

**Check:**
```bash
# Run pytest from flask_backend directory
cd flask_backend
pytest

# Not from project root
cd /path/to/Peer-Evaluation-App-V1
pytest  # May fail
```

---

## 🔀 Git & Development Issues

### Git Push Rejected

**Symptoms:**
```bash
! [rejected] feature/xyz -> feature/xyz (non-fast-forward)
```

**Solution:**
```bash
# Pull latest changes
git pull origin feature/xyz

# Resolve conflicts if any
git add .
git commit -m "merge: resolve conflicts"

# Push again
git push origin feature/xyz
```

### Merge Conflicts

**Step-by-step:**

1. **Pull latest dev:**
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Merge into your branch:**
   ```bash
   git checkout feature/your-feature
   git merge dev
   ```

3. **Resolve conflicts:**
   - Open files with conflicts (marked with `<<<<<<`, `======`, `>>>>>>`)
   - Edit to keep desired changes
   - Remove conflict markers

4. **Complete merge:**
   ```bash
   git add .
   git commit -m "merge: resolve conflicts with dev"
   git push origin feature/your-feature
   ```

### Accidentally Committed to Wrong Branch

**Solution:**

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Switch to correct branch
git checkout correct-branch

# Commit again
git add .
git commit -m "your message"
```

### Want to Undo Last Commit

```bash
# Keep changes (unstage commit)
git reset --soft HEAD~1

# Discard changes (dangerous!)
git reset --hard HEAD~1
```

---

## 🆘 Still Stuck?

If none of these solutions work:

1. **Check logs carefully** - Error messages usually indicate the problem
2. **Search GitHub Issues** - Someone may have had the same problem
3. **Ask the team** - Use your team communication channel
4. **Create an issue** - Document the problem for others
5. **Check documentation** - See [docs/README.md](README.md) for all docs

---

## 📝 Reporting Issues

When asking for help, include:

1. **What you're trying to do**
2. **What you expected to happen**
3. **What actually happened**
4. **Error messages** (full output, not partial)
5. **Your environment:**
   - OS and version
   - Python version: `python --version`
   - Node version: `node --version`
   - How you installed dependencies
6. **Steps to reproduce** the issue
7. **What you've already tried**

**Example:**
```
**Problem:** Flask won't start

**Expected:** Server should run on port 5000

**Actual:** Get "Port already in use" error

**Error:**
```
OSError: [Errno 48] Address already in use
```

**Environment:**
- macOS 14.2
- Python 3.11.5
- Installed via Homebrew

**Tried:**
- Killed process on port 5000
- Restarted terminal
- Still fails
```

---

**Remember:** Most issues have been encountered before. Don't hesitate to ask for help!
