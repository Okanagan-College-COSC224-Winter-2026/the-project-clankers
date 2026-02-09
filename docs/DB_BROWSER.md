## DB Browser & VS Code SQLTools — Inspecting the Flask SQLite DB

Purpose
- Quick, safe instructions to open, inspect, query, and export the project's SQLite database: `flask_backend/instance/app.sqlite`.

Prerequisites
- DB Browser for SQLite (GUI) installed (Homebrew cask: `brew install --cask db-browser-for-sqlite`).
- Optional: VS Code with `SQLTools` + `SQLTools SQLite/SQLite3` (for integrated querying).

Open the DB (GUI)
- Start DB Browser and open the DB: File → Open Database → `flask_backend/instance/app.sqlite`.
- Or from the terminal:
```bash
open -a "DB Browser for SQLite" flask_backend/instance/app.sqlite
```

Safe workflow
- Always make a backup copy before editing: File → Save a copy…
- Do any exploratory queries in the **Execute SQL** tab first (read-only until you commit changes).

Browse tables & data
- Database Structure tab: lists tables and indexes.
- Browse Data tab: choose a table and page through rows.
- To view the `User` table schema, right-click the table → Modify Table (shows CREATE TABLE SQL).

Run queries (examples)
- Open **Execute SQL**, paste SQL and press Play.

List teachers:
```sql
SELECT id, name, email, role FROM User WHERE role='teacher';
```

Show the CREATE statement for `User` (schema):
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='User';
```

Export results
- After a query: Export → Save as CSV file (exports the result set).
- Export a whole table: Database Structure → right-click table → Export → Table(s) as CSV file.

Edit rows safely
- Make edits in **Browse Data** then click **Write Changes** to commit.
- To cancel pending edits: click **Revert Changes** before writing.

Useful PRAGMAs
- Enable foreign keys for session queries:
```sql
PRAGMA foreign_keys = ON;
```
- Reclaim space (when appropriate):
```sql
VACUUM;
```

CLI alternatives (quick checks / exports)
- List tables:
```bash
sqlite3 -header -column flask_backend/instance/app.sqlite ".tables"
```
- Export `User` rows where `role='teacher'` to CSV:
```bash
sqlite3 -header -csv flask_backend/instance/app.sqlite "SELECT id,name,email,role FROM User WHERE role='teacher';" > teachers.csv
```

VS Code: SQLTools setup (SQLite)
1. Install `SQLTools` and `SQLTools SQLite/SQLite3` driver from Extensions.
2. Add a new connection (`SQLTools: Add new connection`) and choose `SQLite`.
3. Use the absolute path for the `database` field, for example:
```json
{
  "name": "Project SQLite",
  "driver": "SQLite",
  "database": "/Users/kedithwuensche/ClassWork/Year2Semester2/Capstone/the-project-clankers/flask_backend/instance/app.sqlite"
}
```
4. Save and run `SQLTools: Refresh` or re-open SQLTools view.

Troubleshooting SQLTools shows no tables
- Confirm the configured `database` path is the correct file (use absolute path).
- If connection uses a relative path, VS Code may resolve it to another working directory — prefer absolute paths.
- Restart the VS Code window and run `SQLTools: Refresh`.
- Verify with terminal:
```bash
sqlite3 -header -column flask_backend/instance/app.sqlite ".tables"
```

Extras
- If you want, run `flask --app api init_db` and `flask --app api add_users` in `flask_backend` to (re)create and populate the dev DB (see project README).
- To export the `User` table to CSV from DB Browser or using CLI see the Export steps above.

Contact / Next steps
- I can export `User` rows with `role='teacher'` into `flask_backend/instance/teachers.csv` and add it to the repo — tell me if you want that.
