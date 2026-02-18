import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'kelasipro_db'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    print('Database connection successful')
    
    with conn.cursor() as cursor:
        cursor.execute('SHOW TABLES')
        tables = cursor.fetchall()
        print('Tables:', [table for table in tables])
        
        # Check if users table exists
        cursor.execute('DESCRIBE users')
        columns = cursor.fetchall()
        print('Users table columns:', [col['Field'] for col in columns])
        
    conn.close()
    print('Database check completed successfully')
except Exception as e:
    print('Database error:', str(e))