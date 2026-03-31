#!/usr/bin/env python
"""
Migration script to add is_archived column to Course table
"""
import sqlite3

# Connect to the database
db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if the column already exists
    cursor.execute("PRAGMA table_info(Course)")
    columns = [column[1] for column in cursor.fetchall()]

    if 'is_archived' in columns:
        print("Column 'is_archived' already exists in Course table")
    else:
        print("Adding 'is_archived' column to Course table...")
        cursor.execute("ALTER TABLE Course ADD COLUMN is_archived BOOLEAN DEFAULT 0 NOT NULL")
        conn.commit()
        print("Successfully added 'is_archived' column")

except sqlite3.OperationalError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()

