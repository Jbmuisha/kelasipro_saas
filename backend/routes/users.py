from flask import Blueprint, jsonify, request
from models import User

users_bp = Blueprint('users', __name__)

# ================= GET ALL USERS =================
@users_bp.route("/", methods=["GET"])
def get_users():
    try:
        users = User.get_all()  # Returns list of User instances
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
        user = User.create(
            name=data.get("name"),
            email=data.get("email"),
            password=data.get("password"),
            role=data.get("role", "TEACHER"),
            school_id=data.get("school_id")
        )
        
        # Handle profile image if provided
        if "profile_image" in data and data["profile_image"]:
            user.update(profile_image=data["profile_image"])
            # Fetch the updated user to include the profile_image
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

        user.update(
            name=data.get("name"),
            email=data.get("email"),
            role=data.get("role"),
            password=data.get("password"),
            school_id=data.get("school_id"),
            profile_image=data.get("profile_image")
        )
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