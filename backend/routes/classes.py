from flask import Blueprint, jsonify, request
from models import ClassModel

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
    
    if not school_id or not name:
        return jsonify({"error": "school_id and name are required"}), 400
        
    try:
        new_class = ClassModel.create(school_id, name)
        return jsonify(new_class.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
