# Quick database reset script for development
# Usage: .\reset-db.ps1

Write-Host "Resetting database..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "api")) {
    Write-Host "Error: Please run this script from the flask_backend directory" -ForegroundColor Red
    exit 1
}

# Activate virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found. Run setup first!" -ForegroundColor Red
    exit 1
}

# Set Flask app
$env:FLASK_APP = "api"

# Drop database
Write-Host "Dropping existing database..." -ForegroundColor Yellow
flask --app api drop_db

# Initialize database
Write-Host "Creating new database..." -ForegroundColor Yellow
flask --app api init_db

# Add sample users
Write-Host "Adding sample users..." -ForegroundColor Yellow
flask --app api add_users

Write-Host ""
Write-Host "Database reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Sample accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@example.com   / 123456" -ForegroundColor White
Write-Host "  Teacher: teacher@example.com / 123456" -ForegroundColor White
Write-Host "  Student: student@example.com / 123456" -ForegroundColor White
Write-Host ""
Write-Host "Start the server with: flask --app api run" -ForegroundColor Cyan
