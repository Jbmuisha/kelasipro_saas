from flask import Blueprint, jsonify, request
from models import School

schools_bp = Blueprint('schools', __name__)

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
            phone=data.get("phone")
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
        school = School.get_by_id(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        school.update(
            name=data.get("name"),
            email=data.get("email"),
            phone=data.get("phone")
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
        school = School.get_by_id(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        school.delete()
        print(f"[DEBUG] Deleted school ID: {school_id}")
        return jsonify({"message": "School deleted successfully"})
    except Exception as e:
        print(f"[ERROR] delete_school: {str(e)}")
        return jsonify({"error": str(e)}), 400