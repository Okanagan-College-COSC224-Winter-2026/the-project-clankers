# Migrations Archive

This folder contains legacy database migration and validation scripts that were used during development to fix the database schema. These scripts are **no longer needed** for normal application operation but are kept here for reference and documentation.

## Scripts

### Migration Scripts (Data Fixes)
These scripts were run once to add missing columns to the database tables:

- **migrate_add_assignment_columns.py** - Added submission_type, internal_review, external_review, anonymous_review, attachment_filename, and attachment_path columns to the Assignment table
- **migrate_add_is_archived.py** - Added is_archived column to the Course table (default: 0)
- **migrate_add_review_columns.py** - Added reviewee_type and reviewer_type columns to the Review table
- **migrate_remaining_columns.py** - Added other missing columns discovered during development

### Validation/Inspection Scripts
These scripts were used to inspect and validate the database schema:

- **validate_schema.py** - Comprehensive schema validator that checks all tables for missing columns
- **check_user_schema.py** - Inspected the User table schema and column details
- **check_student_ids.py** - Listed all student IDs in the database and checked for duplicates
- **check_user_reviews.py** - Inspected reviews associated with a specific user (used for debugging user deletion)
- **check_review_table.py** - Inspected the Review table structure

## When Were These Used?

These scripts were executed during the development of US26 (Admin User Management) to fix database schema inconsistencies that were discovered when:
1. New endpoints required columns that didn't exist in the database
2. Models defined fields that weren't in the database
3. Schema validation revealed missing columns

## Can They Be Deleted?

**Yes**, these scripts can be safely deleted. The application no longer depends on them. They should only be needed if:
- Setting up a fresh database from scratch without migrations (not recommended)
- Investigating historical schema issues
- Reference for what problems existed and how they were solved

## Current Status

As of March 31, 2026, the database schema is fully synced with the application models, so these scripts should never need to be run again.
