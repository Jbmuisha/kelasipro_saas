"""
Grades module for Primaire (Primary School) in DRC.

Grading system:
- 3 periods (trimestres) per year: P1, P2, P3
- Each period has: interrogations (interros) and devoirs
- Each course has a coefficient and a max score (cote)
- Grade types: 'interro', 'devoir', 'examen'
- Period average = weighted combination of interro avg and devoir avg
  (weights configurable per school, default 50/50)
- Annual average = (P1 + P2 + P3) / 3
- Percentage = (total obtained / total possible) * 100
- Mentions: 50% Suffisant, 60% Distinction, 70% Grande distinction, 80%+ Très grande distinction
- Pass threshold configurable per school (default 50%)
"""

from flask import Blueprint, request, jsonify
from db import get_connection
import traceback
import os
import jwt

grades_bp = Blueprint('grades', __name__)


def get_requester():
    """Extract requester info from JWT token."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return {
            'id': payload.get('id'),
            'role': payload.get('role'),
            'school_id': payload.get('school_id'),
        }
    except Exception:
        return None


def ensure_grades_tables():
    """Create all necessary tables for the grading system."""
    conn = get_connection()
    with conn.cursor() as cursor:
        # School grading configuration
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS grade_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                school_id INT NOT NULL,
                pass_percentage DECIMAL(5,2) DEFAULT 50.00,
                interro_weight DECIMAL(5,2) DEFAULT 50.00,
                devoir_weight DECIMAL(5,2) DEFAULT 50.00,
                examen_weight DECIMAL(5,2) DEFAULT 0.00,
                max_periods INT DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_school (school_id),
                INDEX (school_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # Course configurations (coefficient and max score per course per class)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                class_id INT NOT NULL,
                coefficient INT DEFAULT 1,
                max_score DECIMAL(5,2) DEFAULT 10.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_course_class (course_id, class_id),
                INDEX (course_id),
                INDEX (class_id),
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # Individual grades
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS grades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                course_id INT NOT NULL,
                class_id INT NOT NULL,
                period INT NOT NULL DEFAULT 1,
                grade_type ENUM('interro', 'devoir', 'examen') NOT NULL,
                score DECIMAL(5,2) NOT NULL,
                max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
                description VARCHAR(255),
                grade_date DATE,
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (student_id),
                INDEX (course_id),
                INDEX (class_id),
                INDEX (period),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

    conn.commit()


# ===================== GRADE CONFIG ENDPOINTS =====================

@grades_bp.route('/grades/config', methods=['GET'])
def get_grade_config():
    """Get grading configuration for a school."""
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        school_id = request.args.get('school_id')
        if not school_id:
            school_id = requester.get('school_id')
        if not school_id:
            return jsonify({'error': 'school_id required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM grade_configs WHERE school_id=%s", (school_id,))
            config = cursor.fetchone()

            if not config:
                # Return defaults
                config = {
                    'school_id': int(school_id),
                    'pass_percentage': 50.00,
                    'interro_weight': 50.00,
                    'devoir_weight': 50.00,
                    'examen_weight': 0.00,
                    'max_periods': 3,
                }

        # Convert Decimal to float for JSON
        for k in config:
            if hasattr(config[k], 'is_finite'):
                config[k] = float(config[k])

        return jsonify({'config': config}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/config', methods=['PUT'])
def update_grade_config():
    """Update grading configuration for a school. SCHOOL_ADMIN only."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        school_id = data.get('school_id')
        if not school_id:
            school_id = requester.get('school_id')
        if not school_id:
            return jsonify({'error': 'school_id required'}), 400

        pass_pct = data.get('pass_percentage', 50.00)
        interro_w = data.get('interro_weight', 50.00)
        devoir_w = data.get('devoir_weight', 50.00)
        examen_w = data.get('examen_weight', 0.00)
        max_periods = data.get('max_periods', 3)

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO grade_configs (school_id, pass_percentage, interro_weight, devoir_weight, examen_weight, max_periods)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    pass_percentage=VALUES(pass_percentage),
                    interro_weight=VALUES(interro_weight),
                    devoir_weight=VALUES(devoir_weight),
                    examen_weight=VALUES(examen_weight),
                    max_periods=VALUES(max_periods)
            """, (school_id, pass_pct, interro_w, devoir_w, examen_w, max_periods))
            conn.commit()

            cursor.execute("SELECT * FROM grade_configs WHERE school_id=%s", (school_id,))
            config = cursor.fetchone()

        for k in config:
            if hasattr(config[k], 'is_finite'):
                config[k] = float(config[k])

        return jsonify({'config': config}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================== COURSE CONFIG ENDPOINTS =====================

@grades_bp.route('/grades/course-config', methods=['GET'])
def get_course_configs():
    """Get course configurations (coefficient, max_score) for a class."""
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        class_id = request.args.get('class_id')
        if not class_id:
            return jsonify({'error': 'class_id required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT cc.*, c.name as course_name
                FROM course_configs cc
                JOIN courses c ON c.id = cc.course_id
                WHERE cc.class_id = %s
            """, (class_id,))
            configs = cursor.fetchall()

        for cfg in configs:
            for k in cfg:
                if hasattr(cfg[k], 'is_finite'):
                    cfg[k] = float(cfg[k])

        return jsonify({'configs': configs}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/course-config', methods=['PUT'])
def update_course_config():
    """Update course config (coefficient, max_score). SCHOOL_ADMIN or TEACHER."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        course_id = data.get('course_id')
        class_id = data.get('class_id')
        coefficient = data.get('coefficient', 1)
        max_score = data.get('max_score', 10.00)

        if not course_id or not class_id:
            return jsonify({'error': 'course_id and class_id required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO course_configs (course_id, class_id, coefficient, max_score)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    coefficient=VALUES(coefficient),
                    max_score=VALUES(max_score)
            """, (course_id, class_id, coefficient, max_score))
            conn.commit()

            cursor.execute("""
                SELECT cc.*, c.name as course_name
                FROM course_configs cc
                JOIN courses c ON c.id = cc.course_id
                WHERE cc.course_id=%s AND cc.class_id=%s
            """, (course_id, class_id))
            config = cursor.fetchone()

        for k in config:
            if hasattr(config[k], 'is_finite'):
                config[k] = float(config[k])

        return jsonify({'config': config}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/course-config/bulk', methods=['PUT'])
def bulk_update_course_configs():
    """Bulk update course configs for a class. SCHOOL_ADMIN or TEACHER."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        configs = data.get('configs', [])
        if not configs:
            return jsonify({'error': 'configs array required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            for cfg in configs:
                course_id = cfg.get('course_id')
                class_id = cfg.get('class_id')
                coefficient = cfg.get('coefficient', 1)
                max_score = cfg.get('max_score', 10.00)
                if course_id and class_id:
                    cursor.execute("""
                        INSERT INTO course_configs (course_id, class_id, coefficient, max_score)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            coefficient=VALUES(coefficient),
                            max_score=VALUES(max_score)
                    """, (course_id, class_id, coefficient, max_score))
            conn.commit()

        return jsonify({'message': f'{len(configs)} configs updated'}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================== GRADE ENTRY ENDPOINTS =====================

@grades_bp.route('/grades', methods=['POST'])
def create_grade():
    """Create a single grade entry. TEACHER or SCHOOL_ADMIN."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        student_id = data.get('student_id')
        course_id = data.get('course_id')
        class_id = data.get('class_id')
        period = data.get('period', 1)
        grade_type = data.get('grade_type')  # 'interro', 'devoir', 'examen'
        score = data.get('score')
        max_score = data.get('max_score', 10.00)
        description = data.get('description', '')
        grade_date = data.get('grade_date')

        if not all([student_id, course_id, class_id, grade_type, score is not None]):
            return jsonify({'error': 'student_id, course_id, class_id, grade_type, and score are required'}), 400

        if grade_type not in ('interro', 'devoir', 'examen'):
            return jsonify({'error': 'grade_type must be interro, devoir, or examen'}), 400

        if float(score) < 0 or float(score) > float(max_score):
            return jsonify({'error': f'Score must be between 0 and {max_score}'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO grades (student_id, course_id, class_id, period, grade_type, score, max_score, description, grade_date, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (student_id, course_id, class_id, period, grade_type, score, max_score, description, grade_date, requester['id']))
            conn.commit()
            grade_id = cursor.lastrowid

            cursor.execute("SELECT * FROM grades WHERE id=%s", (grade_id,))
            grade = cursor.fetchone()

        for k in grade:
            if hasattr(grade[k], 'is_finite'):
                grade[k] = float(grade[k])
            elif hasattr(grade[k], 'isoformat'):
                grade[k] = grade[k].isoformat()

        return jsonify({'grade': grade}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/bulk', methods=['POST'])
def create_grades_bulk():
    """Create multiple grades at once (e.g., enter grades for all students in a class for one interro).
    
    JSON body:
    {
        "course_id": int,
        "class_id": int,
        "period": int,
        "grade_type": "interro" | "devoir" | "examen",
        "max_score": float,
        "description": str,
        "grade_date": str (YYYY-MM-DD),
        "grades": [
            {"student_id": int, "score": float},
            ...
        ]
    }
    """
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        course_id = data.get('course_id')
        class_id = data.get('class_id')
        period = data.get('period', 1)
        grade_type = data.get('grade_type')
        max_score = data.get('max_score', 10.00)
        description = data.get('description', '')
        grade_date = data.get('grade_date')
        grades_list = data.get('grades', [])

        if not all([course_id, class_id, grade_type]):
            return jsonify({'error': 'course_id, class_id, and grade_type are required'}), 400

        if grade_type not in ('interro', 'devoir', 'examen'):
            return jsonify({'error': 'grade_type must be interro, devoir, or examen'}), 400

        if not grades_list:
            return jsonify({'error': 'grades array is required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        created = 0
        with conn.cursor() as cursor:
            for g in grades_list:
                student_id = g.get('student_id')
                score = g.get('score')
                if student_id is None or score is None:
                    continue
                if float(score) < 0 or float(score) > float(max_score):
                    continue

                cursor.execute("""
                    INSERT INTO grades (student_id, course_id, class_id, period, grade_type, score, max_score, description, grade_date, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (student_id, course_id, class_id, period, grade_type, score, max_score, description, grade_date, requester['id']))
                created += 1
            conn.commit()

        return jsonify({'message': f'{created} grades created', 'count': created}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/<int:grade_id>', methods=['PUT'])
def update_grade(grade_id):
    """Update a single grade."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}
        
        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM grades WHERE id=%s", (grade_id,))
            existing = cursor.fetchone()
            if not existing:
                return jsonify({'error': 'Grade not found'}), 404

            fields = []
            values = []
            for field in ['score', 'max_score', 'description', 'grade_date', 'period', 'grade_type']:
                if field in data and data[field] is not None:
                    fields.append(f"{field}=%s")
                    values.append(data[field])

            if fields:
                values.append(grade_id)
                cursor.execute(f"UPDATE grades SET {', '.join(fields)} WHERE id=%s", values)
                conn.commit()

            cursor.execute("SELECT * FROM grades WHERE id=%s", (grade_id,))
            grade = cursor.fetchone()

        for k in grade:
            if hasattr(grade[k], 'is_finite'):
                grade[k] = float(grade[k])
            elif hasattr(grade[k], 'isoformat'):
                grade[k] = grade[k].isoformat()

        return jsonify({'grade': grade}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/<int:grade_id>', methods=['DELETE'])
def delete_grade(grade_id):
    """Delete a single grade."""
    try:
        requester = get_requester()
        if not requester or requester.get('role') not in ('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'):
            return jsonify({'error': 'Unauthorized'}), 403

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM grades WHERE id=%s", (grade_id,))
            conn.commit()

        return jsonify({'message': 'Grade deleted'}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================== GRADE RETRIEVAL ENDPOINTS =====================

@grades_bp.route('/grades', methods=['GET'])
def get_grades():
    """Get grades with filters.
    
    Query params:
    - class_id (required)
    - course_id (optional)
    - student_id (optional)
    - period (optional)
    - grade_type (optional)
    """
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        class_id = request.args.get('class_id')
        course_id = request.args.get('course_id')
        student_id = request.args.get('student_id')
        period = request.args.get('period')
        grade_type = request.args.get('grade_type')

        if not class_id:
            return jsonify({'error': 'class_id required'}), 400

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            query = """
                SELECT g.*, u.name as student_name, c.name as course_name
                FROM grades g
                JOIN users u ON u.id = g.student_id
                JOIN courses c ON c.id = g.course_id
                WHERE g.class_id = %s
            """
            params = [class_id]

            if course_id:
                query += " AND g.course_id = %s"
                params.append(course_id)
            if student_id:
                query += " AND g.student_id = %s"
                params.append(student_id)
            if period:
                query += " AND g.period = %s"
                params.append(period)
            if grade_type:
                query += " AND g.grade_type = %s"
                params.append(grade_type)

            query += " ORDER BY g.grade_date DESC, g.created_at DESC"
            cursor.execute(query, tuple(params))
            grades = cursor.fetchall()

        for g in grades:
            for k in g:
                if hasattr(g[k], 'is_finite'):
                    g[k] = float(g[k])
                elif hasattr(g[k], 'isoformat'):
                    g[k] = g[k].isoformat()

        return jsonify({'grades': grades}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================== BULLETIN / REPORT CARD ENDPOINTS =====================

@grades_bp.route('/grades/bulletin', methods=['GET'])
def get_bulletin():
    """Generate a bulletin (report card) for a student.
    
    Query params:
    - student_id (required)
    - class_id (required)
    - period (optional, if not provided returns annual)
    - school_id (required for config)
    
    Returns computed averages per course, total, percentage, and mention.
    """
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        student_id = request.args.get('student_id')
        class_id = request.args.get('class_id')
        period = request.args.get('period')
        school_id = request.args.get('school_id')

        if not student_id or not class_id:
            return jsonify({'error': 'student_id and class_id required'}), 400

        if not school_id:
            school_id = requester.get('school_id')

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            # Get grade config
            cursor.execute("SELECT * FROM grade_configs WHERE school_id=%s", (school_id,))
            config = cursor.fetchone()
            if not config:
                config = {
                    'pass_percentage': 50.00,
                    'interro_weight': 50.00,
                    'devoir_weight': 50.00,
                    'examen_weight': 0.00,
                    'max_periods': 3,
                }

            interro_weight = float(config['interro_weight']) / 100
            devoir_weight = float(config['devoir_weight']) / 100
            examen_weight = float(config['examen_weight']) / 100
            pass_pct = float(config['pass_percentage'])
            max_periods = int(config['max_periods'])

            # Get student info
            cursor.execute("SELECT id, name, unique_id FROM users WHERE id=%s", (student_id,))
            student = cursor.fetchone()
            if not student:
                return jsonify({'error': 'Student not found'}), 404

            # Get class info
            cursor.execute("SELECT id, name FROM classes WHERE id=%s", (class_id,))
            class_info = cursor.fetchone()

            # Get courses for this class
            cursor.execute("""
                SELECT c.id as course_id, c.name as course_name,
                       COALESCE(cc2.coefficient, 1) as coefficient,
                       COALESCE(cc2.max_score, 10.00) as max_score
                FROM courses c
                JOIN course_classes ccl ON ccl.course_id = c.id
                LEFT JOIN course_configs cc2 ON cc2.course_id = c.id AND cc2.class_id = %s
                WHERE ccl.class_id = %s
                ORDER BY c.name
            """, (class_id, class_id))
            courses = cursor.fetchall()

            if period:
                # Single period bulletin
                bulletin_courses = []
                total_obtained = 0
                total_possible = 0

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    # Get interro grades
                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                    """, (student_id, course_id, class_id, period))
                    interros = cursor.fetchall()

                    # Get devoir grades
                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                    """, (student_id, course_id, class_id, period))
                    devoirs = cursor.fetchall()

                    # Get examen grades
                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                    """, (student_id, course_id, class_id, period))
                    examens = cursor.fetchall()

                    # Calculate averages (normalized to max_score)
                    def calc_avg(grades_list, target_max):
                        if not grades_list:
                            return None
                        total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                        return total / len(grades_list)

                    interro_avg = calc_avg(interros, max_sc)
                    devoir_avg = calc_avg(devoirs, max_sc)
                    examen_avg = calc_avg(examens, max_sc)

                    # Period average for this course
                    parts = []
                    weights = []
                    if interro_avg is not None:
                        parts.append(interro_avg * interro_weight)
                        weights.append(interro_weight)
                    if devoir_avg is not None:
                        parts.append(devoir_avg * devoir_weight)
                        weights.append(devoir_weight)
                    if examen_avg is not None and examen_weight > 0:
                        parts.append(examen_avg * examen_weight)
                        weights.append(examen_weight)

                    if weights:
                        course_avg = sum(parts) / sum(weights)
                    else:
                        course_avg = None

                    # Points with coefficient
                    if course_avg is not None:
                        points_obtained = round(course_avg * coeff, 2)
                        points_possible = max_sc * coeff
                        total_obtained += points_obtained
                        total_possible += points_possible
                    else:
                        points_obtained = None
                        points_possible = max_sc * coeff
                        total_possible += points_possible

                    bulletin_courses.append({
                        'course_id': course_id,
                        'course_name': course['course_name'],
                        'coefficient': coeff,
                        'max_score': max_sc,
                        'interro_avg': round(interro_avg, 2) if interro_avg is not None else None,
                        'devoir_avg': round(devoir_avg, 2) if devoir_avg is not None else None,
                        'examen_avg': round(examen_avg, 2) if examen_avg is not None else None,
                        'course_avg': round(course_avg, 2) if course_avg is not None else None,
                        'points_obtained': points_obtained,
                        'points_possible': points_possible,
                        'interro_count': len(interros),
                        'devoir_count': len(devoirs),
                        'examen_count': len(examens),
                    })

                percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
                mention = get_mention(percentage)
                passed = percentage >= pass_pct

                result = {
                    'student': student,
                    'class': class_info,
                    'period': int(period),
                    'type': 'period',
                    'courses': bulletin_courses,
                    'total_obtained': round(total_obtained, 2),
                    'total_possible': round(total_possible, 2),
                    'percentage': percentage,
                    'mention': mention,
                    'passed': passed,
                    'pass_percentage': pass_pct,
                    'config': {
                        'interro_weight': float(config['interro_weight']),
                        'devoir_weight': float(config['devoir_weight']),
                        'examen_weight': float(config['examen_weight']),
                    }
                }

            else:
                # Annual bulletin - compute for each period then average
                period_results = []
                for p in range(1, max_periods + 1):
                    p_total_obtained = 0
                    p_total_possible = 0
                    p_courses = []

                    for course in courses:
                        course_id = course['course_id']
                        coeff = int(course['coefficient'])
                        max_sc = float(course['max_score'])

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                        """, (student_id, course_id, class_id, p))
                        interros = cursor.fetchall()

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                        """, (student_id, course_id, class_id, p))
                        devoirs = cursor.fetchall()

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                        """, (student_id, course_id, class_id, p))
                        examens = cursor.fetchall()

                        def calc_avg(grades_list, target_max):
                            if not grades_list:
                                return None
                            total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                            return total / len(grades_list)

                        interro_avg = calc_avg(interros, max_sc)
                        devoir_avg = calc_avg(devoirs, max_sc)
                        examen_avg = calc_avg(examens, max_sc)

                        parts = []
                        weights = []
                        if interro_avg is not None:
                            parts.append(interro_avg * interro_weight)
                            weights.append(interro_weight)
                        if devoir_avg is not None:
                            parts.append(devoir_avg * devoir_weight)
                            weights.append(devoir_weight)
                        if examen_avg is not None and examen_weight > 0:
                            parts.append(examen_avg * examen_weight)
                            weights.append(examen_weight)

                        if weights:
                            course_avg = sum(parts) / sum(weights)
                        else:
                            course_avg = None

                        if course_avg is not None:
                            points_obtained = round(course_avg * coeff, 2)
                            points_possible = max_sc * coeff
                            p_total_obtained += points_obtained
                            p_total_possible += points_possible
                        else:
                            points_possible = max_sc * coeff
                            p_total_possible += points_possible
                            points_obtained = None

                        p_courses.append({
                            'course_id': course_id,
                            'course_name': course['course_name'],
                            'coefficient': coeff,
                            'max_score': max_sc,
                            'course_avg': round(course_avg, 2) if course_avg is not None else None,
                            'points_obtained': points_obtained,
                            'points_possible': points_possible,
                        })

                    p_pct = round((p_total_obtained / p_total_possible) * 100, 2) if p_total_possible > 0 else 0
                    period_results.append({
                        'period': p,
                        'courses': p_courses,
                        'total_obtained': round(p_total_obtained, 2),
                        'total_possible': round(p_total_possible, 2),
                        'percentage': p_pct,
                        'mention': get_mention(p_pct),
                    })

                # Annual average
                valid_periods = [pr for pr in period_results if pr['total_obtained'] > 0]
                if valid_periods:
                    annual_pct = round(sum(pr['percentage'] for pr in valid_periods) / len(valid_periods), 2)
                else:
                    annual_pct = 0

                result = {
                    'student': student,
                    'class': class_info,
                    'type': 'annual',
                    'periods': period_results,
                    'annual_percentage': annual_pct,
                    'annual_mention': get_mention(annual_pct),
                    'passed': annual_pct >= pass_pct,
                    'pass_percentage': pass_pct,
                }

        return jsonify({'bulletin': result}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/class-summary', methods=['GET'])
def get_class_summary():
    """Get a summary of all students' grades for a class/period.
    
    Query params:
    - class_id (required)
    - period (required)
    - school_id (required)
    
    Returns a ranked list of students with their totals and percentages.
    """
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        class_id = request.args.get('class_id')
        period = request.args.get('period')
        school_id = request.args.get('school_id')

        if not class_id or not period:
            return jsonify({'error': 'class_id and period required'}), 400

        if not school_id:
            school_id = requester.get('school_id')

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            # Get config
            cursor.execute("SELECT * FROM grade_configs WHERE school_id=%s", (school_id,))
            config = cursor.fetchone()
            if not config:
                config = {
                    'pass_percentage': 50.00,
                    'interro_weight': 50.00,
                    'devoir_weight': 50.00,
                    'examen_weight': 0.00,
                }

            interro_weight = float(config['interro_weight']) / 100
            devoir_weight = float(config['devoir_weight']) / 100
            examen_weight = float(config['examen_weight']) / 100
            pass_pct = float(config['pass_percentage'])

            # Get students in this class
            cursor.execute("""
                SELECT id, name, unique_id FROM users
                WHERE role='STUDENT' AND class_id=%s
                ORDER BY name
            """, (class_id,))
            students = cursor.fetchall()

            # Get courses for this class
            cursor.execute("""
                SELECT c.id as course_id, c.name as course_name,
                       COALESCE(cc2.coefficient, 1) as coefficient,
                       COALESCE(cc2.max_score, 10.00) as max_score
                FROM courses c
                JOIN course_classes ccl ON ccl.course_id = c.id
                LEFT JOIN course_configs cc2 ON cc2.course_id = c.id AND cc2.class_id = %s
                WHERE ccl.class_id = %s
                ORDER BY c.name
            """, (class_id, class_id))
            courses = cursor.fetchall()

            # Calculate for each student
            student_results = []
            for student in students:
                total_obtained = 0
                total_possible = 0

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                    """, (student['id'], course_id, class_id, period))
                    interros = cursor.fetchall()

                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                    """, (student['id'], course_id, class_id, period))
                    devoirs = cursor.fetchall()

                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                    """, (student['id'], course_id, class_id, period))
                    examens = cursor.fetchall()

                    def calc_avg(grades_list, target_max):
                        if not grades_list:
                            return None
                        total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                        return total / len(grades_list)

                    interro_avg = calc_avg(interros, max_sc)
                    devoir_avg = calc_avg(devoirs, max_sc)
                    examen_avg = calc_avg(examens, max_sc)

                    parts = []
                    weights = []
                    if interro_avg is not None:
                        parts.append(interro_avg * interro_weight)
                        weights.append(interro_weight)
                    if devoir_avg is not None:
                        parts.append(devoir_avg * devoir_weight)
                        weights.append(devoir_weight)
                    if examen_avg is not None and examen_weight > 0:
                        parts.append(examen_avg * examen_weight)
                        weights.append(examen_weight)

                    if weights:
                        course_avg = sum(parts) / sum(weights)
                        points_obtained = round(course_avg * coeff, 2)
                        total_obtained += points_obtained
                    
                    total_possible += max_sc * coeff

                percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
                student_results.append({
                    'student_id': student['id'],
                    'student_name': student['name'],
                    'unique_id': student.get('unique_id'),
                    'total_obtained': round(total_obtained, 2),
                    'total_possible': round(total_possible, 2),
                    'percentage': percentage,
                    'mention': get_mention(percentage),
                    'passed': percentage >= pass_pct,
                })

            # Sort by percentage descending and add rank
            student_results.sort(key=lambda x: x['percentage'], reverse=True)
            for i, sr in enumerate(student_results):
                sr['rank'] = i + 1

        return jsonify({
            'class_id': int(class_id),
            'period': int(period),
            'students': student_results,
            'total_students': len(student_results),
            'passed_count': sum(1 for s in student_results if s['passed']),
            'failed_count': sum(1 for s in student_results if not s['passed']),
            'pass_percentage': pass_pct,
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def get_mention(percentage):
    """Return the mention based on percentage (DRC system)."""
    if percentage >= 80:
        return "Très Grande Distinction"
    elif percentage >= 70:
        return "Grande Distinction"
    elif percentage >= 60:
        return "Distinction"
    elif percentage >= 50:
        return "Suffisant"
    else:
        return "Insuffisant"
