# Running the Peer Evaluation App with Docker

A complete step-by-step guide to run your entire application (frontend, backend, and database) using Docker instead of npm.

---

## Prerequisites

Before you start, you need to have Docker installed on your Windows machine:

1. **Download and Install Docker Desktop for Windows**
   - Go to: https://www.docker.com/products/docker-desktop
   - Download "Docker Desktop for Windoes"
   - Run the installer and follow the setup wizard
   - Make sure to enable WSL 2 backend when prompted

2. **Verify Installation**
   - Open PowerShell or Command Prompt
   - Run these commands:
     ```powershell
     docker --version
     docker-compose --version
     ```
   - Both should show version numbers (not "command not found")

---

## Quick Start (5 minutes)

### Step 1: Navigate to Project Directory

```powershell
cd C:\Users\ethan\projects\the-project-clankers
```

### Step 2: Start All Services

```powershell
docker-compose up --build
```

**What this does:**
- Builds Docker images for frontend and backend
- Starts PostgreSQL database
- Starts Flask backend (API server)
- Starts React frontend (served via Nginx)
- Downloads and installs all dependencies

**First run takes 3-5 minutes** (subsequent runs are faster)

### Step 3: Access Your Application

Once you see output like:
```
peereval-frontend | Listening on port 80
peereval-flask   | Running on http://0.0.0.0:5000
```

Your app is ready! Open your browser and go to:
```
http://localhost
```

The frontend will be available at port 80 and the backend at port 5000.

### Step 4: Stop Everything

Press `Ctrl+C` in the PowerShell window where `docker-compose up` is running.

Alternatively, from another PowerShell window:
```powershell
docker-compose down
```

---

## Complete Commands Reference

### Start Services (Standard)
```powershell
docker-compose up
```
- Starts all services
- Shows logs in terminal
- Press Ctrl+C to stop

### Start Services in Background
```powershell
docker-compose up -d
```
- Runs in detached mode (background)
- Returns control immediately
- Use this if you want to keep working in the terminal

### Stop All Services
```powershell
docker-compose down
```
- Stops and removes all containers
- Database data is preserved in volumes

```powershell
docker-compose down -v
```
- Stops and removes all containers
- Data data is not preserved, wipes database


### Stop and Remove Everything (Including Data)
```powershell
docker-compose down -v
```
- Removes containers, networks, AND volumes
- **WARNING: This deletes your database!**
- Only use this to reset everything

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f flask_backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild Images Only
```powershell
docker-compose build
```
- Rebuilds Docker images without starting
- Useful if you modified Dockerfiles or dependencies

### Rebuild and Start
```powershell
docker-compose up --build
```
- Same as regular `up`, but rebuilds images first
- Use this after changing code or dependencies

---

## Service Details

### What Services Run

1. **PostgreSQL (Port 5432)**
   - Database for the application
   - Data persists in Docker volume even if container stops

2. **Flask Backend (Port 5000)**
   - REST API server
   - Communicates with PostgreSQL
   - Health check every 30 seconds

3. **React Frontend (Port 80)**
   - Web interface served via Nginx
   - Built from source code
   - Communicates with backend via HTTP

### Port Mapping

| Service | Port | Access URL |
|---------|------|-----------|
| Frontend (Nginx) | 80 | http://localhost |
| Backend (Flask) | 5000 | http://localhost:5000 |
| Database (PostgreSQL) | 5432 | localhost:5432 (internal only) |

---

## Configuration

### Default Database Credentials (Development)
Used in `docker-compose.yml`:
- **User**: `peereval_user`
- **Password**: `dev_password_change_in_prod`
- **Database Name**: `peereval`

### Modify Configuration (Optional)

Create a `.env` file in the project root to override defaults:

```powershell
# Create .env file
@"
POSTGRES_DB=peereval
POSTGRES_USER=peereval_user
POSTGRES_PASSWORD=dev_password_change_in_prod
FLASK_ENV=production
"@ | Out-File .env -Encoding UTF8
```

Then restart:
```powershell
docker-compose down
docker-compose up
```

---

## Troubleshooting

### Problem: Port Already in Use

If you get `Error response from daemon: bind: An attempt was made to use a port that was unavailable`

**Solution**: Change the port in `docker-compose.yml`:
```yaml
# Find these lines and change the first port number
ports:
  - "8080:80"      # Changed from 80:80
  - "5001:5000"    # Changed from 5000:5000
```

Then access at `http://localhost:8080`

### Problem: Services Not Starting or Crashing

**Check logs:**
```powershell
docker-compose logs -f flask_backend
docker-compose logs -f frontend
```

**Rebuild everything:**
```powershell
docker-compose down
docker-compose up --build
```

### Problem: Database Connection Error

Flask backend won't connect to database. Check:

1. PostgreSQL is running:
   ```powershell
   docker-compose ps
   ```
   Look for `peereval-postgres` with status "Up"

2. Wait a bit - database needs time to initialize (first run)

3. Check database logs:
   ```powershell
   docker-compose logs postgres
   ```

### Problem: Frontend Shows "Cannot Connect to API"

**Check if backend is ready:**
```powershell
docker-compose logs flask_backend
```

**Give it time** - backend initialization takes 40+ seconds on first run.

**Check CORS configuration:**
The backend needs to allow requests from frontend. Check `docker-compose.yml` for:
```yaml
CORS_ORIGINS: http://localhost,http://localhost:80,http://localhost:3000
```

### Clean Slate (Nuclear Option)

If everything is broken:

```powershell
# Stop everything
docker-compose down -v

# Remove unused Docker artifacts
docker system prune

# Start fresh
docker-compose up --build
```

---

## For Your Presentation

### Before Your Presentation

1. **Test run at least once:**
   ```powershell
   docker-compose down -v
   docker-compose up --build
   ```
   - Verify all services start successfully
   - Test accessing http://localhost

2. **Build images while offline (optional):**
   ```powershell
   docker-compose build
   ```
   - Pre-builds images so launch is faster during presentation

### During Your Presentation

1. **Start services:**
   ```powershell
   docker-compose up -d
   ```
   - `-d` flag runs in background
   - Gives you a clean terminal to show

2. **Wait 30-60 seconds** for services to fully start

3. **Show the app:**
   - Open browser to http://localhost
   - Show API at http://localhost:5000
   - Show logs if needed: `docker-compose logs -f`

4. **After presentation:**
   ```powershell
   docker-compose down
   ```

---

## Advanced Usage

### Access Database Directly

Connect to PostgreSQL from your machine (requires PostgreSQL client):

```powershell
psql -h localhost -U peereval_user -d peereval -p 5432
```

When prompted, enter password: `dev_password_change_in_prod`

### Execute Commands in Running Container

```powershell
# Run a command in Flask container
docker-compose exec flask_backend python -c "print('hello')"

# Access Flask container shell
docker-compose exec flask_backend sh
```

### Monitor Resource Usage

```powershell
docker stats
```

Shows CPU, memory, and network usage for all containers.

---

## From npm to Docker - Key Differences

| npm | Docker |
|-----|--------|
| `npm install` | `docker-compose build` |
| `npm start` | `docker-compose up` |
| `npm run build` | Automatic in Dockerfile |
| Frontend on 3000 | Frontend on port 80 |
| Backend manual start | Backend auto-starts on port 5000 |
| Manual database setup | Database auto-created |

---

## Next Steps

Once comfortable with Docker:

1. **Try modifying code** - changes take effect on container restart
2. **Read** `docker-compose.yml` to understand service configuration
3. **Check** Dockerfiles to see how images are built
4. **Consider** running locally with npm for development, Docker for presentations

---

## Need Help?

If something doesn't work:

1. Check logs: `docker-compose logs -f`
2. Try clean rebuild: `docker-compose down -v && docker-compose up --build`
3. Verify Docker is running: `docker ps`
4. Ensure ports aren't in use: `netstat -ano | findstr :80`

Good luck with your presentation! 🐳
