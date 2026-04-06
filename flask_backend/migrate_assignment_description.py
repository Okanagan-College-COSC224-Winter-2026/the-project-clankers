"""Database migration: Add description field to Assignment table"""
from api import create_app
from api.models import db

app = create_app()

with app.app_context():
    # Add the description column to the Assignment table
    with db.engine.connect() as conn:
        try:
            # Check if columns exist first
            result = conn.execute(db.text("PRAGMA table_info(Assignment)"))
            columns = [row[1] for row in result]

            if 'description' not in columns:
                print("Adding description column...")
                conn.execute(db.text("ALTER TABLE Assignment ADD COLUMN description TEXT"))
                conn.commit()
                print("[OK] description column added")
            else:
                print("[OK] description column already exists")

            print("\nMigration completed successfully!")

        except Exception as e:
            print(f"Error during migration: {e}")
            conn.rollback()
