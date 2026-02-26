# backend/models.py
from db import get_connection
import bcrypt
from datetime import datetime

class User:
    def __init__(self, id, name, email, role, created_at=None,
                 school_id=None, status=None, profile_image=None):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.created_at = created_at
        self.school_id = school_id
        self.status = status
        self.profile_image = profile_image

    @classmethod
    def from_dict(cls, data):
        """Create User instance from database row"""
        user = cls(
            id=data['id'],
            name=data['name'],
            email=data['email'],
            role=data['role'],
            created_at=data.get('created_at'),
            school_id=data.get('school_id'),
            status=data.get('status'),
            profile_image=data.get('profile_image')
        )
        # Add password attribute if it exists
        if 'password' in data:
            user.password = data['password']
        return user

    def to_dict(self):
        """Convert User instance to dictionary for API response"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'school_id': self.school_id,
            'status': self.status,
            'profile_image': self.profile_image,
            'password': self.password.decode() if hasattr(self, 'password') and isinstance(self.password, bytes) else (self.password if hasattr(self, 'password') else None)
        }

    @classmethod
    def get_all(cls, include_super_admin=True):
        """Get all users from database"""
        conn = get_connection()
        with conn.cursor() as cursor:
            if include_super_admin:
                cursor.execute("""
                    SELECT id, name, email, role, created_at, school_id, password, status, profile_image
                    FROM users
                    ORDER BY created_at DESC
                """)
            else:
                cursor.execute("""
                    SELECT id, name, email, role, created_at, school_id, password, status, profile_image
                    FROM users
                    WHERE role != 'SUPER_ADMIN'
                    ORDER BY created_at DESC
                """)
            users_data = cursor.fetchall()
        return [cls.from_dict(u) for u in users_data]

    @classmethod
    def get_by_id(cls, user_id):
        """Get a single user by ID"""
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role, created_at, school_id, password, status, profile_image
                FROM users
                WHERE id = %s
            """, (user_id,))
            data = cursor.fetchone()
        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email, password=None, role="USER", school_id=None):
        """Create a new user"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if email already exists
            cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
            if cursor.fetchone():
                raise ValueError("User with this email already exists")

            # Hash password
            if not password:
                password = "default123"
            hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

            cursor.execute(
                "INSERT INTO users (name, email, password, role, school_id) VALUES (%s, %s, %s, %s, %s)",
                (name, email, hashed_password, role, school_id)
            )
            conn.commit()
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, role=None, school_id=None, password=None, profile_image=None):
        """Update an existing user"""
        conn = get_connection()
        with conn.cursor() as cursor:
            fields = []
            values = []

            if name:
                fields.append("name=%s")
                values.append(name)
            if email:
                fields.append("email=%s")
                values.append(email)
            if role:
                fields.append("role=%s")
                values.append(role)
            if school_id is not None:
                fields.append("school_id=%s")
                values.append(school_id)
            if password:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
                fields.append("password=%s")
                values.append(hashed_password)
            if profile_image is not None:
                fields.append("profile_image=%s")
                values.append(profile_image)

            if not fields:
                return False  # nothing to update

            values.append(self.id)
            query = f"UPDATE users SET {', '.join(fields)} WHERE id=%s"
            cursor.execute(query, values)
            conn.commit()
            updated = self.get_by_id(self.id)
            self.__dict__.update(updated.__dict__)
            return True

    def delete(self):
        """Delete a user"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Don't allow deleting super admin
            cursor.execute("SELECT role FROM users WHERE id=%s", (self.id,))
            user = cursor.fetchone()
            if not user:
                return False
            if user['role'] == "SUPER_ADMIN":
                raise ValueError("Cannot delete SUPER_ADMIN")
            cursor.execute("DELETE FROM users WHERE id=%s", (self.id,))
            conn.commit()
            return True


class School:
    def __init__(self, id, name, email=None, phone=None, created_at=None):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            created_at=data.get('created_at')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def get_all(cls):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, created_at FROM schools ORDER BY created_at DESC")
            data = cursor.fetchall()
        return [cls.from_dict(d) for d in data]

    @classmethod
    def get_by_id(cls, school_id):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, created_at FROM schools WHERE id=%s", (school_id,))
            data = cursor.fetchone()
        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email=None, phone=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO schools (name, email, phone) VALUES (%s, %s, %s)", (name, email, phone))
            conn.commit()
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, phone=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            fields = []
            values = []
            if name:
                fields.append("name=%s")
                values.append(name)
            if email is not None:
                fields.append("email=%s")
                values.append(email)
            if phone is not None:
                fields.append("phone=%s")
                values.append(phone)
            if fields:
                values.append(self.id)
                query = f"UPDATE schools SET {', '.join(fields)} WHERE id=%s"
                cursor.execute(query, values)
                conn.commit()
                updated = self.get_by_id(self.id)
                self.__dict__.update(updated.__dict__)
            return True

    def delete(self):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM schools WHERE id=%s", (self.id,))
            conn.commit()
            return True