from flask import Blueprint, request, jsonify
from db import get_connection
import traceback

schedules_bp = Blueprint('schedules', __name__)


def _ensure_tables():
    """Create schedule and attendance tables if they don't exist."""
    conn = get_connection()
    with conn.cursor() as cursor:
        # Schedule: each row = one time-slot for a course in a class on a given day
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                school_id INT NOT NULL,
                class_id INT NOT NULL,
                course_id INT NULL,
                teacher_id INT NULL,
                day_of_week TINYINT NOT NULL COMMENT '1=Mon,2=Tue,...,7=Sun',
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                course_name VARCHAR(255) NULL COMMENT 'fallback if no course_id',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (school_id),
                INDEX (class_id),
                INDEX (teacher_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # Attendance: each row = one student's presence for a given date
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                school_id INT NOT NULL,
                class_id INT NOT NULL,
                student_id INT NOT NULL,
                date DATE NOT NULL,
                status ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present',
                marked_by INT NULL COMMENT 'teacher who marked',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_student_date (student_id, date),
                INDEX (school_id),
                INDEX (class_id),
                INDEX (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
    conn.commit()


def _get_requester():
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
        return {'id': payload.get('id'), 'role': payload.get('role'), 'school_id': payload.get('school_id')}
    except Exception:
        return None


# =====================================================================
#  SCHEDULE ENDPOINTS
# =====================================================================

@schedules_bp.route('/schedules', methods=['GET'])
def get_schedules():
    """Get schedules for a class or teacher.
    Query params: class_id (required) OR teacher_id
    """
    try:
        _ensure_tables()
        class_id = request.args.get('class_id')
        teacher_id = request.args.get('teacher_id')
        school_id = request.args.get('school_id')

        conn = get_connection()
        with conn.cursor() as cursor:
            if teacher_id:
                cursor.execute("""
                    SELECT s.*, c.name as class_name,
                           co.name as linked_course_name,
                           u.name as teacher_name
                    FROM schedules s
                    LEFT JOIN classes c ON c.id = s.class_id
                    LEFT JOIN courses co ON co.id = s.course_id
                    LEFT JOIN users u ON u.id = s.teacher_id
                    WHERE s.teacher_id = %s
                    ORDER BY s.day_of_week, s.start_time
                """, (teacher_id,))
            elif class_id:
                cursor.execute("""
                    SELECT s.*, c.name as class_name,
                           co.name as linked_course_name,
                           u.name as teacher_name
                    FROM schedules s
                    LEFT JOIN classes c ON c.id = s.class_id
                    LEFT JOIN courses co ON co.id = s.course_id
                    LEFT JOIN users u ON u.id = s.teacher_id
                    WHERE s.class_id = %s
                    ORDER BY s.day_of_week, s.start_time
                """, (class_id,))
            elif school_id:
                cursor.execute("""
                    SELECT s.*, c.name as class_name,
                           co.name as linked_course_name,
                           u.name as teacher_name
                    FROM schedules s
                    LEFT JOIN classes c ON c.id = s.class_id
                    LEFT JOIN courses co ON co.id = s.course_id
                    LEFT JOIN users u ON u.id = s.teacher_id
                    WHERE s.school_id = %s
                    ORDER BY s.class_id, s.day_of_week, s.start_time
                """, (school_id,))
            else:
                return jsonify({'error': 'class_id, teacher_id or school_id required'}), 400

            rows = cursor.fetchall()
            # Convert time objects to strings
            for r in rows:
                if r.get('start_time'):
                    r['start_time'] = str(r['start_time'])
                if r.get('end_time'):
                    r['end_time'] = str(r['end_time'])
                if r.get('created_at'):
                    r['created_at'] = r['created_at'].isoformat() if hasattr(r['created_at'], 'isoformat') else str(r['created_at'])
                # Use linked_course_name if available, else fallback to course_name
                r['display_course_name'] = r.get('linked_course_name') or r.get('course_name') or ''

        return jsonify({'schedules': rows}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/schedules', methods=['POST'])
def create_schedule():
    """Create a schedule entry. SCHOOL_ADMIN only.
    JSON: school_id, class_id, course_id (optional), teacher_id (optional),
          day_of_week (1-7), start_time, end_time, course_name (optional fallback)
    """
    try:
        requester = _get_requester()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        _ensure_tables()
        data = request.get_json() or {}
        school_id = data.get('school_id')
        class_id = data.get('class_id')
        course_id = data.get('course_id')
        teacher_id = data.get('teacher_id')
        day_of_week = data.get('day_of_week')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        course_name = data.get('course_name')

        if not school_id or not class_id or not day_of_week or not start_time or not end_time:
            return jsonify({'error': 'school_id, class_id, day_of_week, start_time and end_time are required'}), 400

        if not (1 <= int(day_of_week) <= 7):
            return jsonify({'error': 'day_of_week must be 1-7 (Mon-Sun)'}), 400

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO schedules (school_id, class_id, course_id, teacher_id, day_of_week, start_time, end_time, course_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (school_id, class_id, course_id, teacher_id, day_of_week, start_time, end_time, course_name))
            conn.commit()
            new_id = cursor.lastrowid

        return jsonify({'message': 'Schedule created', 'id': new_id}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """Delete a schedule entry. SCHOOL_ADMIN only."""
    try:
        requester = _get_requester()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({'error': 'Unauthorized'}), 403

        _ensure_tables()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM schedules WHERE id=%s", (schedule_id,))
            conn.commit()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# =====================================================================
#  ATTENDANCE ENDPOINTS
# =====================================================================

@schedules_bp.route('/attendance', methods=['GET'])
def get_attendance():
    """Get attendance for a class on a date.
    Query params: class_id (required), date (YYYY-MM-DD, required)
    """
    try:
        _ensure_tables()
        class_id = request.args.get('class_id')
        date = request.args.get('date')

        if not class_id or not date:
            return jsonify({'error': 'class_id and date are required'}), 400

        conn = get_connection()
        with conn.cursor() as cursor:
            # Get all students in this class
            cursor.execute("""
                SELECT id, name, email, unique_id, profile_image
                FROM users
                WHERE class_id = %s AND role = 'STUDENT'
                ORDER BY name
            """, (class_id,))
            students = cursor.fetchall()

            # Get attendance records for this date
            cursor.execute("""
                SELECT student_id, status
                FROM attendance
                WHERE class_id = %s AND date = %s
            """, (class_id, date))
            records = {r['student_id']: r['status'] for r in cursor.fetchall()}

            # Merge
            result = []
            for s in students:
                result.append({
                    'id': s['id'],
                    'name': s['name'],
                    'email': s.get('email'),
                    'unique_id': s.get('unique_id'),
                    'profile_image': s.get('profile_image'),
                    'status': records.get(s['id'], None),  # None = not yet marked
                })

        return jsonify({'students': result, 'date': date, 'class_id': int(class_id)}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/attendance', methods=['POST'])
def save_attendance():
    """Save/update attendance for multiple students. TEACHER or SCHOOL_ADMIN.
    JSON: school_id, class_id, date, records: [{student_id, status}]
    """
    try:
        requester = _get_requester()
        if not requester or requester.get('role') not in ('TEACHER', 'SCHOOL_ADMIN', 'ASSISTANT'):
            return jsonify({'error': 'Unauthorized'}), 403

        _ensure_tables()
        data = request.get_json() or {}
        school_id = data.get('school_id')
        class_id = data.get('class_id')
        date = data.get('date')
        records = data.get('records') or []

        if not school_id or not class_id or not date or not records:
            return jsonify({'error': 'school_id, class_id, date and records are required'}), 400

        conn = get_connection()
        with conn.cursor() as cursor:
            for rec in records:
                student_id = rec.get('student_id')
                status = rec.get('status', 'present')
                if not student_id:
                    continue
                # Upsert
                cursor.execute("""
                    INSERT INTO attendance (school_id, class_id, student_id, date, status, marked_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)
                """, (school_id, class_id, student_id, date, status, requester['id']))
            conn.commit()

        return jsonify({'message': f'Attendance saved for {len(records)} student(s)'}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/attendance/student/<int:student_id>', methods=['GET'])
def get_student_attendance(student_id):
    """Get attendance history for a specific student.
    Any authenticated user can query (parent checks are done client-side via children list).
    Query params: limit (default 30)
    """
    try:
        _ensure_tables()
        limit = request.args.get('limit', 30, type=int)

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.date, a.status, a.created_at, c.name as class_name
                FROM attendance a
                LEFT JOIN classes c ON c.id = a.class_id
                WHERE a.student_id = %s
                ORDER BY a.date DESC
                LIMIT %s
            """, (student_id, limit))
            rows = cursor.fetchall()
            for r in rows:
                if r.get('date'):
                    r['date'] = str(r['date'])
                if r.get('created_at'):
                    r['created_at'] = r['created_at'].isoformat() if hasattr(r['created_at'], 'isoformat') else str(r['created_at'])

            # Also get today's status specifically
            from datetime import date as date_type
            today = date_type.today().isoformat()
            cursor.execute("""
                SELECT status FROM attendance
                WHERE student_id = %s AND date = %s
            """, (student_id, today))
            today_row = cursor.fetchone()
            today_status = today_row['status'] if today_row else None

        return jsonify({
            'student_id': student_id,
            'today': today,
            'today_status': today_status,
            'records': rows,
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/attendance/summary', methods=['GET'])
def attendance_summary():
    """Get attendance summary for a class over a date range.
    Query params: class_id, start_date, end_date
    """
    try:
        _ensure_tables()
        class_id = request.args.get('class_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not class_id:
            return jsonify({'error': 'class_id required'}), 400

        conn = get_connection()
        with conn.cursor() as cursor:
            query = """
                SELECT student_id, status, COUNT(*) as cnt
                FROM attendance
                WHERE class_id = %s
            """
            params = [class_id]
            if start_date:
                query += " AND date >= %s"
                params.append(start_date)
            if end_date:
                query += " AND date <= %s"
                params.append(end_date)
            query += " GROUP BY student_id, status"
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

        # Pivot: {student_id: {present: X, absent: Y, ...}}
        summary = {}
        for r in rows:
            sid = r['student_id']
            if sid not in summary:
                summary[sid] = {'present': 0, 'absent': 0, 'late': 0, 'excused': 0}
            summary[sid][r['status']] = r['cnt']

        return jsonify({'summary': summary}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
