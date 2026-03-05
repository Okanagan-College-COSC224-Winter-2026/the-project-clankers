#!/bin/bash
# Quick database reset script for development
# Usage: ./reset-db.sh

set -e

echo "🗄️  Resetting database..."

# Check if we're in the right directory
if [ ! -d "api" ]; then
    echo "❌ Error: Please run this script from the flask_backend directory"
    exit 1
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    echo "✅ Activating virtual environment..."
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run setup first!"
    exit 1
fi

# Set Flask app
export FLASK_APP=api

# Drop database
echo "🗑️  Dropping existing database..."
flask --app api drop_db

# Initialize database
echo "🔨 Creating new database..."
flask --app api init_db

# Add sample users
echo "👥 Adding sample users..."
flask --app api add_users

echo ""
echo "✅ Database reset complete!"
echo ""
echo "Sample accounts:"
echo "  Admin:   admin@example.com   / 123456"
echo "  Teacher: teacher@example.com / 123456"
echo "  Student: student@example.com / 123456"
echo ""
echo "Start the server with: flask --app api run"
