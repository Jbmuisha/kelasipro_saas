# backend/models.py
from db import get_connection
import bcrypt
from datetime import datetime

class User:
    def __init__(self, id, name, email, role, created_at=None,
                 school_id=None, school_type=None, status=None, profile_image=None, class_id=None, unique_id=None, created_by=None, admin_level=None):
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
        self.created_by = created_by
        self.admin_level = admin_level
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
            school_type=data.get('school_type'),
            status=data.get('status'),
            profile_image=data.get('profile_image'),
            class_id=data.get('class_id'),
            unique_id=data.get('unique_id'),
            created_by=data.get('created_by'),
            admin_level=data.get('admin_level')
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
            'parents': self.parents,
            'created_by': self.created_by if hasattr(self, 'created_by') else None,
            'admin_level': self.admin_level if hasattr(self, 'admin_level') else None,
            'school_type': self.school_type if hasattr(self, 'school_type') else None
        }

    @classmethod
    def get_all(cls, include_super_admin=True, school_id=None, requester_school_type=None, requester_id=None, requester_role=None):
        """Get all users from database. If requester is SECRETARY, limit results to students and parents they created or parents of their students.
        Filter by requester_school_type for isolation."""
        try:
            conn = get_connection()
            with conn.cursor() as cursor:
                params = []
                # Base query
                query = "SELECT id, name, email, role, created_at, school_id, class_id, password, status, profile_image, unique_id, created_by, admin_level, school_type FROM users WHERE 1=1"

                if not include_super_admin:
                    query += " AND role != 'SUPER_ADMIN'"
                if school_id:
                    query += " AND school_id = %s"
                    params.append(school_id)
                if requester_school_type:
                    query += " AND school_type = %s"
                    params.append(requester_school_type)

                # If requester is SECRETARY, restrict
                if requester_role in ('SECRETARY', 'SCHOOL_ADMIN') and requester_id:
                    # Ensure created_by column exists
                    cursor.execute("SHOW COLUMNS FROM users LIKE 'created_by'")
                    if not cursor.fetchone():
                        print("[ERROR] get_all: 'created_by' column missing. Add it with: ALTER TABLE users ADD COLUMN created_by INT NULL")
                        return []

                    if requester_role == 'SCHOOL_ADMIN':
                        # School admin should see all users for their school via school_users mapping
                        # Ensure school_users table exists
                        cursor.execute("SHOW TABLES LIKE 'school_users'")
                        if cursor.fetchone():
                            # Use school_id parameter to fetch members
                            if not school_id:
                                # if no school_id provided fall back to created_by behavior
                                cursor.execute("SELECT id FROM users WHERE created_by=%s", (requester_id,))
                                rows = cursor.fetchall()
                                allowed_ids = [r['id'] for r in rows]
                            else:
                                cursor.execute("SELECT user_id FROM school_users WHERE school_id=%s", (school_id,))
                                rows = cursor.fetchall()
                                allowed_ids = [r['user_id'] for r in rows]
                        else:
                            # fallback: if mapping table missing, fall back to created_by behavior
                            cursor.execute("SELECT id FROM users WHERE created_by=%s", (requester_id,))
                            rows = cursor.fetchall()
                            allowed_ids = [r['id'] for r in rows]
                    else:
                        # SECRETARY: Return students created by this secretary and parents created by this secretary or parents of those students
                        cursor.execute("SELECT id FROM users WHERE role='STUDENT' AND created_by=%s", (requester_id,))
                        student_rows = cursor.fetchall()
                        student_ids = [r['id'] for r in student_rows]

                        # Get parent ids who were created by requester
                        cursor.execute("SELECT id FROM users WHERE role='PARENT' AND created_by=%s", (requester_id,))
                        parent_rows = cursor.fetchall()
                        parent_ids = [r['id'] for r in parent_rows]

                        # Get parents linked to those students
                        if student_ids:
                            format_ids = ','.join(['%s'] * len(student_ids))
                            cursor.execute(f"SELECT parent_id FROM parent_student WHERE student_id IN ({format_ids})", tuple(student_ids))
                            linked_parents = cursor.fetchall()
                            parent_ids += [r['parent_id'] for r in linked_parents]

                        allowed_ids = student_ids + parent_ids

                    if not allowed_ids:
                        return []
                    format_allowed = ','.join(['%s'] * len(allowed_ids))
                    query = f"SELECT id, name, email, role, created_at, school_id, class_id, password, status, profile_image, unique_id, created_by, admin_level, school_type FROM users WHERE id IN ({format_allowed})"
                    cursor.execute(query, tuple(allowed_ids))
                    users_data = cursor.fetchall()
                else:
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
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[ERROR] get_all: {e}")
            return []

    @classmethod
    def get_by_id(cls, user_id, requester_school_type=None):
        """Get a single user by ID. Filter by requester_school_type for isolation."""
        conn = get_connection()
        with conn.cursor() as cursor:
            params = [user_id]
            query = """
                SELECT id, name, email, role, created_at, school_id, class_id, password, status, profile_image, unique_id, admin_level, school_type
                FROM users
                WHERE id = %s
            """
            if requester_school_type:
                query += " AND school_type = %s"
                params.append(requester_school_type)
            cursor.execute(query, params)
            data = cursor.fetchone()
            
            if data:
                if data['role'] == 'PARENT':
                    cursor.execute("""
                        SELECT u.id, u.name, u.email, u.class_id, u.school_type 
                        FROM users u
                        JOIN parent_student ps ON u.id = ps.student_id
                        WHERE ps.parent_id = %s
                    """, (user_id,))
                    data['children'] = cursor.fetchall()
                elif data['role'] == 'STUDENT':
                    cursor.execute("""
                        SELECT u.id, u.name, u.email, u.school_type
                        FROM users u
                        JOIN parent_student ps ON u.id = ps.parent_id
                        WHERE ps.student_id = %s
                    """, (user_id,))
                    data['parents'] = cursor.fetchall()

        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email=None, password=None, role="USER", school_id=None, class_id=None, created_by=None, admin_level=None):
        """Create a new user. Optionally record who created the user in created_by column (if present)."""
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

            # Build insert dynamically depending on created_by/admin_level
            cursor.execute("SHOW COLUMNS FROM users LIKE 'admin_level'")
            has_admin_level = cursor.fetchone() is not None

            if created_by is not None and has_admin_level:
                cursor.execute(
                    "INSERT INTO users (name, email, password, role, school_id, class_id, unique_id, created_by, admin_level) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (name, email, hashed_password, role, school_id, class_id, unique_id, created_by, admin_level)
                )
            elif created_by is not None:
                cursor.execute(
                    "INSERT INTO users (name, email, password, role, school_id, class_id, unique_id, created_by) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                    (name, email, hashed_password, role, school_id, class_id, unique_id, created_by)
                )
            elif has_admin_level:
                cursor.execute(
                    "INSERT INTO users (name, email, password, role, school_id, class_id, unique_id, admin_level) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                    (name, email, hashed_password, role, school_id, class_id, unique_id, admin_level)
                )
            else:
                cursor.execute(
                    "INSERT INTO users (name, email, password, role, school_id, class_id, unique_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (name, email, hashed_password, role, school_id, class_id, unique_id)
                )

            conn.commit()
            new_user_id = cursor.lastrowid

            # Map user to school in school_users (migration must exist)
            try:
                cursor.execute("INSERT IGNORE INTO school_users (school_id, user_id, role, created_by, created_at) VALUES (%s, %s, %s, %s, NOW())", (school_id, new_user_id, role, created_by))
                conn.commit()
            except Exception:
                # ignore if table missing or migration not run
                pass

            return cls.get_by_id(new_user_id)

    def update(self, name=None, email=None, role=None, school_id=None, school_type=None, password=None, profile_image=None, class_id=None, children_ids=None, admin_level=None):
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
            if password is not None:
                # Allow "leave blank" in UI without overwriting the password.
                if password != "":
                    hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
                    fields.append("password=%s")
                    values.append(hashed_password)
            if profile_image is not None:
                fields.append("profile_image=%s")
                values.append(profile_image)
            if class_id is not None:
                fields.append("class_id=%s")
                values.append(class_id)
            if admin_level is not None:
                fields.append("admin_level=%s")
                values.append(admin_level)

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
    def __init__(self, id, school_id, name, created_at=None, level=None, main_teacher_id=None, main_teacher_name=None):
        self.id = id
        self.school_id = school_id
        self.name = name
        self.created_at = created_at
        self.level = level
        self.main_teacher_id = main_teacher_id
        self.main_teacher_name = main_teacher_name

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            school_id=data['school_id'],
            name=data['name'],
            created_at=data.get('created_at'),
            level=data.get('level'),
            main_teacher_id=data.get('main_teacher_id'),
            main_teacher_name=data.get('main_teacher_name')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'name': self.name,
            'level': self.level,
            'main_teacher_id': self.main_teacher_id,
            'main_teacher_name': self.main_teacher_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def get_by_school(cls, school_id, level=None, requester_school_type=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if main_teacher_id column exists
            cursor.execute("SHOW COLUMNS FROM classes LIKE 'main_teacher_id'")
            has_main_teacher = cursor.fetchone() is not None

            params = [school_id]
            if has_main_teacher:
                base_query = (
                    "SELECT c.*, u.name as main_teacher_name "
                    "FROM classes c LEFT JOIN users u ON u.id = c.main_teacher_id "
                    "WHERE c.school_id=%s"
                )
            else:
                base_query = "SELECT c.* FROM classes c WHERE c.school_id=%s"

            if requester_school_type:
                base_query += " AND EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id AND s.school_type = %s)"
                params.append(requester_school_type)

            if level:
                base_query += " AND c.level=%s ORDER BY c.name ASC"
                params.append(level)
            else:
                base_query += " ORDER BY c.name ASC"

            cursor.execute(base_query, params)
            data = cursor.fetchall()
        return [cls.from_dict(d) for d in data]

    @classmethod
    def create(cls, school_id, name, level=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            # If the DB has a 'level' column, persist it.
            try:
                cursor.execute("SHOW COLUMNS FROM classes LIKE 'level'")
                has_level = cursor.fetchone() is not None
            except Exception:
                has_level = False

            if has_level:
                cursor.execute("INSERT INTO classes (school_id, name, level) VALUES (%s, %s, %s)", (school_id, name, level))
            else:
                cursor.execute("INSERT INTO classes (school_id, name) VALUES (%s, %s)", (school_id, name))

            conn.commit()
            class_id = cursor.lastrowid
            cursor.execute("SELECT * FROM classes WHERE id=%s", (class_id,))
            return cls.from_dict(cursor.fetchone())


# Helper utilities for school types and allowed classes
MATERNELLE_CLASSES = [
    "1ere maternelle",
    "2eme maternelle",
    "3eme maternelle",
]

PRIMAIRE_CLASSES = [
    "1ere primaire",
    "2eme primaire",
    "3eme primaire",
    "4eme primaire",
    "5eme primaire",
    "6eme primaire",
]

SECONDAIRE_CLASSES = [
    "7eme secondaire",
    "8eme secondaire",
    "1ere secondaire",
    "2eme secondaire",
    "3eme secondaire",
    "4eme secondaire",
]


def get_allowed_class_names(school_type):
    """Return allowed base class names for a given school_type ("primaire", "secondaire", or "maternelle")."""
    if not school_type:
        return []
    st = school_type.strip().lower()
    if st in ('primaire',):
        return PRIMAIRE_CLASSES
    if st in ('secondaire', 'secondary'):
        return SECONDAIRE_CLASSES
    if st in ('maternelle',):
        return MATERNELLE_CLASSES
    return []


class School:
    def __init__(self, id, name, email=None, phone=None, password=None, created_at=None, school_type=None):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.password = password
        self.created_at = created_at
        self.school_type = school_type

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            password=data.get('password'),
            created_at=data.get('created_at'),
            school_type=data.get('school_type')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'password': self.password.decode() if isinstance(self.password, bytes) else self.password,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'school_type': self.school_type
        }

    @classmethod
    def get_all(cls):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, password, created_at, school_type FROM schools ORDER BY created_at DESC")
            data = cursor.fetchall()
        return [cls.from_dict(d) for d in data]

    @classmethod
    def get_by_id(cls, school_id):
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, email, phone, password, created_at, school_type FROM schools WHERE id=%s", (school_id,))
            data = cursor.fetchone()
        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def create(cls, name, email=None, phone=None, password=None, school_type=None):
        conn = get_connection()
        with conn.cursor() as cursor:
            # Hash password if provided
            hashed_password = None
            if password:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

            cursor.execute("INSERT INTO schools (name, email, phone, password, school_type) VALUES (%s, %s, %s, %s, %s)", 
                          (name, email, phone, hashed_password, school_type))
            conn.commit()
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, phone=None, password=None, school_type=None):
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
            if school_type is not None:
                fields.append("school_type=%s")
                values.append(school_type)
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
