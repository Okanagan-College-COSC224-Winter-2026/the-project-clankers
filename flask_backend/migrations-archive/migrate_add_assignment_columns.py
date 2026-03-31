#!/usr/bin/env python
"""
Migration script to add missing columns to Assignment table
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check existing columns
    cursor.execute("PRAGMA table_info(Assignment)")
    columns = {col[1]: col[2] for col in cursor.fetchall()}

    print("Current Assignment columns:")
    for col in sorted(columns.keys()):
        print(f"  {col}")

    # Define missing columns with their SQL definitions
    missing_columns = {
        'submission_type': "VARCHAR(20) DEFAULT 'individual' NOT NULL",
        'internal_review': "BOOLEAN DEFAULT 0 NOT NULL",
        'external_review': "BOOLEAN DEFAULT 0 NOT NULL",
        'anonymous_review': "BOOLEAN DEFAULT 0 NOT NULL",
        'attachment_filename': "VARCHAR(255)",
        'attachment_path': "VARCHAR(500)"
    }

    # Add missing columns
    added = []
    for col_name, col_def in missing_columns.items():
        if col_name not in columns:
            print(f"Adding column: {col_name}")
            cursor.execute(f"ALTER TABLE Assignment ADD COLUMN {col_name} {col_def}")
            added.append(col_name)

    if added:
        conn.commit()
        print(f"Successfully added {len(added)} columns: {', '.join(added)}")
    else:
        print("All columns already exist")

except sqlite3.OperationalError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()
