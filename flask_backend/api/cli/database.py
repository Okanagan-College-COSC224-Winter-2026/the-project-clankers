import os

import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash

from ..models import User, Course, Assignment
from ..models.db import db


@click.command("init_db")
@with_appcontext
def init_db_command():
    """Initialize the database"""
    db.create_all()
    click.echo("Database is created")


@click.command("drop_db")
@with_appcontext
def drop_db_command():
    """Drop all database tables"""
    if click.confirm("Are you sure you want to drop all tables?"):
        db.drop_all()
        click.echo("Database tables dropped")


@click.command("add_users")
@with_appcontext
def add_users_command():
    """Add sample users to the database"""
    # Create mock users that match the User model: (name, email, hash_pass, role)
    sample_users = [
        {
            "name": "Example Student",
            "email": "student@example.com",
            "password": "123456",
            "role": "student",
        },
        {
            "name": "Example Teacher",
            "email": "teacher@example.com",
            "password": "123456",
            "role": "teacher",
        },
        {
            "name": "Example Admin",
            "email": "admin@example.com",
            "password": "123456",
            "role": "admin",
        },
    ]

    for u in sample_users:
        # check existence by email
        if not User.get_by_email(u["email"]):
            hashed = generate_password_hash(u["password"], method="pbkdf2:sha256")
            user = User(name=u["name"], email=u["email"], hash_pass=hashed, role=u["role"])
            User.create_user(user)
            click.echo(f"User '{user.email}' created (role={user.role})")
        else:
            click.echo(f"User '{u['email']}' already exists")


@click.command("create_admin")
@with_appcontext
def create_admin_command():
    """Create an admin user"""
    name = click.prompt("Admin name")
    email = click.prompt("Admin email")
    password = click.prompt("Password", hide_input=True, confirmation_prompt=True)

    # Check if user already exists
    if User.get_by_email(email):
        click.echo(f"Error: User with email '{email}' already exists", err=True)
        return

    # Create admin user
    hashed = generate_password_hash(password, method="pbkdf2:sha256")
    admin = User(name=name, email=email, hash_pass=hashed, role="admin")
    User.create_user(admin)
    click.echo(f"Admin user '{email}' created successfully")


@click.command("ensure_admin")
@with_appcontext
def ensure_admin_command():
    """Ensure a default admin exists using environment variables.

    Requires DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD.
    Safe to run repeatedly; updates role/password if the user already exists.
    """

    name = os.environ.get("DEFAULT_ADMIN_NAME")
    email = os.environ.get("DEFAULT_ADMIN_EMAIL")
    password = os.environ.get("DEFAULT_ADMIN_PASSWORD")

    if not all([name, email, password]):
        click.echo(
            "DEFAULT_ADMIN_* environment variables not fully set; skipping admin bootstrap"
        )
        return

    assert name is not None
    assert email is not None
    assert password is not None

    existing_user = User.get_by_email(email)
    hashed = generate_password_hash(password, method="pbkdf2:sha256")

    if existing_user:
        if existing_user.role != "admin" or existing_user.hash_pass != hashed:
            existing_user.role = "admin"
            existing_user.hash_pass = hashed
            existing_user.update()
            click.echo(f"Updated existing user '{email}' to admin role")
        else:
            click.echo(f"Admin user '{email}' already exists; no changes made")
        return

    admin = User(name=name, email=email, hash_pass=hashed, role="admin")
    User.create_user(admin)
    click.echo(f"Admin user '{email}' created successfully")


@click.command("add_sample_courses")
@with_appcontext
def add_sample_courses_command():
    """Add sample courses and assignments to the database"""
    # Get the teacher user (or create one if it doesn't exist)
    teacher = User.get_by_email("teacher@example.com")
    if not teacher:
        click.echo("Error: Teacher user 'teacher@example.com' not found. Run 'flask add_users' first.", err=True)
        return

    # Define sample courses
    sample_courses = [
        {"name": "COSC 404 Advanced Database Management Systems"},
        {"name": "COSC 470 Software Engineering"},
        {"name": "COSC 360 Server Platform As A Service"},
    ]

    for course_data in sample_courses:
        # Check if course already exists
        existing_course = Course.get_by_name_teacher(course_data["name"], teacher.id)
        if existing_course:
            click.echo(f"Course '{course_data['name']}' already exists")
            continue

        # Create course
        course = Course(teacherID=teacher.id, name=course_data["name"])
        Course.create_course(course)
        click.echo(f"Course '{course.name}' created (id={course.id})")

        # Add an example assignment to the course
        assignment = Assignment(
            courseID=course.id,
            name="Example Assignment",
            rubric_text="Example rubric",
            # due_date=None
            # due_date is currently not in the Assignment table
        )
        Assignment.create(assignment)
        click.echo(f"  - Assignment 'Example Assignment' added to '{course.name}'")

    click.echo("Sample courses and assignments created successfully")


def init_app(app):
    """Register CLI commands with the Flask app"""
    app.cli.add_command(init_db_command)
    app.cli.add_command(drop_db_command)
    app.cli.add_command(add_users_command)
    app.cli.add_command(create_admin_command)
    app.cli.add_command(ensure_admin_command)
    app.cli.add_command(add_sample_courses_command)
