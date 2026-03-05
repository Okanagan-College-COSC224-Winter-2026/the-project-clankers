# Full backend setup script - creates venv, installs dependencies, and sets up database
# Usage: .\flask_backend\setup.ps1 (from root) or .\setup.ps1 (from flask_backend)

Write-Host "Setting up Flask backend..." -ForegroundColor Cyan

# Check if we're in the flask_backend directory or need to cd into it
if (Test-Path "api") {
    # Already in flask_backend directory
    Write-Host "Running from flask_backend directory" -ForegroundColor Gray
} elseif (Test-Path "flask_backend\api") {
    # In root directory, need to cd into flask_backend
    Write-Host "Changing to flask_backend directory..." -ForegroundColor Gray
    Set-Location -Path "flask_backend"
} else {
    Write-Host "Error: Cannot find flask_backend directory. Please run from project root or flask_backend folder." -ForegroundColor Red
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "Virtual environment already exists" -ForegroundColor Green
}

# Get the full path to the Python executable in the venv
$pythonPath = ".venv\Scripts\python.exe"
$pipPath = ".venv\Scripts\pip.exe"

# Install package in editable mode
Write-Host "Installing package dependencies..." -ForegroundColor Yellow
& $pipPath install -e . --quiet

# Install dev requirements
Write-Host "Installing dev dependencies..." -ForegroundColor Yellow
& $pipPath install -r requirements-dev.txt --quiet

# Set Flask app environment variable
$env:FLASK_APP = "api"

# Drop existing database if it exists
if (Test-Path "instance\app.sqlite") {
    Write-Host "Existing database found - deleting it..." -ForegroundColor Yellow
    Remove-Item "instance\app.sqlite" -Force
    Write-Host "Database deleted" -ForegroundColor Green
}

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Yellow
& $pythonPath -m flask init_db

# Add sample users
Write-Host "Adding sample users..." -ForegroundColor Yellow
& $pythonPath -m flask add_users

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sample accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@example.com   / 123456" -ForegroundColor White
Write-Host "  Teacher: teacher@example.com / 123456" -ForegroundColor White
Write-Host "  Student: student@example.com / 123456" -ForegroundColor White
Write-Host ""
Write-Host "Starting Flask development server..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Set Flask app environment variable and start the server
$env:FLASK_APP = "api"
& $pythonPath -m flask run
