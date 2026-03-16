#!/usr/bin/env python3
"""
Backfill users.school_id values.

Usage:
  # Set a default school_id for all users missing school_id
  python3 backend/utils/backfill_user_school.py --default-school-id 8

  # Or provide a CSV with two columns: user_id,school_id (no header)
  python3 backend/utils/backfill_user_school.py --csv mappings.csv

The script uses backend/db.get_connection to connect to the same database as the app.
"""
import argparse
import csv
from db import get_connection


def set_default_school(default_school_id):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id IS NULL")
            missing_before = cursor.fetchone().get('cnt', 0)
            if missing_before == 0:
                print('No users with NULL school_id found.')
                return

            cursor.execute("UPDATE users SET school_id=%s WHERE school_id IS NULL", (default_school_id,))
            conn.commit()
            print(f"Updated {cursor.rowcount} users setting school_id={default_school_id}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def apply_csv_mapping(csv_path):
    conn = get_connection()
    updated = 0
    errors = 0
    try:
        with open(csv_path, newline='') as f:
            reader = csv.reader(f)
            rows = [(int(r[0].strip()), int(r[1].strip())) for r in reader if r]

        with conn.cursor() as cursor:
            for user_id, school_id in rows:
                try:
                    cursor.execute("UPDATE users SET school_id=%s WHERE id=%s", (school_id, user_id))
                    updated += cursor.rowcount
                except Exception as e:
                    print(f"Failed to update user {user_id}: {e}")
                    errors += 1
            conn.commit()
        print(f"Applied mappings: updated {updated} rows, {errors} errors")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description='Backfill users.school_id')
    parser.add_argument('--default-school-id', type=int, help='Default school_id to set for users with NULL school_id')
    parser.add_argument('--csv', type=str, help='CSV file path with lines: user_id,school_id')
    args = parser.parse_args()

    if not args.default_school_id and not args.csv:
        parser.error('You must specify --default-school-id or --csv')

    if args.default_school_id:
        set_default_school(args.default_school_id)
    if args.csv:
        apply_csv_mapping(args.csv)

if __name__ == '__main__':
    main()
