#!/usr/bin/env python3
"""
Simple migration script to add `created_by` column to `users` table.
Usage:
  python backend/utils/add_created_by.py [--backfill-id ID] [--add-fk]

Options:
  --backfill-id ID   If provided, update users with NULL created_by to this ID.
  --add-fk           Add a foreign key constraint fk_created_by -> users(id) (best-effort).

This script uses the same DB connection settings as the app (backend/db.py).
"""

import argparse
from db import get_connection


def main():
    parser = argparse.ArgumentParser(description="Add created_by column to users table")
    parser.add_argument("--backfill-id", type=int, help="Backfill created_by for existing rows where NULL")
    parser.add_argument("--add-fk", action="store_true", help="Add foreign key constraint fk_created_by")
    args = parser.parse_args()

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM users LIKE 'created_by'")
            if cursor.fetchone():
                print("created_by column already exists on users table")
            else:
                print("Adding created_by column to users table...")
                cursor.execute("ALTER TABLE users ADD COLUMN created_by INT NULL")
                conn.commit()
                print("created_by column added")

            if args.backfill_id is not None:
                print(f"Backfilling created_by with {args.backfill_id} for rows where created_by IS NULL...")
                cursor.execute("UPDATE users SET created_by=%s WHERE created_by IS NULL", (args.backfill_id,))
                conn.commit()
                print(f"Backfilled rows: {cursor.rowcount}")

            if args.add_fk:
                print("Adding foreign key constraint fk_created_by -> users(id) (if possible)...")
                try:
                    # Try to add constraint - ignore errors if it already exists
                    cursor.execute("ALTER TABLE users ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL")
                    conn.commit()
                    print("Foreign key constraint added")
                except Exception as e:
                    print("Could not add foreign key constraint (it may already exist or there may be conflicting data):")
                    print(str(e))

    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == '__main__':
    main()
