from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.users import users_bp
from routes.schools import schools_bp
from routes.classes import classes_bp
from routes.teachers import teachers_bp, ensure_courses_table
from routes.courses import courses_bp
from routes.messages import messages_bp
from utils.create_super_admin import create_super_admin
from routes.uploads import uploads_bp

app = Flask(__name__)

# ------------------- CORS -------------------
# Allow all /api/* routes including file uploads.
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
)

# ------------------- Super Admin -------------------
create_super_admin()

# ------------------- Ensure DB migrations -------------------
def ensure_school_type_column():
    from db import get_connection as _get_conn
    # Try modern ALTER TABLE ... IF NOT EXISTS first (MySQL 8+)
    try:
        conn = _get_conn()
        with conn.cursor() as cursor:
            # MySQL doesn't support "ADD COLUMN IF NOT EXISTS" in many versions.
            # We do a safe check + add.
            cursor.execute("SHOW COLUMNS FROM schools LIKE 'school_type'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE schools ADD COLUMN school_type VARCHAR(50) NULL")
                conn.commit()

            cursor.execute("SHOW COLUMNS FROM users LIKE 'admin_level'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE users ADD COLUMN admin_level VARCHAR(50) NULL")
                conn.commit()
    except Exception:
        # Fallback for older MySQL versions: check existence then add
        try:
            conn = _get_conn()
            with conn.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM schools LIKE 'school_type'")
                if not cursor.fetchone():
                    cursor.execute("ALTER TABLE schools ADD COLUMN school_type VARCHAR(50) NULL")
                    conn.commit()
        except Exception:
            pass

    # Set default for existing schools that have no school_type to 'primaire'
    try:
        conn = _get_conn()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE schools SET school_type='primaire' WHERE school_type IS NULL")
            conn.commit()
    except Exception:
        pass

    # If you have a specific school that should be secondaire, set it here (idempotent)
    try:
        conn = _get_conn()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE schools SET school_type='secondaire' WHERE id=8")
            conn.commit()
    except Exception:
        pass

ensure_school_type_column()

# ------------------- Blueprints -------------------
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(schools_bp, url_prefix="/api/schools")
app.register_blueprint(classes_bp, url_prefix="/api/classes")
# Register teachers blueprint and ensure courses table exists
try:
    ensure_courses_table()
except Exception:
    # If ensure function fails for any reason, continue without crashing
    pass
app.register_blueprint(teachers_bp, url_prefix="/api")
app.register_blueprint(courses_bp, url_prefix="/api")
app.register_blueprint(messages_bp, url_prefix="/api")
app.register_blueprint(uploads_bp, url_prefix="/api")

# ------------------- Test Route -------------------
@app.route('/test')
def test_route():
    return {"message": "Backend server is working!", "status": "ok"}

if __name__ == "__main__":
    app.run(port=5000, debug=True)