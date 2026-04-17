"""
Grades module for Primaire (Primary School) in DRC.

Grading system:
- 6 periods (3trimestres) per year: deux periode par trimestre 
- Each period has: interrogations (interros) and devoirs
- Each course has a coefficient and a max score (cote)
- Grade types: 'interro', 'devoir', 'examen'
- Period average = weighted combination of interro avg and devoir avg
  (weights configurable per school, default 50/50)
- Annual average = ( T1 + T2 + T3) / 3
- Percentage = (total obtained / total possible) * 100
- Mentions: Cella depend de l'ecole 50% Suffisant, 60% Distinction, 70% Grande distinction, 80%+ Très grande distinction
- Pass threshold configurable per school (default 50%)
"""

from flask import Blueprint, request, jsonify
from db import get_connection
import traceback
import os
import jwt

grades_bp = Blueprint('grades', __name__)


def get_requester():
    """Extract requester info from JWT token, including school_type."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        requester = {
            'id': payload.get('id'),
            'role': payload.get('role'),
            'school_id': payload.get('school_id'),
            'school_type': payload.get('school_type'),
        }
        return requester
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
                repech_percentage DECIMAL(5,2) DEFAULT 45.00,
                double_percentage DECIMAL(5,2) DEFAULT 55.00,
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

        # Add new columns if they don't exist
        cursor.execute("SHOW COLUMNS FROM grade_configs LIKE 'repech_percentage'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE grade_configs ADD COLUMN repech_percentage DECIMAL(5,2) DEFAULT 45.00 AFTER pass_percentage")
        
        cursor.execute("SHOW COLUMNS FROM grade_configs LIKE 'double_percentage'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE grade_configs ADD COLUMN double_percentage DECIMAL(5,2) DEFAULT 55.00 AFTER repech_percentage")

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
        cursor.execute("SHOW COLUMNS FROM grade_configs LIKE 'school_type'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE grade_configs ADD COLUMN school_type VARCHAR(20) DEFAULT '' AFTER max_periods")
            conn.commit()

        # Bulletins submitted table - tracks when bulletins are submitted to parents/students
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bulletins_submitted (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                course_id INT,
                period INT NOT NULL,
                bulletin_data JSON,
                submitted_by INT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (student_id),
                INDEX (class_id),
                INDEX (period),
                INDEX (submitted_at),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
                FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
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
            cursor.execute("SELECT gc.*, s.school_type FROM grade_configs gc LEFT JOIN schools s ON s.id = gc.school_id WHERE gc.school_id=%s", (school_id,))
            config = cursor.fetchone()

            if not config:
                # Fetch school_type and set defaults
                cursor.execute("SELECT school_type FROM schools WHERE id=%s", (school_id,))
                school_row = cursor.fetchone()
                school_type = school_row['school_type'] if school_row else 'primaire'
                # Primary: 9 periods (P1, P2, EXAMEN per trimester)
                # Secondary: 4 periods (2 semesters with 2 periods each)
                if school_type and school_type.lower() in ('secondaire', 'secondary'):
                    max_p = 4
                else:
                    max_p = 9  # Primary default: 3 trimesters x (P1 + P2 + EXAMEN)
                config = {
                    'school_id': int(school_id),
                    'school_type': school_type,
                    'pass_percentage': 50.00,
                    'repech_percentage': 45.00,
                    'double_percentage': 55.00,
                    'interro_weight': 50.00,
                    'devoir_weight': 50.00,
                    'examen_weight': 0.00,
                    'max_periods': max_p,
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
        repech_pct = data.get('repech_percentage', 45.00)
        double_pct = data.get('double_percentage', 55.00)
        interro_w = data.get('interro_weight', 50.00)
        devoir_w = data.get('devoir_weight', 50.00)
        examen_w = data.get('examen_weight', 0.00)
        max_periods = data.get('max_periods', 9)  # Default 9 for primary

        ensure_grades_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO grade_configs (school_id, pass_percentage, repech_percentage, double_percentage, interro_weight, devoir_weight, examen_weight, max_periods)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    pass_percentage=VALUES(pass_percentage),
                    repech_percentage=VALUES(repech_percentage),
                    double_percentage=VALUES(double_percentage),
                    interro_weight=VALUES(interro_weight),
                    devoir_weight=VALUES(devoir_weight),
                    examen_weight=VALUES(examen_weight),
                    max_periods=VALUES(max_periods)
            """, (school_id, pass_pct, repech_pct, double_pct, interro_w, devoir_w, examen_w, max_periods))
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

        # Exam validation based on school type and max_periods
        conn_check = get_connection()
        with conn_check.cursor() as cursor_check:
            cursor_check.execute("SELECT s.school_type, gc.max_periods FROM schools s JOIN classes c ON c.school_id = s.id LEFT JOIN grade_configs gc ON gc.school_id = s.id WHERE c.id = %s", (class_id,))
            school = cursor_check.fetchone()
            school_type = school['school_type'] if school else None
            max_periods = school['max_periods'] if school and school.get('max_periods') else 3
            
            if grade_type == 'examen':
                if school_type and school_type.lower() in ('secondaire', 'secondary'):
                    # Secondary: exams only at end of semesters (periods 2, 4)
                    if max_periods == 4 and period not in (2, 4):
                        conn_check.close()
                        return jsonify({'error': 'Examen seulement autorisé pour les périodes S1-Examen et S2-Examen en secondaire.'}), 400
                else:
                    # Primary: 6 periods, no special examen restriction
                    # All grade types allowed in any period
                    pass
        conn_check.close()

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

        # Exam validation based on school type and max_periods
        conn_check = get_connection()
        with conn_check.cursor() as cursor_check:
            cursor_check.execute("SELECT s.school_type, gc.max_periods FROM schools s JOIN classes c ON c.school_id = s.id LEFT JOIN grade_configs gc ON gc.school_id = s.id WHERE c.id = %s", (class_id,))
            school = cursor_check.fetchone()
            school_type = school['school_type'] if school else None
            max_periods = school['max_periods'] if school and school.get('max_periods') else 3
            
            if grade_type == 'examen':
                if school_type and school_type.lower() in ('secondaire', 'secondary'):
                    # Secondary: exams only at end of semesters (periods 2, 4)
                    if max_periods == 4 and period not in (2, 4):
                        conn_check.close()
                        return jsonify({'error': 'Examen seulement autorisé pour les périodes S1-Examen et S2-Examen en secondaire.'}), 400
                else:
                    # Primary: 6 periods, no special examen restriction
                    # All grade types allowed in any period
                    pass
        conn_check.close()

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
                
                # For primary with 9 periods, if period is an exam (3, 6, 9), calculate trimester average
                is_trimester_exam = max_periods == 9 and period in (3, 6, 9)
                
                if is_trimester_exam:
                    # Calculate trimester: aggregate P1+P2+EXAMEN for the same trimester
                    if period == 3:
                        sub_periods = [1, 2, 3]  # T1
                    elif period == 6:
                        sub_periods = [4, 5, 6]  # T2
                    else:
                        sub_periods = [7, 8, 9]  # T3
                else:
                    sub_periods = [period]
                
                bulletin_courses = []
                total_obtained = 0
                total_possible = 0

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    # Get grades for all sub-periods in this trimester
                    all_interros = []
                    all_devoirs = []
                    all_examens = []
                    
                    for sp in sub_periods:
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                        """, (student_id, course_id, class_id, sp))
                        all_interros.extend(cursor.fetchall())
                        
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                        """, (student_id, course_id, class_id, sp))
                        all_devoirs.extend(cursor.fetchall())
                        
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                        """, (student_id, course_id, class_id, sp))
                        all_examens.extend(cursor.fetchall())

                    # Calculate averages
                    def calc_avg(grades_list, target_max):
                        if not grades_list:
                            return None
                        total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                        return total / len(grades_list)

                    interro_avg = calc_avg(all_interros, max_sc)
                    devoir_avg = calc_avg(all_devoirs, max_sc)
                    examen_avg = calc_avg(all_examens, max_sc)

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
                        'interro_count': len(all_interros),
                        'devoir_count': len(all_devoirs),
                        'examen_count': len(all_examens),
                    })

                percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
                mention = get_mention(percentage)
                passed = percentage >= pass_pct
                
                # Get repech and double thresholds from config
                repech_pct = float(config.get('repech_percentage', 45.00))
                double_pct = float(config.get('double_percentage', 55.00))
                decision = get_decision(percentage, pass_pct, repech_pct)

                result = {
                    'student': student,
                    'class': class_info,
                    'period': int(period),
                    'period_label': f'T{int((period-1)/3)+1}' if is_trimester_exam else int(period),
                    'type': 'period' if not is_trimester_exam else 'trimester',
                    'courses': bulletin_courses,
                    'total_obtained': round(total_obtained, 2),
                    'total_possible': round(total_possible, 2),
                    'percentage': percentage,
                    'mention': mention,
                    'passed': passed,
                    'decision': decision,
                    'repech_percentage': repech_pct,
                    'double_percentage': double_pct,
                    'pass_percentage': pass_pct,
                    'config': {
                        'interro_weight': float(config['interro_weight']),
                        'devoir_weight': float(config['devoir_weight']),
                        'examen_weight': float(config['examen_weight']),
                    }
                }

            else:
                # Annual bulletin - compute for each period then average
                # For primary with 9 periods, aggregate every 3 periods as one trimester
                period_results = []
                
                if max_periods == 9:
                    # Group periods into 3 trimesters
                    trimester_groups = [
                        [1, 2, 3],  # T1
                        [4, 5, 6],  # T2
                        [7, 8, 9]   # T3
                    ]
                    for trimester_idx, group in enumerate(trimester_groups, 1):
                        p_total_obtained = 0
                        p_total_possible = 0
                        p_courses = []

                        for course in courses:
                            course_id = course['course_id']
                            coeff = int(course['coefficient'])
                            max_sc = float(course['max_score'])

                            # Get grades from all periods in this trimester
                            all_interros = []
                            all_devoirs = []
                            all_examens = []
                            
                            for sp in group:
                                cursor.execute("""
                                    SELECT score, max_score FROM grades
                                    WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                                """, (student_id, course_id, class_id, sp))
                                all_interros.extend(cursor.fetchall())
                                
                                cursor.execute("""
                                    SELECT score, max_score FROM grades
                                    WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                                """, (student_id, course_id, class_id, sp))
                                all_devoirs.extend(cursor.fetchall())
                                
                                cursor.execute("""
                                    SELECT score, max_score FROM grades
                                    WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                                """, (student_id, course_id, class_id, sp))
                                all_examens.extend(cursor.fetchall())

                            def calc_avg(grades_list, target_max):
                                if not grades_list:
                                    return None
                                total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                                return total / len(grades_list)

                            interro_avg = calc_avg(all_interros, max_sc)
                            devoir_avg = calc_avg(all_devoirs, max_sc)
                            examen_avg = calc_avg(all_examens, max_sc)

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
                            'period': trimester_idx,
                            'period_label': f'T{trimester_idx}',
                            'type': 'trimester',
                            'courses': p_courses,
                            'total_obtained': round(p_total_obtained, 2),
                            'total_possible': round(p_total_possible, 2),
                            'percentage': p_pct,
                        })
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

                # Get decision thresholds from config
                repech_pct = float(config.get('repech_percentage', 45.00))
                double_pct = float(config.get('double_percentage', 55.00))
                decision = get_decision(annual_pct, pass_pct, repech_pct)

                result = {
                    'student': student,
                    'class': class_info,
                    'type': 'annual',
                    'periods': period_results,
                    'annual_percentage': annual_pct,
                    'annual_mention': get_mention(annual_pct),
                    'passed': annual_pct >= pass_pct,
                    'decision': decision,
                    'repech_percentage': repech_pct,
                    'double_percentage': double_pct,
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
                
                # Get decision thresholds
                repech_pct = float(config.get('repech_percentage', 45.00))
                double_pct = float(config.get('double_percentage', 55.00))
                decision = get_decision(percentage, pass_pct, repech_pct)
                
                student_results.append({
                    'student_id': student['id'],
                    'student_name': student['name'],
                    'unique_id': student.get('unique_id'),
                    'total_obtained': round(total_obtained, 2),
                    'total_possible': round(total_possible, 2),
                    'percentage': percentage,
                    'mention': get_mention(percentage),
                    'passed': percentage >= pass_pct,
                    'decision': decision,
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

def get_decision(percentage, pass_threshold=50, repêchage_threshold=45):
    """
    Return the decision based on percentage.
    
    Args:
        percentage: The student's percentage
        pass_threshold: Minimum percentage to pass (default 50)
        repêchage_threshold: Minimum percentage for repêchage (default 45)
    
    Returns:
        'Réussi' if percentage >= pass_threshold
        'Repêchage' if pass_threshold > percentage >= repêinage_threshold  
        'Échec' (Double) if percentage < repêinage_threshold
    """
    if percentage >= pass_threshold:
        return "Réussi"
    elif percentage >= repêchage_threshold:
        return "Repêchage"
    else:
        return "Échec"


# ===================== BULLETIN SUBMISSION ENDPOINTS =====================

@grades_bp.route('/grades/submit-bulletin', methods=['POST'])
def submit_bulletin():
    """Submit/publish a bulletin for a student.
    
    POST data:
    - student_id (required)
    - class_id (required)
    - period (required)
    - school_id (optional, extracted from token)
    - send_to_parent (optional, boolean - send to student's parent)
    - send_to_student (optional, boolean - send to student)
    
    This generates the bulletin, stores it, and optionally sends messages.
    """
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.get_json() or {}
        student_id = data.get('student_id')
        class_id = data.get('class_id')
        period = data.get('period')
        school_id = data.get('school_id') or requester.get('school_id')
        send_to_parent = data.get('send_to_parent', True)
        send_to_student = data.get('send_to_student', False)

        if not student_id or not class_id or not period:
            return jsonify({'error': 'student_id, class_id, and period required'}), 400

        if not school_id:
            return jsonify({'error': 'school_id required'}), 400

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
                    'max_periods': 9,
                }

            interro_weight = float(config['interro_weight']) / 100
            devoir_weight = float(config['devoir_weight']) / 100
            examen_weight = float(config['examen_weight']) / 100
            pass_pct = float(config['pass_percentage'])
            repech_pct = float(config.get('repech_percentage', 45.00))
            max_periods = int(config.get('max_periods', 9))

            # Get student info
            cursor.execute("SELECT id, name, unique_id FROM users WHERE id=%s", (student_id,))
            student = cursor.fetchone()
            if not student:
                return jsonify({'error': 'Student not found'}), 404

            # Get class info
            cursor.execute("SELECT id, name FROM classes WHERE id=%s", (class_id,))
            class_info = cursor.fetchone()

            # Determine sub-periods for trimester exams
            is_trimester_exam = max_periods == 9 and period in (3, 6, 9)
            is_annual = (period == 0)
            
            if is_annual:
                sub_periods = [3, 6, 9]  # Use exams as trimesters
                period_label = "Total Annuel"
            elif is_trimester_exam:
                if period == 3:
                    sub_periods = [1, 2, 3]  # T1
                elif period == 6:
                    sub_periods = [4, 5, 6]  # T2
                else:
                    sub_periods = [7, 8, 9]  # T3
                period_label = f"Trimestre {period//3}"
            else:
                sub_periods = [period]
                period_label = f"Période {period}"

            # Get all students in class for ranking
            cursor.execute("""
                SELECT id, name, unique_id FROM users
                WHERE role='STUDENT' AND class_id=%s
                ORDER BY name
            """, (class_id,))
            all_students = cursor.fetchall()

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

            def calc_avg(grades_list, target_max):
                if not grades_list:
                    return None
                total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                return total / len(grades_list)

            # Calculate this student's average
            total_obtained = 0
            total_possible = 0
            bulletin_courses = []

            for course in courses:
                course_id = course['course_id']
                coeff = int(course['coefficient'])
                max_sc = float(course['max_score'])

                all_interros = []
                all_devoirs = []
                all_examens = []

                for sp in sub_periods:
                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                    """, (student_id, course_id, class_id, sp))
                    all_interros.extend(cursor.fetchall())

                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                    """, (student_id, course_id, class_id, sp))
                    all_devoirs.extend(cursor.fetchall())

                    cursor.execute("""
                        SELECT score, max_score FROM grades
                        WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                    """, (student_id, course_id, class_id, sp))
                    all_examens.extend(cursor.fetchall())

                interro_avg = calc_avg(all_interros, max_sc)
                devoir_avg = calc_avg(all_devoirs, max_sc)
                examen_avg = calc_avg(all_examens, max_sc)

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
                    'course_avg': round(course_avg, 2) if course_avg is not None else None,
                })

            percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
            mention = get_mention(percentage)
            decision = get_decision(percentage, pass_pct, repech_pct)

            # Calculate rank (need to calculate for all students)
            student_rank = 1
            for other_student in all_students:
                if other_student['id'] == student_id:
                    continue
                    
                other_total = 0
                other_possible = 0

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    other_interros = []
                    other_devoirs = []
                    other_examens = []

                    for sp in sub_periods:
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                        """, (other_student['id'], course_id, class_id, sp))
                        other_interros.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                        """, (other_student['id'], course_id, class_id, sp))
                        other_devoirs.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                        """, (other_student['id'], course_id, class_id, sp))
                        other_examens.extend(cursor.fetchall())

                    other_interro_avg = calc_avg(other_interros, max_sc)
                    other_devoir_avg = calc_avg(other_devoirs, max_sc)
                    other_examen_avg = calc_avg(other_examens, max_sc)

                    parts = []
                    weights = []
                    if other_interro_avg is not None:
                        parts.append(other_interro_avg * interro_weight)
                        weights.append(interro_weight)
                    if other_devoir_avg is not None:
                        parts.append(other_devoir_avg * devoir_weight)
                        weights.append(devoir_weight)
                    if other_examen_avg is not None and examen_weight > 0:
                        parts.append(other_examen_avg * examen_weight)
                        weights.append(examen_weight)

                    if weights:
                        other_course_avg = sum(parts) / sum(weights)
                        other_points = round(other_course_avg * coeff, 2)
                        other_total += other_points
                    other_possible += max_sc * coeff

                other_pct = (other_total / other_possible) * 100 if other_possible > 0 else 0
                if other_pct > percentage:
                    student_rank += 1

            # Build bulletin data
            bulletin_data = {
                'student_id': student_id,
                'student_name': student['name'],
                'unique_id': student.get('unique_id'),
                'class_id': class_id,
                'class_name': class_info['name'] if class_info else None,
                'period': period,
                'period_label': period_label,
                'total_obtained': round(total_obtained, 2),
                'total_possible': round(total_possible, 2),
                'percentage': percentage,
                'mention': mention,
                'decision': decision,
                'rank': student_rank,
                'total_students': len(all_students),
                'courses': bulletin_courses,
            }

            # Store bulletin
            import json
            cursor.execute("""
                INSERT INTO bulletins_submitted 
                (student_id, class_id, period, bulletin_data, submitted_by)
                VALUES (%s, %s, %s, %s, %s)
            """, (student_id, class_id, period, json.dumps(bulletin_data), requester.get('id')))
            conn.commit()

            # Send messages if requested
            messages_sent = []
            if send_to_parent or send_to_student:
                # Get parent IDs for this student
                cursor.execute("""
                    SELECT parent_id FROM parent_student WHERE student_id=%s
                """, (student_id,))
                parent_rows = cursor.fetchall()
                parent_ids = [p['parent_id'] for p in parent_rows]

                # Create message content
                msg_content = f"📊 BULLETIN - {period_label}\n"
                msg_content += f"Élève: {student['name']}\n"
                msg_content += f"Classe: {class_info['name']}\n\n"
                msg_content += f"Moyenne: {percentage}%\n"
                msg_content += f"Rang: {student_rank}/{len(all_students)}\n"
                msg_content += f"Mention: {mention}\n"
                msg_content += f"Décision: {decision}\n\n"
                msg_content += "Cours:\n"
                for c in bulletin_courses:
                    if c.get('course_avg'):
                        msg_content += f"- {c['course_name']}: {c['course_avg']}/10\n"
                msg_content += f"\nTotal: {total_obtained}/{total_possible}"

                # Ensure messages table
                from messages import ensure_messages_table
                ensure_messages_table()

                # Send to student
                if send_to_student:
                    cursor.execute("""
                        INSERT INTO messages (sender_id, receiver_id, content)
                        VALUES (%s, %s, %s)
                    """, (requester.get('id'), student_id, msg_content))
                    messages_sent.append({'to': 'student', 'student_id': student_id})

                # Send to parents
                if send_to_parent and parent_ids:
                    for parent_id in parent_ids:
                        cursor.execute("""
                            INSERT INTO messages (sender_id, receiver_id, content)
                            VALUES (%s, %s, %s)
                        """, (requester.get('id'), parent_id, msg_content))
                        messages_sent.append({'to': 'parent', 'parent_id': parent_id})

                conn.commit()

            return jsonify({
                'success': True,
                'bulletin': bulletin_data,
                'messages_sent': len(messages_sent),
            }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@grades_bp.route('/grades/submit-class-bulletin', methods=['POST'])
def submit_class_bulletin():
    """Submit/publish bulletins for ALL students in a class for a given period.
    
    POST data:
    - class_id (required)
    - period (required)
    - school_id (optional, extracted from token)
    - send_to_parent (optional, boolean - send to parents)
    - send_to_student (optional, boolean - send to students)
    
    This generates and stores bulletins for all students and sends messages.
    """
    try:
        requester = get_requester()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        # Only teachers and school admins can submit class bulletins
        if requester.get('role') not in ('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'SECRETARY'):
            return jsonify({'error': 'Unauthorized - only teachers/admins can submit bulletins'}), 403

        data = request.get_json() or {}
        class_id = data.get('class_id')
        period = data.get('period')
        school_id = data.get('school_id') or requester.get('school_id')
        send_to_parent = data.get('send_to_parent', True)
        send_to_student = data.get('send_to_student', False)

        if not class_id or not period:
            return jsonify({'error': 'class_id and period required'}), 400

        if not school_id:
            return jsonify({'error': 'school_id required'}), 400

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
                    'max_periods': 9,
                }

            interro_weight = float(config['interro_weight']) / 100
            devoir_weight = float(config['devoir_weight']) / 100
            examen_weight = float(config['examen_weight']) / 100
            pass_pct = float(config['pass_percentage'])
            repech_pct = float(config.get('repech_percentage', 45.00))
            max_periods = int(config.get('max_periods', 9))

            # Get class info
            cursor.execute("SELECT id, name FROM classes WHERE id=%s", (class_id,))
            class_info = cursor.fetchone()

            # Get students in this class
            cursor.execute("""
                SELECT id, name, unique_id FROM users
                WHERE role='STUDENT' AND class_id=%s
                ORDER BY name
            """, (class_id,))
            students = cursor.fetchall()

            if not students:
                return jsonify({'error': 'No students found in this class'}), 404

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

            # Determine period label
            is_trimester_exam = max_periods == 9 and period in (3, 6, 9)
            is_annual = (period == 0)
            
            if is_annual:
                # Annual average - calculate all 3 trimesters
                sub_periods = [3, 6, 9]  # Use exam periods as trimesters
                period_label = "Total Annuel"
            elif is_trimester_exam:
                if period == 3:
                    sub_periods = [1, 2, 3]
                    period_label = "Trimestre 1"
                elif period == 6:
                    sub_periods = [4, 5, 6]
                    period_label = "Trimestre 2"
                else:
                    sub_periods = [7, 8, 9]
                    period_label = "Trimestre 3"
            else:
                sub_periods = [period]
                period_label = f"Période {period}"

            def calc_avg(grades_list, target_max):
                if not grades_list:
                    return None
                total = sum(float(g['score']) / float(g['max_score']) * target_max for g in grades_list)
                return total / len(grades_list)

            # Calculate each student's average first
            student_averages = []
            
            for student in students:
                total_obtained = 0
                total_possible = 0

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    all_interros = []
                    all_devoirs = []
                    all_examens = []

                    for sp in sub_periods:
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                        """, (student['id'], course_id, class_id, sp))
                        all_interros.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                        """, (student['id'], course_id, class_id, sp))
                        all_devoirs.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                        """, (student['id'], course_id, class_id, sp))
                        all_examens.extend(cursor.fetchall())

                    interro_avg = calc_avg(all_interros, max_sc)
                    devoir_avg = calc_avg(all_devoirs, max_sc)
                    examen_avg = calc_avg(all_examens, max_sc)

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
                        total_obtained += round(course_avg * coeff, 2)
                    total_possible += max_sc * coeff

                percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
                student_averages.append({
                    'student_id': student['id'],
                    'student_name': student['name'],
                    'unique_id': student.get('unique_id'),
                    'percentage': percentage,
                })

            # Sort by percentage to get ranks
            student_averages.sort(key=lambda x: x['percentage'], reverse=True)
            for i, sa in enumerate(student_averages):
                sa['rank'] = i + 1

            # Create rank map
            rank_map = {sa['student_id']: sa['rank'] for sa in student_averages}

            # Now generate and store each bulletin
            import json
            results = []
            total_messages = 0

            for student in students:
                student_id = student['id']
                rank = rank_map.get(student_id, 0)

                # Recalculate for detailed bulletin
                total_obtained = 0
                total_possible = 0
                bulletin_courses = []

                for course in courses:
                    course_id = course['course_id']
                    coeff = int(course['coefficient'])
                    max_sc = float(course['max_score'])

                    all_interros = []
                    all_devoirs = []
                    all_examens = []

                    for sp in sub_periods:
                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='interro'
                        """, (student_id, course_id, class_id, sp))
                        all_interros.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='devoir'
                        """, (student_id, course_id, class_id, sp))
                        all_devoirs.extend(cursor.fetchall())

                        cursor.execute("""
                            SELECT score, max_score FROM grades
                            WHERE student_id=%s AND course_id=%s AND class_id=%s AND period=%s AND grade_type='examen'
                        """, (student_id, course_id, class_id, sp))
                        all_examens.extend(cursor.fetchall())

                    interro_avg = calc_avg(all_interros, max_sc)
                    devoir_avg = calc_avg(all_devoirs, max_sc)
                    examen_avg = calc_avg(all_examens, max_sc)

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
                        total_obtained += points_obtained
                        total_possible += points_possible
                    else:
                        points_possible = max_sc * coeff
                        total_possible += points_possible

                    bulletin_courses.append({
                        'course_id': course_id,
                        'course_name': course['course_name'],
                        'coefficient': coeff,
                        'course_avg': round(course_avg, 2) if course_avg is not None else None,
                    })

                percentage = round((total_obtained / total_possible) * 100, 2) if total_possible > 0 else 0
                mention = get_mention(percentage)
                decision = get_decision(percentage, pass_pct, repech_pct)

                bulletin_data = {
                    'student_id': student_id,
                    'student_name': student['name'],
                    'unique_id': student.get('unique_id'),
                    'class_id': class_id,
                    'class_name': class_info['name'] if class_info else None,
                    'period': period,
                    'period_label': period_label,
                    'total_obtained': round(total_obtained, 2),
                    'total_possible': round(total_possible, 2),
                    'percentage': percentage,
                    'mention': mention,
                    'decision': decision,
                    'rank': rank,
                    'total_students': len(students),
                    'courses': bulletin_courses,
                }

                # Store bulletin
                cursor.execute("""
                    INSERT INTO bulletins_submitted 
                    (student_id, class_id, period, bulletin_data, submitted_by)
                    VALUES (%s, %s, %s, %s, %s)
                """, (student_id, class_id, period, json.dumps(bulletin_data), requester.get('id')))

                results.append({
                    'student_id': student_id,
                    'student_name': student['name'],
                    'rank': rank,
                    'percentage': percentage,
                })

            # Send messages
            if send_to_parent or send_to_student:
                # Ensure messages table
                from messages import ensure_messages_table
                ensure_messages_table()

                for result in results:
                    student_id = result['student_id']
                    student_name = result['student_name']
                    rank = result['rank']
                    percentage = result['percentage']

                    # Create message content
                    msg_content = f"📊 BULLETIN - {period_label}\n"
                    msg_content += f"Élève: {student_name}\n"
                    msg_content += f"Classe: {class_info['name']}\n\n"
                    msg_content += f"Moyenne: {percentage}%\n"
                    msg_content += f"Rang: {rank}/{len(students)}\n"
                    msg_content += f"Mention: {get_mention(percentage)}\n"
                    msg_content += f"Décision: {get_decision(percentage, pass_pct, repech_pct)}"

                    # Get parent IDs
                    cursor.execute("""
                        SELECT parent_id FROM parent_student WHERE student_id=%s
                    """, (student_id,))
                    parent_rows = cursor.fetchall()
                    parent_ids = [p['parent_id'] for p in parent_rows]

                    if send_to_student:
                        cursor.execute("""
                            INSERT INTO messages (sender_id, receiver_id, content)
                            VALUES (%s, %s, %s)
                        """, (requester.get('id'), student_id, msg_content))
                        total_messages += 1

                    if send_to_parent and parent_ids:
                        for parent_id in parent_ids:
                            cursor.execute("""
                                INSERT INTO messages (sender_id, receiver_id, content)
                                VALUES (%s, %s, %s)
                            """, (requester.get('id'), parent_id, msg_content))
                            total_messages += 1

            conn.commit()

            return jsonify({
                'success': True,
                'class_id': class_id,
                'period': period,
                'period_label': period_label,
                'total_students': len(students),
                'results': results,
                'messages_sent': total_messages,
            }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
