from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.users import users_bp
from routes.schools import schools_bp
from utils.create_super_admin import create_super_admin

app = Flask(__name__)

# ------------------- CORS -------------------
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     supports_credentials=True)

# ------------------- Super Admin -------------------
create_super_admin()

# ------------------- Blueprints -------------------
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(schools_bp, url_prefix="/api/schools")

# ------------------- Test Route -------------------
@app.route('/test')
def test_route():
    return {"message": "Backend server is working!", "status": "ok"}

if __name__ == "__main__":
    app.run(port=5000, debug=True)