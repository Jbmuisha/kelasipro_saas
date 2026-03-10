
from flask import Blueprint, request, jsonify
from db import get_connection
import bcrypt, jwt, os

auth_bp = Blueprint("auth", __name__)
SECRET = os.getenv("JWT_SECRET", "supersecretkey")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email_or_id = data.get("email")
    password = data.get("password")

    if not email_or_id or not password:
        return jsonify({"message": "Email/ID and password required"}), 400

    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email=%s OR unique_id=%s", (email_or_id, email_or_id))
        user = cursor.fetchone()

    if not user:
        print("[LOGIN FAILED] User not found: {}".format(email_or_id))
        return jsonify({"message": "User not found"}), 404

    # Enforce login rules based on role
    role = user.get("role")
    if role in ["SUPER_ADMIN", "SCHOOL_ADMIN"]:
        if user.get("email") != email_or_id:
            return jsonify({"message": "Les administrateurs doivent se connecter avec leur adresse email."}), 401
    else:
        if user.get("unique_id") != email_or_id:
            return jsonify({"message": "Vous devez vous connecter avec votre ID (ex: 2026xxx)."}), 401

    if not bcrypt.checkpw(password.encode(), user["password"].encode()):
        print("[LOGIN FAILED] Incorrect password for user: {}".format(email_or_id))
        return jsonify({"message": "Incorrect password"}), 401

    token = jwt.encode({"id": user["id"], "role": user["role"], "school_id": user.get("school_id")}, SECRET, algorithm="HS256")
    print("[LOGIN SUCCESS] User logged in: {}".format(email_or_id))

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user
    })
