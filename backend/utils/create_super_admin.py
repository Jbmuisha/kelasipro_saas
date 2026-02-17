import bcrypt
from db import get_connection
import os

def create_super_admin():
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE role='SUPER_ADMIN'")
        admin = cursor.fetchone()

        if admin:
            print("Super Admin already exists.")
            return

        password = os.getenv("SUPER_ADMIN_PASSWORD")
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (os.getenv("SUPER_ADMIN_NAME"), os.getenv("SUPER_ADMIN_EMAIL"), hashed_password, "SUPER_ADMIN")
        )
        conn.commit()
        print("Super Admin created!")
