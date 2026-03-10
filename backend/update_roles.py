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
    cursor.execute("ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','STUDENT','SECRETARY','PARENT','ASSISTANT') NOT NULL;")
    conn.commit()
    print("Updated role enum successfully.")
