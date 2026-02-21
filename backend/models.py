from datetime import datetime
from db import get_connection

class User:
    def __init__(self, id, name, email, role, 
                 created_at=None, 
                 updated_at=None,
                 school_id=None,
                 status=None,
                 profile_image=None):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.created_at = created_at
        self.updated_at = updated_at
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
            updated_at=data.get('updated_at'),
            school_id=data.get('school_id'),
            status=data.get('status'),
            profile_image=data.get('profile_image')
        )
        # Add password attribute if it exists in the data
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
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'school_id': self.school_id,
            'status': self.status,
            'profile_image': self.profile_image,
            'password': self.password.decode() if hasattr(self, 'password') and isinstance(self.password, bytes) else (self.password if hasattr(self, 'password') else '...')
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
        
        return [cls.from_dict(user_data) for user_data in users_data]

    @classmethod
    def get_by_id(cls, user_id):
        """Get user by ID"""
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role, created_at, school_id, password, status, profile_image
                FROM users 
                WHERE id = %s
            """, (user_id,))
            user_data = cursor.fetchone()
        
        if user_data:
            return cls.from_dict(user_data)
        return None

    @classmethod
    def create(cls, name, email, password, role="USER", school_id=None):
        """Create new user"""
        import bcrypt
        
        # Validate role
        valid_roles = ["USER", "ADMIN", "TEACHER", "STUDENT", "SUPER_ADMIN"]
        if role not in valid_roles:
            raise ValueError("Invalid role: " + role)

        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if user already exists
            cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                raise ValueError("User already exists")

            # Hash password if provided, otherwise use a default
            if password:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            else:
                # Use a default password if none provided
                hashed_password = bcrypt.hashpw("default123".encode(), bcrypt.gensalt())

            # Insert new user
            cursor.execute(
                "INSERT INTO users (name, email, password, role, school_id) VALUES (%s, %s, %s, %s, %s)",
                (name, email, hashed_password, role, school_id)
            )
            conn.commit()

            # Get the created user
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, email=None, role=None, school_id=None, password=None):
        """Update user"""
        import bcrypt
        
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT * FROM users WHERE id=%s", (self.id,))
            user = cursor.fetchone()
            
            if not user:
                return False

            # Check if email is already taken by another user
            if email:
                cursor.execute("SELECT * FROM users WHERE email=%s AND id!=%s", (email, self.id))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    raise ValueError("Email already taken")

            # Validate role
            if role:
                valid_roles = ["USER", "ADMIN", "TEACHER", "STUDENT", "SUPER_ADMIN"]
                if role not in valid_roles:
                    raise ValueError("Invalid role: " + role)

            # Update user
            update_fields = []
            values = []
            
            if name:
                update_fields.append("name=%s")
                values.append(name)
            if email:
                update_fields.append("email=%s")
                values.append(email)
            if role:
                update_fields.append("role=%s")
                values.append(role)
            if school_id is not None:
                update_fields.append("school_id=%s")
                values.append(school_id)
            if password:
                hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
                update_fields.append("password=%s")
                values.append(hashed_password)

            if update_fields:
                values.append(self.id)
                query = "UPDATE users SET " + ", ".join(update_fields) + " WHERE id=%s"
                cursor.execute(query, values)
                conn.commit()

                # Refresh user data
                updated_user = self.get_by_id(self.id)
                if updated_user:
                    self.name = updated_user.name
                    self.email = updated_user.email
                    self.role = updated_user.role
                    self.school_id = updated_user.school_id

            return True

    def delete(self):
        """Delete user"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT * FROM users WHERE id=%s", (self.id,))
            user = cursor.fetchone()
            
            if not user:
                return False

            # Don't allow deletion of SUPER_ADMIN users
            if user["role"] == "SUPER_ADMIN":
                raise ValueError("Cannot delete super admin")

            # Delete user
            cursor.execute("DELETE FROM users WHERE id=%s", (self.id,))
            conn.commit()

            return True

class School:
    def __init__(self, id, name, address=None, created_at=None, updated_at=None):
        self.id = id
        self.name = name
        self.address = address
        self.created_at = created_at
        self.updated_at = updated_at

    @classmethod
    def from_dict(cls, data):
        """Create School instance from database row"""
        return cls(
            id=data['id'],
            name=data['name'],
            address=data.get('address'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

    def to_dict(self):
        """Convert School instance to dictionary for API response"""
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def get_all(cls):
        """Get all schools from database"""
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, address, created_at, updated_at
                FROM schools 
                ORDER BY created_at DESC
            """)
            schools_data = cursor.fetchall()
        
        return [cls.from_dict(school_data) for school_data in schools_data]

    @classmethod
    def get_by_id(cls, school_id):
        """Get school by ID"""
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, address, created_at, updated_at
                FROM schools 
                WHERE id = %s
            """, (school_id,))
            school_data = cursor.fetchone()
        
        if school_data:
            return cls.from_dict(school_data)
        return None

    @classmethod
    def create(cls, name, address=None):
        """Create new school"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Insert new school
            cursor.execute(
                "INSERT INTO schools (name, address) VALUES (%s, %s)",
                (name, address)
            )
            conn.commit()

            # Get the created school
            return cls.get_by_id(cursor.lastrowid)

    def update(self, name=None, address=None):
        """Update school"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if school exists
            cursor.execute("SELECT * FROM schools WHERE id=%s", (self.id,))
            school = cursor.fetchone()
            
            if not school:
                return False

            # Update school
            update_fields = []
            values = []
            
            if name:
                update_fields.append("name=%s")
                values.append(name)
            if address is not None:
                update_fields.append("address=%s")
                values.append(address)

            if update_fields:
                values.append(self.id)
                query = "UPDATE schools SET " + ", ".join(update_fields) + " WHERE id=%s"
                cursor.execute(query, values)
                conn.commit()

                # Refresh school data
                updated_school = self.get_by_id(self.id)
                if updated_school:
                    self.name = updated_school.name
                    self.address = updated_school.address
                    self.updated_at = updated_school.updated_at

            return True

    def delete(self):
        """Delete school"""
        conn = get_connection()
        with conn.cursor() as cursor:
            # Check if school exists
            cursor.execute("SELECT * FROM schools WHERE id=%s", (self.id,))
            school = cursor.fetchone()
            
            if not school:
                return False

            # Delete school
            cursor.execute("DELETE FROM schools WHERE id=%s", (self.id,))
            conn.commit()

            return True
