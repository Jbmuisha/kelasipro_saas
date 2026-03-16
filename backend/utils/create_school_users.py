#!/usr/bin/env python3
"""
Migration script to create `school_users` table and backfill from users.
Usage:
  python backend/utils/create_school_users.py [--add-fk] [--no-backfill]

What it does:
- Creates table school_users (id, school_id, user_id, role, created_by, created_at)
- Backfills existing users into school_users (unless --no-backfill)
- Optionally adds foreign key constraints
"""
import argparse
from datetime import datetime
from db import get_connection


def main():
    parser = argparse.ArgumentParser(description="Create school_users table and backfill")
    parser.add_argument('--add-fk', action='store_true', help='Add foreign key constraints')
    parser.add_argument('--no-backfill', action='store_true', help="Don't backfill existing users")
    args = parser.parse_args()

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Create table if not exists
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
            conn.commit()
            print('Ensured school_users table exists')

            if not args.no_backfill:
                # Backfill from users table where school_id is set
                cursor.execute("SELECT id, school_id, role, created_by FROM users WHERE school_id IS NOT NULL")
                rows = cursor.fetchall()
                inserted = 0
                for r in rows:
                    try:
                        cursor.execute("INSERT IGNORE INTO school_users (school_id, user_id, role, created_by, created_at) VALUES (%s, %s, %s, %s, NOW())",
                                       (r['school_id'], r['id'], r['role'], r.get('created_by')))
                        inserted += cursor.rowcount
                    except Exception as e:
                        print('Could not insert', r, e)
                conn.commit()
                print(f'Backfilled {inserted} rows into school_users')

            if args.add_fk:
                try:
                    cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE")
                    cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
                    cursor.execute("ALTER TABLE school_users ADD CONSTRAINT fk_su_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL")
                    conn.commit()
                    print('Added foreign key constraints to school_users')
                except Exception as e:
                    print('Could not add foreign keys:', e)

    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()
