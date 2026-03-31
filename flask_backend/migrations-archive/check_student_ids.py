#!/usr/bin/env python
"""
Check all student IDs in the database
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, email, student_id, role FROM User WHERE student_id IS NOT NULL ORDER BY student_id")
    results = cursor.fetchall()

    print("=" * 80)
    print("ALL STUDENT IDs IN DATABASE")
    print("=" * 80)

    if not results:
        print("No student IDs found")
    else:
        print(f"{'ID':<5} {'Name':<25} {'Email':<30} {'Student ID':<15} {'Role':<10}")
        print("-" * 80)
        for user_id, name, email, student_id, role in results:
            print(f"{user_id:<5} {name:<25} {email:<30} {student_id:<15} {role:<10}")

    # Check for duplicates
    cursor.execute("SELECT student_id, COUNT(*) as count FROM User WHERE student_id IS NOT NULL GROUP BY student_id HAVING count > 1")
    duplicates = cursor.fetchall()

    if duplicates:
        print("\n" + "=" * 80)
        print("DUPLICATE STUDENT IDs FOUND:")
        print("=" * 80)
        for student_id, count in duplicates:
            print(f"Student ID '{student_id}' appears {count} times")
    else:
        print("\n" + "=" * 80)
        print("No duplicate student IDs found")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
