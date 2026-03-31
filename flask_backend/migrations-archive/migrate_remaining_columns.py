#!/usr/bin/env python
"""
Migration script to add remaining missing columns (revised)
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    added = []

    # Criterion table
    cursor.execute("PRAGMA table_info(Criterion)")
    criterion_cols = {col[1] for col in cursor.fetchall()}

    if 'name' not in criterion_cols:
        print("Adding Criterion.name column")
        cursor.execute("ALTER TABLE Criterion ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Criterion'")
        added.append('Criterion.name')

    if 'points' not in criterion_cols:
        print("Adding Criterion.points column")
        cursor.execute("ALTER TABLE Criterion ADD COLUMN points INTEGER DEFAULT 1 NOT NULL")
        added.append('Criterion.points')

    # CourseGroup table
    cursor.execute("PRAGMA table_info(CourseGroup)")
    course_group_cols = {col[1] for col in cursor.fetchall()}

    if 'courseID' not in course_group_cols:
        print("Adding CourseGroup.courseID column")
        cursor.execute("ALTER TABLE CourseGroup ADD COLUMN courseID INTEGER NOT NULL DEFAULT 1")
        added.append('CourseGroup.courseID')

    # Note: User_Courses and Group_Members use composite keys
    # SQLite auto-creates rowid for these, so we'll skip adding explicit id columns

    if added:
        conn.commit()
        print(f"Successfully added {len(added)} columns: {', '.join(added)}")
    else:
        print("All critical columns already exist")

    print("\nNote: User_Courses and Group_Members use implicit rowid from SQLite")

except sqlite3.OperationalError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()
