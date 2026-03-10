import pymysql
from dotenv import load_dotenv
import os

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
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN unique_id VARCHAR(50) UNIQUE NULL")
    except Exception as e:
        print("unique_id error:", e)
        
    try:
        cursor.execute("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL")
    except Exception as e:
        print("email modify error:", e)
        
    try:
        # Check if email is unique and remove it if it causes issues with multiple nulls?
        # In MySQL, multiple NULLs are allowed in UNIQUE index.
        pass
    except Exception as e:
        pass
        
    conn.commit()
    print("Database updated for unique_id successfully.")
