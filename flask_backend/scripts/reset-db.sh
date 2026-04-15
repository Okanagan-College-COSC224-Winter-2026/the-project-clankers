#!/bin/bash
# Quick database reset script for development
# Usage: ./reset-db.sh (from flask_backend directory)

set -e

echo "🗄️  Resetting database..."

# Check if we're in the right directory
if [ ! -d "api" ]; then
    echo "❌ Error: Please run this script from the flask_backend directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -f ".venv/bin/python" ]; then
    echo "❌ Virtual environment not found. Run setup.sh first!"
    exit 1
fi

# Get the full path to the Python executable in the venv
PYTHON_PATH=".venv/bin/python"

# Set Flask app
export FLASK_APP=api

# Drop existing database if it exists
if [ -f "instance/app.sqlite" ]; then
    echo "🗑️  Dropping existing database..."
    rm -f instance/app.sqlite
    echo "✅ Database dropped"
else
    echo "No existing database found"
fi

# Initialize database
echo "🔨 Creating new database..."
$PYTHON_PATH -m flask init_db

# Add sample users
echo "👥 Adding sample users..."
$PYTHON_PATH -m flask add_users

echo ""
echo "✅ Database reset complete!"
echo ""
echo "Sample accounts:"
echo "  Admin:   admin@example.com   / 123456"
echo "  Teacher: teacher@example.com / 123456"
echo "  Student: student@example.com / 123456"
echo ""
echo "Start the server with: flask --app api run"
