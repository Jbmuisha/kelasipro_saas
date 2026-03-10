# backend/models.py
from db import get_connection
import bcrypt
from datetime import datetime

class User:
    def __init__(self, id, name, email, role, created_at=None,
                 school_id=None, status=None, profile_image=None, class_id=None, unique_id=None):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.created_at = created_at
        self.school_id = school_id
        self.status = status
        self.profile_image = profile_image
        self.class_id = class_id
        self.unique_id = unique_id
        self.children = [] # For parents
        self.parents = [] # For students

    @classmethod
    def from_dict(cls, data):
        """Create User instance from database row"""
        user = cls(
            id=data['id'],
            name=data['name'],
            email=data.get('email'),
            role=data['role'],
            created_at=data.get('created_at'),
            school_id=data.get('school_id'),
            status=data.get('status'),
            profile_image=data.get('profile_image'),
            class_id=data.get('class_id'),
            unique_id=data.get('unique_id')
        )
        if 'children' in data:
            user.children = data['children']
        if 'parents' in data:
            user.parents = data['parents']
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
            'class_id': self.class_id,
            'unique_id': self.unique_id,
            'status': self.status,
            'profile_image': self.profile_image,
            'password': self.password.decode() if hasattr(self, 'password') and isinstance(self.password, bytes) else (self.password if hasattr(self, 'password') else None),
            'children': self.children,
            'parents': self.parents
        }

    @classmethod
    def get_all(cls, include_super_admin=True, school_id=None):
        """Get all users from database"""
        conn = get_connection()
        with conn.cursor() as cursor:
            query = "SELECT id, name, email, role, created_at, school_id, class_id, password, status, profile_image, unique_id FROM users WHERE 1=1"
            params = []
            if not include_super_admin:
                query += " AND role != 'SUPER_ADMIN'"
            if school_id:
                query += " AND school_id = %s"
                params.append(school_id)
            query += " ORDER BY created_at DESC"
            cursor.execute(query, tuple(params))
            users_data = cursor.fetchall()
            
            # Fetch relations
            cursor.execute("SELECT parent_id, student_id FROM parent_student")
            relations = cursor.fetchall()
            
            students_map = {u['id']: u for u in users_data if u['role'] == 'STUDENT'}
            
            for u in users_data:
                if u['role'] == 'PARENT':
                    u['children'] = []
                    for r in relations:
                        if r['parent_id'] == u['id'] and r['student_id'] in students_map:
                            u['children'].append({
                                'id': students_map[r['student_id']]['id'],
                                'name': students_map[r['student_id']]['name']
                            })
                            
        return [cls.from_dict(u) for u in users_data]

    @classmethod
    def get_by_id(cls, user_id):
        """Get a single user by ID"""
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role, created_at, school_id, class_id, password, status, profile_image, unique_id
                FROM users
                WHERE id = %s
            """, (user_id,))
            data = cursor.fetchone()
            
            if data:
                if data['role'] == 'PARENT':
                    cursor.execute("""
                        SELECT u.id, u.name, u.email, u.class_id 
                        FROM users u
                        JOIN parent_student ps ON u.id = ps.student_id
                        WHERE ps.parent_id = %s
                    """, (user_id,))
                    data['children'] = cursor.fetchall()
                elif data['role'] == 'STUDENT':
                    cursor.execute("""
                        SELECT u.id, u.name, u.email 
                        FROM users u
                        JOIN parent_student ps ON u.id = ps.parent_id
                        WHERE ps.student_id = %s
                    """, (user_id,))
                    data['parents'] = cursor.fetchall()

        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email=None, password=None, role="USER", school_id=None, class_id=None):
        """Create a new user"""
        import random
        
        # Convert empty string to None
        if not email:
            email = None
            
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if email already exists
            if email:
                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                if cursor.fetchone():
                    raise ValueError("User with this email already exists")

            # Hash password
            if not password:
                password = "default123"
            hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

            # Generate unique_id for non-admin roles
            unique_id = None
            if role in ["STUDENT", "PARENT", "SECRETARY", "TEACHER", "ASSISTANT"]:
                while True:
                    # 3 digits
                    unique_id = f"2026{str(random.randint(0, 999)).zfill(3)}"
                    cursor.execute("SELECT id FROM users WHERE unique_id=%s", (unique_id,))
                    if not cursor.fetchone():
                        break

            cursor.execute(
                "INSERT INTO users (name, email, password, role, school_id, class_id, unique_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (name, email, hashed_password, role, school_id, class_id, unique_id)
            )
            conn.commit()
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, role=None, school_id=None, password=None, profile_image=None, class_id=None, children_ids=None):
        """Update an existing user"""
        conn = get_connection()
        with conn.cursor() as cursor:
            fields = []
            values = []

            if name:
                fields.append("name=%s")
                values.append(name)
            if email is not None:
                if email == "":
                    email = None
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
            if class_id is not None:
                fields.append("class_id=%s")
                values.append(class_id)

            if fields:
                values.append(self.id)
                query = "UPDATE users SET " + ", ".join(fields) + " WHERE id=%s"
                cursor.execute(query, values)
            
            # Handle children associations for parents
            if self.role == 'PARENT' and children_ids is not None:
                cursor.execute("DELETE FROM parent_student WHERE parent_id=%s", (self.id,))
                for child_id in children_ids:
                    cursor.execute("INSERT INTO parent_student (parent_id, student_id) VALUES (%s, %s)", (self.id, child_id))
            
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


class ClassModel:
    def __init__(self, id, school_id, name, created_at=None):
        self.id = id
        self.school_id = school_id
        self.name = name
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            school_id=data['school_id'],
            name=data['name'],
            created_at=data.get('created_at')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def get_by_school(cls, school_id):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM classes WHERE school_id=%s ORDER BY name ASC", (school_id,))
            data = cursor.fetchall()
        return [cls.from_dict(d) for d in data]

    @classmethod
    def create(cls, school_id, name):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO classes (school_id, name) VALUES (%s, %s)", (school_id, name))
            conn.commit()
            class_id = cursor.lastrowid
            cursor.execute("SELECT * FROM classes WHERE id=%s", (class_id,))
            return cls.from_dict(cursor.fetchone())

class School:
    def __init__(self, id, name, email=None, phone=None, password=None, created_at=None):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.password = password
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            password=data.get('password'),
            created_at=data.get('created_at')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'password': self.password.decode() if isinstance(self.password, bytes) else self.password,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def get_all(cls):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, password, created_at FROM schools ORDER BY created_at DESC")
            data = cursor.fetchall()
        return [cls.from_dict(d) for d in data]

    @classmethod
    def get_by_id(cls, school_id):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, password, created_at FROM schools WHERE id=%s", (school_id,))
            data = cursor.fetchone()
        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email=None, phone=None, password=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            # Hash password if provided
            hashed_password = None
            if password:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            
            cursor.execute("INSERT INTO schools (name, email, phone, password) VALUES (%s, %s, %s, %s)", 
                          (name, email, phone, hashed_password))
            conn.commit()
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, phone=None, password=None):
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
            if password is not None:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
                fields.append("password=%s")
                values.append(hashed_password)
            if fields:
                values.append(self.id)
                query = "UPDATE schools SET " + ", ".join(fields) + " WHERE id=%s"
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