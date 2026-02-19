from flask import Blueprint, request, jsonify
from db import get_connection
import bcrypt
import jwt
import os
from models import User

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

    try:
        users = User.get_all(include_super_admin=True)
        return jsonify({"users": [user.to_dict() for user in users]})
    except Exception as e:
        return jsonify({"message": "Error fetching users: " + str(e)}), 500

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

    try:
        user = User.create(name=name, email=email, password=password, role=role)
        return jsonify({"message": "User created successfully", "user": user.to_dict()}), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 409
    except Exception as e:
        return jsonify({"message": "Error creating user: " + str(e)}), 500

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

    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        user.update(name=name, email=email, role=role, password=password)
        return jsonify({"message": "User updated successfully", "user": user.to_dict()})
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": "Error updating user: " + str(e)}), 500

@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        user.delete()
        return jsonify({"message": "User deleted successfully"})
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": "Error deleting user: " + str(e)}), 500

@users_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"message": "Token required"}), 401
    
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload or payload.get("role") != "SUPER_ADMIN":
        return jsonify({"message": "Unauthorized"}), 403

    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({"user": user.to_dict()})
    except Exception as e:
        return jsonify({"message": "Error fetching user: " + str(e)}), 500
