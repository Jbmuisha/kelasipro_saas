#!/usr/bin/env python3
"""
Ensure school_users exists and backfill it from users table.

Usage:
  python3 backend/utils/backfill_school_users.py [--add-fk]

This script will create school_users if missing and then insert rows for users with non-null school_id.
"""
import argparse
from db import get_connection


def ensure_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS school_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            user_id INT NOT NULL,
            role VARCHAR(50) NOT NULL,
            created_by INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_school_user (school_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)


def backfill(cursor):
    cursor.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id IS NOT NULL")
    cnt = cursor.fetchone().get('cnt', 0)
    if cnt == 0:
        print('No users with school_id found to backfill')
        return 0

    cursor.execute("INSERT IGNORE INTO school_users (school_id, user_id, role, created_by, created_at) SELECT school_id, id, role, created_by, NOW() FROM users WHERE school_id IS NOT NULL")
    return cursor.rowcount


def add_foreign_keys(cursor):
    try:
        cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE")
        cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE")
        cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL")
        print('Foreign keys added')
    except Exception as e:
        print('Could not add foreign keys:', e)


def main():
    parser = argparse.ArgumentParser(description='Create/backfill school_users table')
    parser.add_argument('--add-fk', action='store_true', help='Add foreign keys')
    args = parser.parse_args()

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            ensure_table(cursor)
            conn.commit()
            inserted = backfill(cursor)
            conn.commit()
            print(f'Backfilled {inserted} rows into school_users')
            if args.add_fk:
                add_foreign_keys(cursor)
                conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()
