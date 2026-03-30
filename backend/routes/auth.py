from flask import Blueprint, request, jsonify
from db import get_connection
import bcrypt, jwt, os
from datetime import datetime

auth_bp = Blueprint("auth", __name__)
SECRET = os.getenv("JWT_SECRET", "supersecretkey")


def serialize_user(user):
    """Safely serialize a user dict for JSON response, handling bytes and datetime."""
    if not user:
        return None
    safe = {}
    for key, value in user.items():
        if key == 'password':
            # Never send password to frontend
            continue
        elif isinstance(value, bytes):
            try:
                safe[key] = value.decode('utf-8')
            except Exception:
                safe[key] = str(value)
        elif isinstance(value, datetime):
            safe[key] = value.isoformat()
        elif hasattr(value, 'is_finite'):
            # Decimal
            safe[key] = float(value)
        else:
            safe[key] = value
    return safe


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email_or_id = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email_or_id or not password:
        return jsonify({"message": "Email/ID and password required"}), 400

    conn = get_connection()
    with conn.cursor() as cursor:
        # Search by email OR unique_id
        cursor.execute(
            "SELECT * FROM users WHERE email=%s OR unique_id=%s",
            (email_or_id, email_or_id)
        )
        user = cursor.fetchone()

    if not user:
        print("[LOGIN FAILED] User not found: {}".format(email_or_id))
        return jsonify({"message": "Utilisateur introuvable. Vérifiez votre email ou ID."}), 404

    # Get the stored password (could be str or bytes)
    stored_password = user.get("password", "")
    if isinstance(stored_password, bytes):
        stored_password_bytes = stored_password
    else:
        stored_password_bytes = stored_password.encode('utf-8')

    # Enforce login rules based on role
    role = user.get("role", "")

    if role in ["SUPER_ADMIN", "SCHOOL_ADMIN"]:
        # Admins must login with email
        if user.get("email") != email_or_id:
            return jsonify({"message": "Les administrateurs doivent se connecter avec leur adresse email."}), 401
    else:
        # Non-admin users can login with either unique_id or email
        user_email = user.get("email") or ""
        user_uid = user.get("unique_id") or ""
        if email_or_id != user_uid and email_or_id != user_email:
            return jsonify({"message": "Identifiant incorrect."}), 401

    # Check password
    try:
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password_bytes):
            print("[LOGIN FAILED] Incorrect password for user: {}".format(email_or_id))
            return jsonify({"message": "Mot de passe incorrect."}), 401
    except Exception as e:
        print("[LOGIN ERROR] Password check failed for {}: {}".format(email_or_id, e))
        return jsonify({"message": "Erreur de vérification du mot de passe."}), 500

    # Generate JWT token
    token = jwt.encode(
        {
            "id": user["id"],
            "role": user["role"],
            "school_id": user.get("school_id"),
        },
        SECRET,
        algorithm="HS256"
    )

    print("[LOGIN SUCCESS] User logged in: {} (role: {})".format(email_or_id, role))

    # Fetch children for PARENT users
    safe_user = serialize_user(user)
    if role == "PARENT":
        try:
            conn2 = get_connection()
            with conn2.cursor() as cursor2:
                cursor2.execute("""
                    SELECT u.id, u.name, u.email, u.class_id, u.unique_id
                    FROM users u
                    JOIN parent_student ps ON u.id = ps.student_id
                    WHERE ps.parent_id = %s
                """, (user["id"],))
                children = cursor2.fetchall()
                safe_user["children"] = [serialize_user(c) for c in children]
        except Exception as e:
            print("[LOGIN] Failed to fetch children for parent {}: {}".format(user["id"], e))
            safe_user["children"] = []

    # Fetch parents for STUDENT users
    if role == "STUDENT":
        try:
            conn2 = get_connection()
            with conn2.cursor() as cursor2:
                cursor2.execute("""
                    SELECT u.id, u.name, u.email
                    FROM users u
                    JOIN parent_student ps ON u.id = ps.parent_id
                    WHERE ps.student_id = %s
                """, (user["id"],))
                parents = cursor2.fetchall()
                safe_user["parents"] = [serialize_user(p) for p in parents]
        except Exception as e:
            print("[LOGIN] Failed to fetch parents for student {}: {}".format(user["id"], e))
            safe_user["parents"] = []

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": safe_user
    })
