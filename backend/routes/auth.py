
from flask import Blueprint, request, jsonify
from db import get_connection
import bcrypt, jwt, os

auth_bp = Blueprint("auth", __name__)
SECRET = os.getenv("JWT_SECRET", "supersecretkey")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

    if not user:
        print("[LOGIN FAILED] User not found: {}".format(email))
        return jsonify({"message": "User not found"}), 404

    if not bcrypt.checkpw(password.encode(), user["password"].encode()):
        print("[LOGIN FAILED] Incorrect password for user: {}".format(email))
        return jsonify({"message": "Incorrect password"}), 401

    token = jwt.encode({"id": user["id"], "role": user["role"]}, SECRET, algorithm="HS256")
    print("[LOGIN SUCCESS] User logged in: {}".format(email))

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user
    })
