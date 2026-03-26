from flask import Blueprint, jsonify, request
from models import ClassModel, User, School, get_allowed_class_names
import re

classes_bp = Blueprint('classes', __name__)


@classes_bp.route("/<int:class_id>/assign-teacher", methods=["POST"])
def assign_teacher_to_class(class_id):
    """Associate an existing teacher to a class (creates row in teacher_classes).

    Expected JSON:
      - teacher_id: int (required)
      - created_by: int (required, must be SCHOOL_ADMIN of same school)

    Notes:
      - Validates teacher belongs to same school and has role TEACHER.
      - Prevents duplicate associations.
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

        # Create teacher_classes table if missing and insert association
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS teacher_classes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    teacher_id INT NOT NULL,
                    class_id INT NOT NULL,
                    UNIQUE KEY uniq_teacher_class (teacher_id, class_id),
                    INDEX (teacher_id),
                    INDEX (class_id),
                    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cursor.execute(
                "SELECT id FROM teacher_classes WHERE teacher_id=%s AND class_id=%s",
                (teacher_id, class_id)
            )
            existing = cursor.fetchone()
            if existing:
                # keep users.class_id in sync for compatibility
                cursor.execute("UPDATE users SET class_id=%s WHERE id=%s", (class_id, teacher_id))
                conn.commit()
                return jsonify({"message": "Teacher already assigned to this class"}), 200

            cursor.execute(
                "INSERT INTO teacher_classes (teacher_id, class_id) VALUES (%s, %s)",
                (teacher_id, class_id)
            )
            # keep users.class_id in sync for compatibility
            cursor.execute("UPDATE users SET class_id=%s WHERE id=%s", (class_id, teacher_id))
            conn.commit()

        return jsonify({"message": "Teacher assigned successfully"}), 201
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
    try:
        classes = ClassModel.get_by_school(school_id, level=level)
        return jsonify({"classes": [c.to_dict() for c in classes]})
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
        allowed = get_allowed_class_names(school.school_type)
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
