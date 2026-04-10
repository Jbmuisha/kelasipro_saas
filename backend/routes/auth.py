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
    # For TEACHER role, ALWAYS use school.school_type (not user.admin_level)
    school_type = user.get('admin_level') or user.get('school_type')
    if role == "TEACHER" and user.get("school_id"):
        with get_connection().cursor() as cursor:
            cursor.execute("SELECT school_type FROM schools WHERE id = %s", (user["school_id"],))
            school_row = cursor.fetchone()
            if school_row:
                school_type = school_row['school_type'] or None

    if not school_type and role != "SUPER_ADMIN":
        school_type = 'primaire'

    token = jwt.encode(
        {
            "id": user["id"],
            "role": user["role"],
            "school_id": user.get("school_id"),
            "school_type": school_type,
        },
        SECRET,
        algorithm="HS256"
    )

    print("[LOGIN SUCCESS] User logged in: {} (role: {}, school_type: {})".format(email_or_id, role, school_type))

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


def get_requester_from_auth():
    """Extract requester info from JWT Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return {
            'id': payload.get('id'),
            'role': payload.get('role'),
            'school_id': payload.get('school_id'),
            'school_type': payload.get('school_type')
        }
    except Exception:
        return None


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Client-triggered logout. For stateless JWT, just clear client storage.
    Future: blacklist token if needed.
    """
    requester = get_requester_from_auth()
    if not requester:
        return jsonify({"error": "Invalid token"}), 401
    
    print(f"[LOGOUT] User {requester['id']} ({requester['role']}) logged out")
    return jsonify({"message": "Logout successful"}), 200


@auth_bp.route("/admin/impersonate/<int:teacher_id>", methods=["POST"])
def impersonate(teacher_id):
    """Generate real JWT token for admin to impersonate a teacher. 
    Only SCHOOL_ADMIN (same school_type) or SUPER_ADMIN."""
    requester = get_requester_from_auth()
    if not requester:
        return jsonify({"error": "Invalid token"}), 401
    
    if requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN'):
        return jsonify({"error": "Only SCHOOL_ADMIN or SUPER_ADMIN can impersonate"}), 403
    
    from models import User
    teacher = User.get_by_id(teacher_id, requester_school_type=requester.get('school_type'))
    if not teacher or teacher.role not in ('TEACHER', 'ASSISTANT'):
        return jsonify({"error": "Teacher not found or access denied"}), 404
    
    # Generate JWT with teacher's payload
    import jwt, os
    SECRET = os.getenv("JWT_SECRET", "supersecretkey")
    payload = {
        "id": teacher.id,
        "role": teacher.role,
        "school_id": getattr(teacher, 'school_id', None),
        "school_type": getattr(teacher, 'school_type', None),
    }
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    
    print(f"[IMPERSONATE] {requester['role']} {requester['id']} impersonating teacher {teacher.id}")
    
    safe_user = serialize_user({
        'id': teacher.id, 'name': teacher.name, 'email': teacher.email,
        'role': teacher.role, 'school_id': getattr(teacher, 'school_id', None),
        'school_type': getattr(teacher, 'school_type', None), 'unique_id': getattr(teacher, 'unique_id', None),
        'profile_image': getattr(teacher, 'profile_image', None)
    })
    
    return jsonify({"token": token, "user": safe_user})
