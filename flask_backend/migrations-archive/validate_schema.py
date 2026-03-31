#!/usr/bin/env python
"""
Comprehensive schema validator - checks all tables for missing columns
"""
import sqlite3
import os
import sys

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Expected columns for each table based on the models
expected_schema = {
    'User': [
        'id', 'student_id', 'name', 'email', 'hash_pass', 'role',
        'must_change_password', 'profile_picture_url'
    ],
    'Course': [
        'id', 'teacherID', 'name', 'is_archived'
    ],
    'Assignment': [
        'id', 'courseID', 'name', 'rubric', 'start_date', 'due_date',
        'submission_type', 'internal_review', 'external_review',
        'anonymous_review', 'attachment_filename', 'attachment_path'
    ],
    'Review': [
        'id', 'assignmentID', 'reviewerID', 'revieweeID',
        'reviewee_type', 'reviewer_type'
    ],
    'Criterion': [
        'id', 'reviewID', 'name', 'points'
    ],
    'User_Courses': [
        'id', 'userID', 'courseID'
    ],
    'Group_Members': [
        'id', 'userID', 'groupID'
    ],
    'CourseGroup': [
        'id', 'courseID', 'name'
    ]
}

try:
    print("=" * 60)
    print("DATABASE SCHEMA VALIDATION")
    print("=" * 60)

    all_good = True

    for table_name, expected_cols in expected_schema.items():
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_cols = {col[1] for col in cursor.fetchall()}

        missing = set(expected_cols) - existing_cols

        if missing:
            all_good = False
            print(f"\n[MISSING] Table '{table_name}':")
            for col in sorted(missing):
                print(f"  - {col}")
        else:
            print(f"\n[OK] Table '{table_name}'")

    print("\n" + "=" * 60)
    if all_good:
        print("SUCCESS: All schemas are in sync!")
    else:
        print("WARNING: Some columns are missing. Run the migration scripts.")
    print("=" * 60)

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
