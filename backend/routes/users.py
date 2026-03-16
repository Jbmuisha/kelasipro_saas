from flask import Blueprint, jsonify, request
from models import User

users_bp = Blueprint('users', __name__)

# ================= GET ALL USERS =================
@users_bp.route("/", methods=["GET"])
def get_users():
    try:
        school_id = request.args.get("school_id")
        requester_id = request.args.get("requester_id")
        requester_role = request.args.get("requester_role")
        users = User.get_all(school_id=school_id, requester_id=requester_id, requester_role=requester_role)  # Returns list of User instances
        print(f"[DEBUG] Fetched {len(users)} users")  # Debug
        users_json = [user.to_dict() for user in users]
        return jsonify({"users": users_json})
    except Exception as e:
        print(f"[ERROR] get_users: {str(e)}")
        return jsonify({"error": str(e), "users": []}), 500

# ================= GET USER BY ID =================
@users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    try:
        user = User.get_by_id(user_id)
        if user:
            return jsonify(user.to_dict())
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print(f"[ERROR] get_user: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ================= CREATE USER =================
@users_bp.route("/", methods=["POST"])
def create_user():
    data = request.json
    try:
        requester_id = data.get("requester_id")
        user = User.create(
            name=data.get("name"),
            email=data.get("email"),
            password=data.get("password"),
            role=data.get("role", "TEACHER"),
            school_id=data.get("school_id"),
            class_id=data.get("class_id"),
            created_by=requester_id
        )
        
        update_args = {}
        if "profile_image" in data and data["profile_image"]:
            update_args["profile_image"] = data["profile_image"]
        if user.role == "PARENT" and "children_ids" in data:
            update_args["children_ids"] = data["children_ids"]
            
        if update_args:
            user.update(**update_args)
            user = User.get_by_id(user.id)
        
        print(f"[DEBUG] Created user: {user.to_dict()}")
        return jsonify(user.to_dict())
    except Exception as e:
        print(f"[ERROR] create_user: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ================= UPDATE USER =================
@users_bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    data = request.json
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        update_args = {
            "name": data.get("name"),
            "email": data.get("email"),
            "role": data.get("role"),
            "password": data.get("password"),
            "school_id": data.get("school_id"),
            "profile_image": data.get("profile_image")
        }
        
        if "class_id" in data:
            update_args["class_id"] = data["class_id"]
        if user.role == "PARENT" and "children_ids" in data:
            update_args["children_ids"] = data["children_ids"]

        user.update(**update_args)
        updated = User.get_by_id(user_id)
        print(f"[DEBUG] Updated user: {updated.to_dict()}")
        return jsonify(updated.to_dict())
    except Exception as e:
        print(f"[ERROR] update_user: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ================= DELETE USER =================
@users_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.delete()
        print(f"[DEBUG] Deleted user ID: {user_id}")
        return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        print(f"[ERROR] delete_user: {str(e)}")
        return jsonify({"error": str(e)}), 400