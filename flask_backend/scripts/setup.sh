#!/bin/bash
# Full backend setup script - creates venv, installs dependencies, and sets up database
# Usage: ./flask_backend/setup.sh (from root) or ./setup.sh (from flask_backend)

set -e

echo "🚀 Setting up Flask backend..."

# Check if we're in the flask_backend directory or need to cd into it
if [ -d "api" ]; then
    # Already in flask_backend directory
    echo "Running from flask_backend directory"
elif [ -d "flask_backend/api" ]; then
    # In root directory, need to cd into flask_backend
    echo "Changing to flask_backend directory..."
    cd flask_backend
else
    echo "❌ Error: Cannot find flask_backend directory. Please run from project root or flask_backend folder."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Get the full path to the Python executable in the venv
PYTHON_PATH=".venv/bin/python"
PIP_PATH=".venv/bin/pip"

# Install package in editable mode
echo "📦 Installing package dependencies..."
$PIP_PATH install -e . --quiet

# Install dev requirements
echo "📦 Installing dev dependencies..."
$PIP_PATH install -r requirements-dev.txt --quiet

# Set Flask app environment variable
export FLASK_APP=api

# Initialize database only if it doesn't exist
if [ ! -f "instance/app.sqlite" ]; then
    echo "🗄️  Database not found - initializing..."
    $PYTHON_PATH -m flask init_db
    
    # Add sample users
    echo "👥 Adding sample users..."
    $PYTHON_PATH -m flask add_users
    echo "✅ Database initialized"
else
    echo "✅ Database already exists - skipping initialization"
    echo "💡 To reset the database, run: ./reset-db.sh"
fi

echo ""
echo "========================================"
echo "✅ Backend setup complete!"
echo "========================================"
echo ""
echo "Sample accounts:"
echo "  Admin:   admin@example.com   / 123456"
echo "  Teacher: teacher@example.com / 123456"
echo "  Student: student@example.com / 123456"
echo ""
echo "Starting Flask development server..."
echo "Press Ctrl+C to stop the server"
echo ""

# Set Flask app environment variable and start the server
export FLASK_APP=api
$PYTHON_PATH -m flask run
