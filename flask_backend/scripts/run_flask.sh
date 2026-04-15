#!/bin/bash

source venv/bin/activate  # Activate the virtual environment

# Set environment variables
export FLASK_APP=api  # Replace 'app.py' with the name of your main Flask file
export FLASK_ENV=development  # Optional: Enables debug mode for development

# Run the Flask application
flask run
