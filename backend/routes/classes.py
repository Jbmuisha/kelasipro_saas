from flask import Blueprint, jsonify, request
from models import ClassModel, User, School, get_allowed_class_names
import re

classes_bp = Blueprint('classes', __name__)

@classes_bp.route("/", methods=["GET"]) 
def get_classes():
    school_id = request.args.get("school_id")
    if not school_id:
        return jsonify({"error": "school_id is required"}), 400
    try:
        classes = ClassModel.get_by_school(school_id)
        return jsonify({"classes": [c.to_dict() for c in classes]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@classes_bp.route("/", methods=["POST"]) 
def create_class():
    data = request.json
    school_id = data.get("school_id")
    name = data.get("name")
    created_by = data.get("created_by")

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

        new_class = ClassModel.create(school_id, name)
        return jsonify(new_class.to_dict()), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
