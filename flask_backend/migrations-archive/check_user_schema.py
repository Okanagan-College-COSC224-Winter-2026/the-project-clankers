#!/usr/bin/env python
"""
Check User table schema details
"""
import sqlite3

db_path = 'instance/app.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA table_info(User)")
    columns = cursor.fetchall()

    print("User table columns:")
    for col in columns:
        col_id, name, type_, notnull, dflt_value, pk = col
        print(f"  {name}: {type_} (nullable={notnull==0}, default={dflt_value}, PK={pk})")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
