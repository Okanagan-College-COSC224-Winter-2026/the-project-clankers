# Quick database reset script for development
# Usage: .\reset-db.ps1 (from flask_backend directory)

Write-Host "Resetting database..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "api")) {
    Write-Host "Error: Please run this script from the flask_backend directory" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found. Run setup.ps1 first!" -ForegroundColor Red
    exit 1
}

# Get the full path to the Python executable in the venv
$pythonPath = ".venv\Scripts\python.exe"

# Set Flask app
$env:FLASK_APP = "api"

# Drop existing database if it exists
if (Test-Path "instance\app.sqlite") {
    Write-Host "Dropping existing database..." -ForegroundColor Yellow
    Remove-Item "instance\app.sqlite" -Force
    Write-Host "Database dropped" -ForegroundColor Green
} else {
    Write-Host "No existing database found" -ForegroundColor Gray
}

# Initialize database
Write-Host "Creating new database..." -ForegroundColor Yellow
& $pythonPath -m flask init_db

# Add sample users
Write-Host "Adding sample users..." -ForegroundColor Yellow
& $pythonPath -m flask add_users

Write-Host ""
Write-Host "Database reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Sample accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@example.com   / 123456" -ForegroundColor White
Write-Host "  Teacher: teacher@example.com / 123456" -ForegroundColor White
Write-Host "  Student: student@example.com / 123456" -ForegroundColor White
Write-Host ""
Write-Host "Start the server with: flask --app api run" -ForegroundColor Cyan
