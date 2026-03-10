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
    # Create classes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
    """)
    
    # Check if class_id column exists
    cursor.execute("SHOW COLUMNS FROM users LIKE 'class_id'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE users ADD COLUMN class_id INT NULL")
        cursor.execute("ALTER TABLE users ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL")

    # Create parent_student table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parent_student (
        parent_id INT NOT NULL,
        student_id INT NOT NULL,
        PRIMARY KEY (parent_id, student_id),
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    print("Database updated for classes and parent-student relationship successfully.")
