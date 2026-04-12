from flask import Blueprint, jsonify, request
from models import School
from db import get_connection
import os, jwt

schools_bp = Blueprint('schools', __name__)


def get_requester_from_auth():
    """Include school_type from JWT."""
    auth_header = request.headers.get('Authorization')
    print(f"[DEBUG] Auth header: {auth_header[:50] if auth_header else 'None'}")
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        print(f"[DEBUG] Decoded JWT payload: {payload}")
        return {
            'id': payload.get('id'),
            'role': payload.get('role'),
            'school_id': payload.get('school_id'),
            'school_type': payload.get('school_type')
        }
    except Exception as e:
        print(f"[ERROR] JWT decode failed: {e}")
        return None

# ================= GET ALL SCHOOLS =================
@schools_bp.route("/", methods=["GET"])
def get_schools():
    try:
        schools = School.get_all()  # Returns list of School instances
        print(f"[DEBUG] Fetched {len(schools)} schools")  # Debug
        schools_json = [school.to_dict() for school in schools]
        return jsonify({"schools": schools_json})
    except Exception as e:
        print(f"[ERROR] get_schools: {str(e)}")
        return jsonify({"error": str(e), "schools": []}), 500

@schools_bp.route("", methods=["GET"])
def get_schools_no_slash():
    try:
        schools = School.get_all()  # Returns list of School instances
        print(f"[DEBUG] Fetched {len(schools)} schools")  # Debug
        schools_json = [school.to_dict() for school in schools]
        return jsonify({"schools": schools_json})
    except Exception as e:
        print(f"[ERROR] get_schools: {str(e)}")
        return jsonify({"error": str(e), "schools": []}), 500

# ================= GET SCHOOL BY ID =================
@schools_bp.route("/<int:school_id>", methods=["GET"])
def get_school(school_id):
    try:
        school = School.get_by_id(school_id)
        if school:
            return jsonify(school.to_dict())
        return jsonify({"error": "School not found"}), 404
    except Exception as e:
        print(f"[ERROR] get_school: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ================= CREATE SCHOOL =================
@schools_bp.route("/", methods=["POST"])
def create_school():
    data = request.json
    try:
        school = School.create(
        name=data.get("name"),
        email=data.get("email"),
        phone=data.get("phone"),
        password=data.get("password"),
        school_type=data.get("school_type")
        )
        print(f"[DEBUG] Created school: {school.to_dict()}")
        return jsonify(school.to_dict())
    except Exception as e:
        print(f"[ERROR] create_school: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ================= UPDATE SCHOOL =================
@schools_bp.route("/<int:school_id>", methods=["PUT"])
def update_school(school_id):
    data = request.json
    try:
        requester = get_requester_from_auth()
        if not requester or requester.get('role') != 'SCHOOL_ADMIN':
            return jsonify({"error": "Unauthorized"}), 403
        if str(requester.get('school_id')) != str(school_id):
            return jsonify({"error": "Unauthorized"}), 403

        school = School.get_by_id(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        school.update(
        name=data.get("name"),
        email=data.get("email"),
        phone=data.get("phone"),
        password=data.get("password"),
        school_type=data.get("school_type")
        )
        updated = School.get_by_id(school_id)
        print(f"[DEBUG] Updated school: {updated.to_dict()}")
        return jsonify(updated.to_dict())
    except Exception as e:
        print(f"[ERROR] update_school: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ================= DELETE SCHOOL =================
@schools_bp.route("/<int:school_id>", methods=["DELETE"])
def delete_school(school_id):
    try:
        print(f"[DEBUG] DELETE school {school_id} attempt")
        requester = get_requester_from_auth()
        print(f"[DEBUG] Requester role: {requester.get('role') if requester else 'None'}")
        if not requester or requester.get('role') != 'SUPER_ADMIN':
            print(f"[DEBUG] Access denied for role: {requester.get('role') if requester else 'None'}")
            return jsonify({"error": f"Only SUPER_ADMIN can delete schools (got: {requester.get('role') if requester else 'No token'})"}), 403
            
        school = School.get_by_id(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        from db import get_connection
        import os
        import glob
        conn = get_connection()
        with conn.cursor() as cursor:

            # Delete schedules and attendance first (depend on school_id directly)
            # Schedules/attendance use class_id, safe after classes deleted
            # Skip direct school_id deletes as they FK to classes/users
            
            # Delete messages (user FKs will cascade if set)
            # Messages table may not have school_id; skip if users deleted first
            cursor.execute("DELETE FROM user_online_status WHERE user_id IN (SELECT id FROM users WHERE school_id = %s OR school_id IS NULL)", (school_id,))
            cursor.execute("DELETE FROM user_online_status WHERE user_id IN (SELECT id FROM users WHERE school_id = %s OR school_id IS NULL)", (school_id,))
            
            # Delete grades configs
            # Grade configs safe after schools
            # Course configs FK to classes/courses, safe
            
            cursor.execute("DELETE FROM parent_student WHERE parent_id IN (SELECT id FROM users WHERE school_id = %s OR school_id IS NULL) OR student_id IN (SELECT id FROM users WHERE school_id = %s OR school_id IS NULL)", (school_id, school_id))
            cursor.execute("DELETE FROM course_classes WHERE class_id IN (SELECT id FROM classes WHERE school_id = %s OR school_id IS NULL)", (school_id,))
            cursor.execute("DELETE FROM teacher_classes WHERE class_id IN (SELECT id FROM classes WHERE school_id = %s OR school_id IS NULL)", (school_id,))
            cursor.execute("DELETE FROM school_users WHERE school_id = %s", (school_id,))
            cursor.execute("DELETE FROM grades WHERE class_id IN (SELECT id FROM classes WHERE school_id = %s OR school_id IS NULL)", (school_id,))
            cursor.execute("DELETE FROM courses WHERE school_id = %s OR school_id IS NULL", (school_id,))
            cursor.execute("DELETE FROM classes WHERE school_id = %s OR school_id IS NULL", (school_id,))
            cursor.execute("DELETE FROM users WHERE school_id = %s OR school_id IS NULL", (school_id,))
            
            # Get deleted user IDs for profile cleanup
            cursor.execute("SELECT id FROM users WHERE school_id = %s OR school_id IS NULL", (school_id,))
            user_ids = [row['id'] for row in cursor.fetchall()]
            
            cursor.execute("DELETE FROM schools WHERE id = %s", (school_id,))
            conn.commit()
            
            # Clean profile images
            uploads_dir = "backend/uploads/profile_images"
            for user_id in user_ids:
                pattern = os.path.join(uploads_dir, f"{user_id}.*")
                for img_file in glob.glob(pattern):
                    try:
                        os.remove(img_file)
                        print(f"[DEBUG] Deleted {img_file}")
                    except Exception as e:
                        print(f"[WARN] Could not delete {img_file}: {e}")
            
            print(f"[DEBUG] Deleted school {school_id} + all cascade data ({len(user_ids)} users, images cleaned)")
        
        return jsonify({"message": "School and all related data deleted successfully"})
    except Exception as e:
        print(f"[ERROR] delete_school: {str(e)}")
        return jsonify({"error": str(e)}), 400
