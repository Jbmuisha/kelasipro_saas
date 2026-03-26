from flask import Blueprint, request, jsonify
from db import get_connection
from models import User
import traceback

courses_bp = Blueprint('courses', __name__)


def ensure_courses_tables():
    """Ensure courses + course_classes tables exist.

    Note: teacher_id is nullable so a course can exist before assigning a teacher.
    """
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NULL,
                school_id INT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (teacher_id),
                INDEX (school_id),
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS course_classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                class_id INT NOT NULL,
                UNIQUE KEY uniq_course_class (course_id, class_id),
                INDEX (course_id),
                INDEX (class_id),
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        )

    conn.commit()


def get_requester_from_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None

    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None

    try:
        import os, jwt
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get('id')
        role = payload.get('role')
        school_id = payload.get('school_id')
        if not user_id or not role:
            return None
        return {'id': user_id, 'role': role, 'school_id': school_id}
    except Exception:
        return None


@courses_bp.route('/courses', methods=['POST'])
def create_course():
    """Create a course without requiring a teacher.

    SCHOOL_ADMIN only.

    JSON:
      - school_id: int (required)
      - name: str (required)
      - description: str (optional)
      - classes: int[] (optional)
      - teacher_id: int (optional)
    """
    try:
        requester = get_requester_from_auth()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        school_id = data.get('school_id')
        name = data.get('name')
        description = data.get('description')
        class_ids = data.get('classes') or []
        teacher_id = data.get('teacher_id')

        if not school_id:
            return jsonify({'error': 'school_id is required'}), 400
        if not name:
            return jsonify({'error': 'Course name required'}), 400

        # If teacher_id provided, validate it belongs to same school and is TEACHER
        if teacher_id:
            teacher = User.get_by_id(teacher_id)
            if not teacher or teacher.role != 'TEACHER':
                return jsonify({'error': 'Teacher not found'}), 404
            if str(teacher.school_id) != str(school_id):
                return jsonify({'error': 'Teacher does not belong to this school'}), 400

        ensure_courses_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO courses (teacher_id, school_id, name, description) VALUES (%s, %s, %s, %s)",
                (teacher_id, school_id, name, description)
            )
            conn.commit()
            course_id = cursor.lastrowid

            for cid in class_ids:
                cursor.execute("INSERT IGNORE INTO course_classes (course_id, class_id) VALUES (%s, %s)", (course_id, cid))
            conn.commit()

            cursor.execute(
                "SELECT c.id, c.teacher_id, c.school_id, c.name, c.description, c.created_at, u.name as teacher_name "
                "FROM courses c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.id=%s",
                (course_id,)
            )
            course = cursor.fetchone()

            cursor.execute(
                "SELECT cc.class_id, cl.name FROM course_classes cc JOIN classes cl ON cl.id=cc.class_id WHERE cc.course_id=%s",
                (course_id,)
            )
            course['classes'] = cursor.fetchall()

        return jsonify({'course': course}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@courses_bp.route('/courses/<int:course_id>/assign-teacher', methods=['PUT'])
def assign_teacher(course_id: int):
    """Assign/replace a teacher for an existing course.

    SCHOOL_ADMIN only.

    JSON:
      - teacher_id: int (required)
    """
    try:
        requester = get_requester_from_auth()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        teacher_id = data.get('teacher_id')
        if not teacher_id:
            return jsonify({'error': 'teacher_id is required'}), 400

        ensure_courses_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, school_id FROM courses WHERE id=%s", (course_id,))
            course = cursor.fetchone()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

            teacher = User.get_by_id(teacher_id)
            if not teacher or teacher.role != 'TEACHER':
                return jsonify({'error': 'Teacher not found'}), 404
            if str(teacher.school_id) != str(course['school_id']):
                return jsonify({'error': 'Teacher does not belong to this school'}), 400

            cursor.execute("UPDATE courses SET teacher_id=%s WHERE id=%s", (teacher_id, course_id))
            conn.commit()

            # Auto-assign the teacher to all classes of this course (teacher_classes).
            # This way, when a course is assigned to a teacher, the classes show up
            # automatically in the teacher's class list.
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
                "SELECT class_id FROM course_classes WHERE course_id=%s", (course_id,)
            )
            course_class_ids = [r['class_id'] for r in cursor.fetchall()]

            for cid in course_class_ids:
                cursor.execute(
                    "INSERT IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (%s, %s)",
                    (teacher_id, cid)
                )
            conn.commit()

            cursor.execute(
                "SELECT c.id, c.teacher_id, c.school_id, c.name, c.description, c.created_at, u.name as teacher_name "
                "FROM courses c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.id=%s",
                (course_id,)
            )
            updated = cursor.fetchone()

            cursor.execute(
                "SELECT cc.class_id, cl.name FROM course_classes cc JOIN classes cl ON cl.id=cc.class_id WHERE cc.course_id=%s",
                (course_id,)
            )
            updated['classes'] = cursor.fetchall()

        return jsonify({'course': updated, 'auto_assigned_classes': course_class_ids}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
