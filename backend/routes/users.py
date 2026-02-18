from flask import Blueprint, request, jsonify
from db import get_connection
import bcrypt
import jwt
import os

users_bp = Blueprint("users", __name__)
SECRET = os.getenv("JWT_SECRET", "supersecretkey")

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@users_bp.route("/users", methods=["GET"])
def get_users():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, email, role, created_at, updated_at 
            FROM users 
            WHERE role != 'SUPER_ADMIN' 
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()

    return jsonify({"users": users})

@users_bp.route("/users", methods=["POST"])
def create_user():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "USER")

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password required"}), 400

    # Validate role
    valid_roles = ["USER", "ADMIN", "TEACHER", "STUDENT"]
    if role not in valid_roles:
        return jsonify({"message": "Invalid role"}), 400

    conn = get_connection()
    with conn.cursor() as cursor:
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({"message": "User already exists"}), 409

        # Hash password
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, hashed_password, role)
        )
        conn.commit()

    return jsonify({"message": "User created successfully"}), 201

@users_bp.route("/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    role = data.get("role")
    password = data.get("password")

    if not name or not email:
        return jsonify({"message": "Name and email required"}), 400

    # Validate role
    valid_roles = ["USER", "ADMIN", "TEACHER", "STUDENT"]
    if role and role not in valid_roles:
        return jsonify({"message": "Invalid role"}), 400

    conn = get_connection()
    with conn.cursor() as cursor:
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Check if email is already taken by another user
        cursor.execute("SELECT * FROM users WHERE email=%s AND id!=%s", (email, user_id))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({"message": "Email already taken"}), 409

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
        if password:
            hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            update_fields.append("password=%s")
            values.append(hashed_password)

        if update_fields:
            values.append(user_id)
            query = "UPDATE users SET " + ", ".join(update_fields) + " WHERE id=%s"
            cursor.execute(query, values)
            conn.commit()

    return jsonify({"message": "User updated successfully"})

@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    conn = get_connection()
    with conn.cursor() as cursor:
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Don't allow deletion of SUPER_ADMIN users
        if user["role"] == "SUPER_ADMIN":
            return jsonify({"message": "Cannot delete super admin"}), 400

        # Delete user
        cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))
        conn.commit()

    return jsonify({"message": "User deleted successfully"})

@users_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, email, role, created_at, updated_at 
            FROM users 
            WHERE id=%s
        """, (user_id,))
        user = cursor.fetchone()

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user})