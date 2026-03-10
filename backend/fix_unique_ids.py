import pymysql
from dotenv import load_dotenv
import os
import random

load_dotenv()

def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),  
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "kelasipro_db"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

conn = get_connection()
with conn.cursor() as cursor:
    cursor.execute("SELECT id, role FROM users WHERE unique_id IS NULL AND role NOT IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')")
    users = cursor.fetchall()
    
    for u in users:
        while True:
            unique_id = f"2026{str(random.randint(0, 999)).zfill(3)}"
            cursor.execute("SELECT id FROM users WHERE unique_id=%s", (unique_id,))
            if not cursor.fetchone():
                break
        cursor.execute("UPDATE users SET unique_id=%s WHERE id=%s", (unique_id, u['id']))
    conn.commit()
    print(f"Updated {len(users)} users with unique_id")
