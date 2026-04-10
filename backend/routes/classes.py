from flask import Blueprint, jsonify, request
from models import ClassModel, User, School, get_allowed_class_names, PRIMAIRE_CLASSES, SECONDAIRE_CLASSES, MATERNELLE_CLASSES
from routes.auth import get_requester_from_auth
import re

classes_bp = Blueprint('classes', __name__)


def _ensure_level_column():
    """Auto-create the 'level' column on the classes table if it doesn't exist."""
    try:
        from db import get_connection
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM classes LIKE 'level'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE classes ADD COLUMN level VARCHAR(50) NULL")
                conn.commit()
                print("[MIGRATION] Added 'level' column to classes table")
    except Exception as e:
        print(f"[WARN] _ensure_level_column: {e}")


@classes_bp.route("/allowed-names", methods=["GET"])
def get_allowed_names():
    """Return the predefined class names for a given level (primaire/secondaire/maternelle)."""
    level = (request.args.get("level") or "").strip().lower()
    names = get_allowed_class_names(level)
    return jsonify({"names": names, "level": level})


@classes_bp.route("/<int:class_id>/assign-teacher", methods=["POST"])
def assign_teacher_to_class(class_id):
    """Set the main teacher (professeur principal / titulaire) for a class.

    This is separate from course-based teacher assignments (teacher_classes).
    The main teacher is stored in classes.main_teacher_id.

    Expected JSON:
      - teacher_id: int (required)
      - created_by: int (required, must be SCHOOL_ADMIN of same school)
    """
    data = request.json or {}
    teacher_id = data.get("teacher_id")
    created_by = data.get("created_by")

    if not teacher_id or not created_by:
        return jsonify({"error": "teacher_id and created_by are required"}), 400

    try:
        # Verify requester
        requester = User.get_by_id(created_by)
        if not requester:
            return jsonify({"error": "Requester not found"}), 404
        if requester.role != 'SCHOOL_ADMIN':
            return jsonify({"error": "Only SCHOOL_ADMIN can assign teachers"}), 403

        # Verify class
        from db import get_connection
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, school_id, name FROM classes WHERE id=%s", (class_id,))
            cls = cursor.fetchone()
        if not cls:
            return jsonify({"error": "Class not found"}), 404
        if str(cls['school_id']) != str(requester.school_id):
            return jsonify({"error": "Requester is not admin of this school"}), 403

        # Verify teacher
        teacher = User.get_by_id(teacher_id)
        if not teacher:
            return jsonify({"error": "Teacher not found"}), 404
        if teacher.role != 'TEACHER':
            return jsonify({"error": "User is not a teacher"}), 400
        if str(teacher.school_id) != str(cls['school_id']):
            return jsonify({"error": "Teacher does not belong to this school"}), 400

        # Ensure main_teacher_id column exists
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM classes LIKE 'main_teacher_id'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE classes ADD COLUMN main_teacher_id INT NULL")
                conn.commit()

            # Set the main teacher (replaces previous if any)
            cursor.execute("UPDATE classes SET main_teacher_id=%s WHERE id=%s", (teacher_id, class_id))
            conn.commit()

            # Get teacher name for response
            teacher_name = teacher.name

        return jsonify({"message": f"Professeur principal assigned: {teacher_name}"}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@classes_bp.route("/", methods=["GET"]) 
def get_classes():
    school_id = request.args.get("school_id")
    level = request.args.get("level")
    if not school_id:
        return jsonify({"error": "school_id is required"}), 400

    # Get requester for school_type validation\n    requester = None  # Public reads allowed, no auth needed

    try:
        _ensure_level_column()
        requester = get_requester_from_auth()
        classes = ClassModel.get_by_school(school_id, level=level, requester_school_type=requester['school_type'] if requester else None)

        # Optional validation skipped for public reads (requester=None)

        # DB debug: helps detect when Flask is connected to a different DB than phpMyAdmin.
        from db import get_connection
        conn = get_connection()
        db_name = None
        db_host = None
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT DATABASE() AS db")
                row = cursor.fetchone()
                db_name = row.get('db') if row else None
        except Exception:
            pass
        try:
            db_host = getattr(conn, 'host', None)
        except Exception:
            db_host = None

        return jsonify({
            "classes": [c.to_dict() for c in classes],
            "debug": {
                "school_id": school_id,
                "level": level,
            "requester_type": requester['role'] if 'requester' in locals() and requester else None,
                "count": len(classes),
                "db": db_name,
                "db_host": db_host,
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@classes_bp.route("/", methods=["POST"]) 
def create_class():
    data = request.json
    school_id = data.get("school_id")
    name = data.get("name")
    created_by = data.get("created_by")
    level = data.get("level")

    if not school_id or not name or not created_by:
        return jsonify({"error": "school_id, name and created_by are required"}), 400

    try:
        _ensure_level_column()

        # Verify requester
        requester = User.get_by_id(created_by)
        if not requester:
            return jsonify({"error": "Requester not found"}), 404
        if requester.role != 'SCHOOL_ADMIN':
            return jsonify({"error": "Only SCHOOL_ADMIN can create classes"}), 403
        if str(requester.school_id) != str(school_id):
            return jsonify({"error": "Requester is not admin of this school"}), 403

        # Load school and allowed base names
        school = School.get_by_id(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        # Prefer explicit 'level' sent by the UI (primaire/secondaire/maternelle).
        # Fallback to school.school_type for backward compatibility.
        effective_level = (level or school.school_type or '').strip().lower()
        if effective_level in ('secondary',):
            effective_level = 'secondaire'

        allowed = get_allowed_class_names(effective_level)
        if not allowed:
            return jsonify({"error": "School type not set or invalid"}), 400

        name_lower = name.strip().lower()
        allowed_lower = [a.lower() for a in allowed]

        valid = False
        # exact match
        if name_lower in allowed_lower:
            valid = True
        else:
            # check each allowed base
            for base in allowed_lower:
                if name_lower.startswith(base):
                    suffix = name_lower[len(base):].strip()
                    if not suffix:
                        valid = True
                        break
                    # allow suffix patterns: optional leading separators then letters/numbers/spaces/hyphens
                    if re.match(r'^[\s\-–—]*[a-z0-9][a-z0-9\s\-–—]*$', suffix):
                        valid = True
                        break

        if not valid:
            return jsonify({"error": f"Class name '{name}' is not allowed for school type {school.school_type}"}), 400

        new_class = ClassModel.create(school_id, name, level=level)
        return jsonify(new_class.to_dict()), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
