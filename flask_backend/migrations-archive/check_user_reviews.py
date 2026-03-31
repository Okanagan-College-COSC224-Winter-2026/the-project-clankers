#!/usr/bin/env python
"""
Check reviews for a specific user
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Get the user you're trying to delete (should be the newest student)
    cursor.execute("SELECT id, name, email FROM User WHERE role='student' ORDER BY id DESC LIMIT 1")
    user = cursor.fetchone()

    if user:
        user_id, name, email = user
        print(f"Latest student: ID={user_id}, Name={name}, Email={email}")

        # Check if this user has any reviews
        cursor.execute("SELECT COUNT(*) FROM Review WHERE reviewerID = ? OR revieweeID = ?", (user_id, user_id))
        count = cursor.fetchone()[0]
        print(f"Reviews for this user: {count}")

        if count > 0:
            cursor.execute("SELECT id, reviewerID, revieweeID FROM Review WHERE reviewerID = ? OR revieweeID = ?", (user_id, user_id))
            reviews = cursor.fetchall()
            for review in reviews:
                print(f"  Review ID={review[0]}, Reviewer={review[1]}, Reviewee={review[2]}")
    else:
        print("No students found")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
