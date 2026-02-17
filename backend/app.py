from flask import Flask
from routes.auth import auth_bp
from utils.create_super_admin import create_super_admin

app = Flask(__name__)


from flask_cors import CORS
CORS(app)

create_super_admin()


app.register_blueprint(auth_bp, url_prefix="/api/auth")

if __name__ == "__main__":
    app.run(port=5000, debug=True)
