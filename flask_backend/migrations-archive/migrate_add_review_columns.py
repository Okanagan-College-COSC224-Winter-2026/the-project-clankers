#!/usr/bin/env python
"""
Migration script to add reviewee_type and reviewer_type columns to Review table
"""
import sqlite3

# Connect to the database
db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if the columns already exist
    cursor.execute("PRAGMA table_info(Review)")
    columns = [column[1] for column in cursor.fetchall()]

    missing_columns = []
    if 'reviewee_type' not in columns:
        missing_columns.append('reviewee_type')
    if 'reviewer_type' not in columns:
        missing_columns.append('reviewer_type')

    if not missing_columns:
        print("Both columns already exist in Review table")
    else:
        print(f"Adding missing columns: {', '.join(missing_columns)}")
        for col in missing_columns:
            cursor.execute(f"ALTER TABLE Review ADD COLUMN {col} VARCHAR(10) DEFAULT 'user' NOT NULL")
        conn.commit()
        print("Successfully added missing columns")

except sqlite3.OperationalError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()
