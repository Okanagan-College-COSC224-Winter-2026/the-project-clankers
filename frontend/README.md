# Peer Evaluation App — Frontend

This package contains the React + TypeScript + Vite frontend for the Peer Evaluation App. Below are step‑by‑step instructions to run it for development and tips for containerizing the app for deployment.

## Prerequisites

- Node.js 20.x or newer (LTS recommended)
- npm
- Flask backend running on <http://localhost:5000>

Note: The frontend's dev server is configured to listen on port 3000.

### Installing Node.js

#### Windows

Option 1 - Official Installer:

1. Download Node.js LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer (includes npm)
3. Verify installation:

   ```powershell

   node --version
   npm --version
   ```

Option 2 - Using Chocolatey:

```powershell
choco install nodejs-lts
```

#### macOS

Option 1 - Official Installer:

1. Download Node.js LTS from [nodejs.org](https://nodejs.org/)
2. Run the `.pkg` installer
3. Verify installation:

   ```bash
   node --version
   npm --version
   ```

Option 2 - Homebrew (recommended):

```bash
brew install node
node --version
npm --version
```

#### Linux (Ubuntu/Debian)

Using NodeSource repository (recommended):

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install nodejs npm
node --version
npm --version
```

## Install dependencies

From the `frontend` directory:

```bash
cd frontend
npm install
```

This installs all required dependencies for the frontend application.

## Run the frontend for development

From the `frontend` directory:

```bash
npm run dev
```

Then open <http://localhost:3000> in your browser.

### What this expects from the backend

The frontend calls the API at `http://localhost:5000` by default. This is defined in `src/util/api.ts` as a constant `BASE_URL`. Make sure your backend is reachable at that address, or update the constant (see “Configuring the API URL” below).

## Useful scripts

From `frontend/package.json`:

- `npm run dev` — start Vite dev server with HMR
- `npm build` — type‑check and build production assets to `dist/`
- `npm preview` — preview the production build locally
- `npm lint` — run ESLint

## Configuration notes

- Dev server port/host: see `vite.config.ts`.
  - Port: 3000 (strict; the dev server will fail if the port is busy)
  - Host: 0.0.0.0 (accessible from containers/WSL)
  - File watch: polling enabled for reliable HMR in containers

- Configuring the API URL:
  - Currently set in `src/util/api.ts` as `const BASE_URL = 'http://localhost:5000'`.
  - For different environments, update this constant or refactor to read from a Vite env var (e.g., `import.meta.env.VITE_API_BASE_URL`).
  - Example refactor (optional):

    ```ts
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    ```

    Then provide `VITE_API_BASE_URL` at build/run time.

## Building for production

Create an optimized static build:

```bash
npm run build
```

This outputs static assets to `dist/` which can be served by any static web server (Nginx, Caddy, Apache, S3 + CloudFront, etc.). You can preview locally with:

```bash
npm run preview
```

## Troubleshooting

### Port 3000 Already in Use

The dev server strictly requires port 3000 and will fail if it's busy.

**Find and kill the process:**

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Or change the port in `vite.config.ts`:**

```ts
export default defineConfig({
  server: {
    port: 3001,  // Change to any available port
    // ...
  }
})
```

**Note:** If you change the port, update CORS configuration in Flask backend (`api/__init__.py`).

### Cannot Connect to Backend

**Symptom:** Network errors, 404s, or timeouts when calling APIs

**Solutions:**

1. **Verify backend is running:**

   ```bash
   curl http://localhost:5000/ping
   # Should return: {"message": "pong"}
   ```

2. **Check BASE_URL configuration:**

   Open `src/util/api.ts` and verify:

   ```ts
   const BASE_URL = 'http://localhost:5000';  // Must match backend port
   ```

3. **Test backend from browser:**

   Open <http://localhost:5000/ping> directly in your browser

4. **Check for port conflicts:**

   ```bash
   # Linux/macOS
   lsof -i :5000
   
   # Windows (PowerShell)
   Get-NetTCPConnection -LocalPort 5000
   ```

### CORS Errors

**Symptom:** Console shows "CORS policy" or "Access-Control-Allow-Origin" errors

**Root Cause:** Backend not allowing requests from `http://localhost:3000`

**Solution:**

1. **Check Flask backend CORS config** (`flask_backend/api/__init__.py`):

   ```python
   CORS(app, 
        resources={r"/*": {"origins": ["http://localhost:3000"]}},
        supports_credentials=True)
   ```

2. **If you changed frontend port**, update backend CORS:

   ```python
   origins=["http://localhost:3001"]  # Match your new port
   ```

3. **Restart Flask backend** after CORS changes

4. **Check browser console** for specific CORS error details

### Authentication Issues (401 Unauthorized)

**Symptom:** Login works but subsequent requests fail with 401

**Causes and Solutions:**

1. **Cookies not being sent:**

   Verify all API calls include `credentials: 'include'`:

   ```ts
   // src/util/api.ts - Correct pattern
   fetch(`${BASE_URL}/user/profile`, {
     credentials: 'include'  // Required for HTTPOnly cookies
   })
   ```

2. **JWT token expired:**

   Tokens expire after 1 hour by default. Log out and log back in.

3. **Browser blocking cookies (Safari/Private mode):**

   - Safari: Enable "Allow all cookies" in Preferences → Privacy
   - Private/Incognito: Use regular browsing mode for development

4. **Cross-domain cookie issues:**

   Backend and frontend must be on same domain in production (e.g., both on `example.com`, not `api.example.com` vs `app.example.com`)

### Blank Page / White Screen

**Symptom:** Frontend loads but shows blank white page

**Solutions:**

1. **Check browser console** for errors (F12 → Console tab)

2. **Clear browser cache:**

   - Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
   - Firefox: Ctrl+Shift+Delete → Cache
   - Safari: Develop → Empty Caches

3. **Restart dev server:**

   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

4. **Delete node_modules and reinstall:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

### Hot Module Replacement (HMR) Not Working

**Symptom:** Changes to code don't appear in browser without manual refresh

**Solutions:**

1. **Check Vite dev server output** for warnings about file watchers

2. **Increase file watcher limits (Linux):**

   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

3. **Disable polling (if too slow):**

   Edit `vite.config.ts`:

   ```ts
   export default defineConfig({
     server: {
       watch: {
         usePolling: false  // Try disabling polling
       }
     }
   })
   ```

### TypeScript Errors During Build

**Symptom:** `npm run build` fails with type errors

**Solutions:**

1. **Check TypeScript version:**

   ```bash
   npx tsc --version
   # Should be 5.x or newer
   ```

2. **Run type checking separately:**

   ```bash
   npx tsc --noEmit
   # Shows all type errors without building
   ```

3. **Fix type errors** before building (build enforces strict type checking)

4. **Check `tsconfig.json`** for strict settings (do not disable `strict` mode)

### Need More Help?

- **Full troubleshooting guide:** [../docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
- **Backend issues:** [../flask_backend/README.md](../flask_backend/README.md)
- **Architecture overview:** [../docs/ARCHITECTURE_OVERVIEW.md](../docs/ARCHITECTURE_OVERVIEW.md)


