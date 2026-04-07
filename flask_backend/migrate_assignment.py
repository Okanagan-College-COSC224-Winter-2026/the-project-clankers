"""Database migration: Add attachment fields to Assignment table"""
from api import create_app
from api.models import db

app = create_app()

with app.app_context():
    # Add the missing columns to the Assignment table
    with db.engine.connect() as conn:
        try:
            # Check if columns exist first
            result = conn.execute(db.text("PRAGMA table_info(Assignment)"))
            columns = [row[1] for row in result]
            
            if 'attachment_filename' not in columns:
                print("Adding attachment_filename column...")
                conn.execute(db.text("ALTER TABLE Assignment ADD COLUMN attachment_filename VARCHAR(255)"))
                conn.commit()
                print("[OK] attachment_filename column added")
            else:
                print("[OK] attachment_filename column already exists")

            if 'attachment_path' not in columns:
                print("Adding attachment_path column...")
                conn.execute(db.text("ALTER TABLE Assignment ADD COLUMN attachment_path VARCHAR(500)"))
                conn.commit()
                print("[OK] attachment_path column added")
            else:
                print("[OK] attachment_path column already exists")
                
            print("\nMigration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            conn.rollback()
