#!/usr/bin/env python
"""
Check Review table structure
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA table_info(Review)")
    columns = cursor.fetchall()

    print("Review table columns:")
    for col in columns:
        print(f"  {col[1]}: {col[2]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
