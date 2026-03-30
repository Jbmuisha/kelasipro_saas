from flask import Blueprint, request, jsonify
from db import get_connection
from models import User, School
import traceback

teachers_bp = Blueprint('teachers', __name__)


def ensure_courses_table():
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
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
        """)

        cursor.execute("""
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
        """)

    conn.commit()


def get_requester_from_auth():
    """Return requester info from Authorization: Bearer <jwt>.

    Uses the same JWT secret as /api/auth/login.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        print("[AUTH] No Authorization header")
        return None

    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        print("[AUTH] Empty token after stripping Bearer prefix")
        return None

    try:
        import os, jwt
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get('id')
        role = payload.get('role')
        school_id = payload.get('school_id')
        if not user_id or not role:
            print(f"[AUTH] Token decoded but missing id or role: {payload}")
            return None
        return {'id': user_id, 'role': role, 'school_id': school_id}
    except Exception as e:
        print(f"[AUTH] JWT decode error: {e}")
        return None


@teachers_bp.route('/teachers', methods=['POST'])
def create_teacher():
    """Create a TEACHER or ASSISTANT for a school. Only SCHOOL_ADMIN can create via API.
    Accepts optional 'courses' array to create courses and associate classes atomically.
    """
    try:
        requester = get_requester_from_auth()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        role = data.get('role')
        school_id = data.get('school_id')
        password = data.get('password')
        courses = data.get('courses') or []

        if role not in ('TEACHER', 'ASSISTANT', 'SECRETARY'):
            return jsonify({'error': 'Role must be TEACHER, ASSISTANT or SECRETARY'}), 400
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        # ensure school exists
        school = None
        if school_id:
            school = School.get_by_id(school_id)
            if not school:
                return jsonify({'error': 'School not found'}), 404

        # If school is secondary, require at least one course when creating a TEACHER.
        # NOTE: We only enforce this when the client explicitly sends a "courses" field.
        # This allows primary schools (or misconfigured school_type) to create teachers
        # first, then assign classes/courses later from the dedicated pages.
        if school and school.school_type and school.school_type.lower() in ('secondaire', 'secondary') and role == 'TEACHER':
            if 'courses' in data:
                if not courses or not isinstance(courses, list) or len(courses) == 0:
                    return jsonify({'error': 'Secondary school teachers must have at least one course with classes'}), 400

        # create user
        new_user = User.create(name=name, email=email, password=password, role=role, school_id=school_id, created_by=requester['id'])

        # persist teacher-class links if provided (class_ids)
        class_ids = data.get('class_ids') or []
        if class_ids and role == 'TEACHER':
            conn = get_connection()
            with conn.cursor() as cursor:
                # create teacher_classes table if missing
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS teacher_classes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        teacher_id INT NOT NULL,
                        class_id INT NOT NULL,
                        INDEX (teacher_id),
                        INDEX (class_id),
                        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)
                conn.commit()

                # validate class ids belong to same school
                if class_ids:
                    format_ids = ','.join(['%s'] * len(class_ids))
                    cursor.execute(f"SELECT id, school_id FROM classes WHERE id IN ({format_ids})", tuple(class_ids))
                    found = cursor.fetchall()
                    if len(found) != len(class_ids):
                        # rollback
                        cursor.execute("DELETE FROM users WHERE id=%s", (new_user.id,))
                        conn.commit()
                        return jsonify({'error': 'One or more classes not found'}), 400
                    for f in found:
                        if str(f['school_id']) != str(school_id):
                            cursor.execute("DELETE FROM users WHERE id=%s", (new_user.id,))
                            conn.commit()
                            return jsonify({'error': 'Class does not belong to the same school as teacher'}), 400

                # insert teacher_classes rows and set users.class_id to first class for compatibility
                first = None
                for cid in class_ids:
                    if first is None:
                        first = cid
                    cursor.execute("INSERT INTO teacher_classes (teacher_id, class_id) VALUES (%s, %s)", (new_user.id, cid))
                if first is not None:
                    cursor.execute("UPDATE users SET class_id=%s WHERE id=%s", (first, new_user.id))
                conn.commit()

        # create courses if provided
        if courses and role == 'TEACHER':
            ensure_courses_table()
            conn = get_connection()
            with conn.cursor() as cursor:
                for c in courses:
                    cname = c.get('name')
                    cdesc = c.get('description')
                    course_class_ids = c.get('classes') or []
                    if not cname:
                        continue
                    # validate classes belong to same school
                    if course_class_ids:
                        format_ids = ','.join(['%s'] * len(course_class_ids))
                        cursor.execute(f"SELECT id, school_id FROM classes WHERE id IN ({format_ids})", tuple(course_class_ids))
                        found = cursor.fetchall()
                        if len(found) != len(course_class_ids):
                            # rollback: delete created user and teacher_classes
                            cursor.execute("DELETE FROM teacher_classes WHERE teacher_id=%s", (new_user.id,))
                            cursor.execute("DELETE FROM users WHERE id=%s", (new_user.id,))
                            conn.commit()
                            return jsonify({'error': 'One or more classes not found for course'}), 400
                        for f in found:
                            if str(f['school_id']) != str(school_id):
                                cursor.execute("DELETE FROM teacher_classes WHERE teacher_id=%s", (new_user.id,))
                                cursor.execute("DELETE FROM users WHERE id=%s", (new_user.id,))
                                conn.commit()
                                return jsonify({'error': 'Class does not belong to the same school as teacher'}), 400
                    cursor.execute("INSERT INTO courses (teacher_id, school_id, name, description) VALUES (%s, %s, %s, %s)", (new_user.id, school_id, cname, cdesc))
                    conn.commit()
                    course_id = cursor.lastrowid
                    for cid in course_class_ids:
                        cursor.execute("INSERT INTO course_classes (course_id, class_id) VALUES (%s, %s)", (course_id, cid))
                    conn.commit()

        return jsonify({'user': new_user.to_dict()}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@teachers_bp.route('/teachers', methods=['GET'])
def list_teachers():
    """List TEACHER and ASSISTANT users for a school."""
    try:
        requester = get_requester_from_auth()
        # Allow SCHOOL_ADMIN, SECRETARY, TEACHER, SUPER_ADMIN to read; also allow unauthenticated reads
        allowed_roles = ('SCHOOL_ADMIN', 'SECRETARY', 'TEACHER', 'SUPER_ADMIN', 'ASSISTANT')
        if requester is not None and requester.get('role') not in allowed_roles:
            print(f"[TEACHERS] Unauthorized role: {requester.get('role')}")
            return jsonify({'error': 'Unauthorized'}), 403

        school_id = request.args.get('school_id')
        if not school_id:
            # fallback to token school_id if present
            if requester and requester.get('school_id'):
                school_id = requester.get('school_id')
            else:
                return jsonify({'error': 'school_id query param is required'}), 400

        # If requester is None, pass no requester_id/role to User.get_all (will return all for school)
        requester_id = requester['id'] if requester else None
        requester_role = requester['role'] if requester else None

        users = User.get_all(include_super_admin=False, school_id=school_id, requester_id=requester_id, requester_role=requester_role)
        filtered = [u.to_dict() for u in users if u.role in ('TEACHER', 'ASSISTANT')]

        # enrich with classes and courses for each teacher
        teacher_ids = [u['id'] for u in filtered]
        if teacher_ids:
            format_ids = ','.join(['%s'] * len(teacher_ids))
            conn = get_connection()
            with conn.cursor() as cursor:
                # teacher_classes (table may not exist yet)
                try:
                    cursor.execute(f"SELECT teacher_id, class_id FROM teacher_classes WHERE teacher_id IN ({format_ids})", tuple(teacher_ids))
                    tc_rows = cursor.fetchall()
                except Exception:
                    tc_rows = []

                # fetch class names
                class_ids = list({r['class_id'] for r in tc_rows})
                classes_map = {}
                if class_ids:
                    format_c = ','.join(['%s'] * len(class_ids))
                    cursor.execute(f"SELECT id, name FROM classes WHERE id IN ({format_c})", tuple(class_ids))
                    for cr in cursor.fetchall():
                        classes_map[cr['id']] = cr['name']

                teacher_classes_map = {tid: [] for tid in teacher_ids}
                for r in tc_rows:
                    teacher_classes_map[r['teacher_id']].append({'id': r['class_id'], 'name': classes_map.get(r['class_id'])})

                # courses for teachers (table may not exist yet)
                try:
                    cursor.execute(f"SELECT id, teacher_id, name, description FROM courses WHERE teacher_id IN ({format_ids})", tuple(teacher_ids))
                    course_rows = cursor.fetchall()
                except Exception:
                    course_rows = []

                course_ids = [c['id'] for c in course_rows]

                course_classes_map = {}
                if course_ids:
                    try:
                        format_cc = ','.join(['%s'] * len(course_ids))
                        cursor.execute(f"SELECT course_id, class_id FROM course_classes WHERE course_id IN ({format_cc})", tuple(course_ids))
                        cc_rows = cursor.fetchall()
                    except Exception:
                        cc_rows = []

                    # fetch class names for course classes
                    cc_class_ids = list({r['class_id'] for r in cc_rows})
                    cc_classes_map = {}
                    if cc_class_ids:
                        format_ccc = ','.join(['%s'] * len(cc_class_ids))
                        cursor.execute(f"SELECT id, name FROM classes WHERE id IN ({format_ccc})", tuple(cc_class_ids))
                        for cr in cursor.fetchall():
                            cc_classes_map[cr['id']] = cr['name']

                    for r in cc_rows:
                        course_classes_map.setdefault(r['course_id'], []).append({'id': r['class_id'], 'name': cc_classes_map.get(r['class_id'])})

                # attach courses and classes to filtered users
                courses_by_teacher = {}
                for c in course_rows:
                    courses_by_teacher.setdefault(c['teacher_id'], []).append({
                        'id': c['id'], 'name': c['name'], 'description': c.get('description'), 'classes': course_classes_map.get(c['id'], [])
                    })

                for u in filtered:
                    u['classes'] = teacher_classes_map.get(u['id'], [])
                    u['courses'] = courses_by_teacher.get(u['id'], [])

        return jsonify({'teachers': filtered}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@teachers_bp.route('/teachers/<int:teacher_id>/courses', methods=['POST'])
def create_course(teacher_id):
    """Create a course for a teacher. SCHOOL_ADMIN only.

    Accepts JSON:
      - name: string (required)
      - description: string (optional)
      - school_id: int (optional)
      - classes: int[] (optional)  -> a course can belong to multiple classes
    """
    try:
        requester = get_requester_from_auth()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        name = data.get('name')
        description = data.get('description')
        school_id = data.get('school_id')
        class_ids = data.get('classes') or []

        if not name:
            return jsonify({'error': 'Course name required'}), 400

        # ensure teacher exists and is a teacher
        teacher = User.get_by_id(teacher_id)
        if not teacher or teacher.role not in ('TEACHER', 'ASSISTANT'):
            return jsonify({'error': 'Teacher/assistant not found'}), 404

        ensure_courses_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO courses (teacher_id, school_id, name, description) VALUES (%s, %s, %s, %s)",
                (teacher_id, school_id or teacher.school_id, name, description)
            )
            conn.commit()
            course_id = cursor.lastrowid

            # attach classes (optional)
            for cid in class_ids:
                cursor.execute("INSERT IGNORE INTO course_classes (course_id, class_id) VALUES (%s, %s)", (course_id, cid))
            conn.commit()

            cursor.execute("SELECT id, teacher_id, school_id, name, description, created_at FROM courses WHERE id=%s", (course_id,))
            course = cursor.fetchone()
            cursor.execute("SELECT cc.class_id, c.name FROM course_classes cc JOIN classes c ON c.id=cc.class_id WHERE cc.course_id=%s", (course_id,))
            course['classes'] = cursor.fetchall()

        return jsonify({'course': course}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@teachers_bp.route('/teachers/<int:teacher_id>/courses', methods=['GET'])
def list_teacher_courses(teacher_id):
    """List courses for a given teacher. Allow SCHOOL_ADMIN, SECRETARY or unauthenticated reads."""
    try:
        requester = get_requester_from_auth()
        if requester is not None and requester.get('role') not in ('SCHOOL_ADMIN', 'SECRETARY'):
            return jsonify({'error': 'Unauthorized'}), 403

        ensure_courses_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, teacher_id, school_id, name, description, created_at FROM courses WHERE teacher_id=%s ORDER BY created_at DESC", (teacher_id,))
            rows = cursor.fetchall()
            for r in rows:
                cursor.execute("SELECT cc.class_id, c.name FROM course_classes cc JOIN classes c ON c.id=cc.class_id WHERE cc.course_id=%s", (r['id'],))
                r['classes'] = cursor.fetchall()
        return jsonify({'courses': rows}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@teachers_bp.route('/schools/<int:school_id>/teacher-courses', methods=['GET'])
def list_school_teacher_courses(school_id):
    """List all courses for all teachers in a school."""
    try:
        requester = get_requester_from_auth()
        allowed_roles = ('SCHOOL_ADMIN', 'SECRETARY', 'TEACHER', 'SUPER_ADMIN', 'ASSISTANT')
        if requester is not None and requester.get('role') not in allowed_roles:
            print(f"[TEACHER-COURSES] Unauthorized role: {requester.get('role')}")
            return jsonify({'error': 'Unauthorized'}), 403

        ensure_courses_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT c.id, c.teacher_id, c.school_id, c.name, c.description, c.created_at, u.name as teacher_name FROM courses c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.school_id=%s ORDER BY c.created_at DESC", (school_id,))
            rows = cursor.fetchall()
            for r in rows:
                cursor.execute("SELECT cc.class_id, c.name FROM course_classes cc JOIN classes c ON c.id=cc.class_id WHERE cc.course_id=%s", (r['id'],))
                r['classes'] = cursor.fetchall()
        return jsonify({'courses': rows}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
