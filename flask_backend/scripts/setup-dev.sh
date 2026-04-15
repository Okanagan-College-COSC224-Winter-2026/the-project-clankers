#!/bin/bash
# Setup script for pre-commit hooks

set -e

echo "🔧 Setting up development environment..."

# Check if we're in the right directory
if [ ! -f "flask_backend/requirements-dev.txt" ]; then
    echo "❌ Error: Please run this script from the project root"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "flask_backend/venv" ]; then
    echo "✅ Activating virtual environment..."
    source flask_backend/venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Creating one..."
    cd flask_backend
    python3 -m venv venv
    source venv/bin/activate
    cd ..
fi

# Install/update dev dependencies
echo "📦 Installing development dependencies..."
cd flask_backend
pip install --upgrade pip
pip install -e .
pip install -r requirements-dev.txt
cd ..

# Install pre-commit hooks
echo "🪝 Installing pre-commit hooks..."
pre-commit install

# Run pre-commit on all files (optional first-time setup)
echo "🧹 Running pre-commit on all files (this may take a moment)..."
pre-commit run --all-files || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Pre-commit hooks are now installed. They will run automatically on git commit."
echo ""
echo "Useful commands:"
echo "  pre-commit run --all-files  # Run on all files manually"
echo "  pre-commit run <hook_id>    # Run specific hook"
echo "  git commit --no-verify       # Skip hooks for one commit (not recommended)"
echo ""
