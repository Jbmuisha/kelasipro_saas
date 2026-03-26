from flask import Blueprint, jsonify, request
import os
import uuid

uploads_bp = Blueprint('uploads', __name__)


def _ensure_upload_dir(path: str):
    os.makedirs(path, exist_ok=True)


@uploads_bp.route('/uploads/profile-image', methods=['POST'])
def upload_profile_image():
    """Upload a profile image and return a public URL.

    Expects multipart/form-data with field name: file

    Stores files under backend/uploads/profile_images and serves them via /api/uploads/profile-images/<filename>
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Missing file field'}), 400

    f = request.files['file']
    if not f or not f.filename:
        return jsonify({'error': 'Empty file'}), 400

    # Basic content-type allowlist
    content_type = (f.mimetype or '').lower()
    allowed = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
    }
    ext = allowed.get(content_type)
    if not ext:
        # fallback: try to infer from filename
        _, guessed = os.path.splitext(f.filename)
        guessed = guessed.lower()
        if guessed in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'):
            ext = '.jpg' if guessed == '.jpeg' else guessed
        else:
            return jsonify({'error': f'Unsupported image type: {content_type or guessed or "unknown"}'}), 400

    base_dir = os.path.dirname(os.path.dirname(__file__))  # backend/
    upload_dir = os.path.join(base_dir, 'uploads', 'profile_images')
    _ensure_upload_dir(upload_dir)

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)
    f.save(file_path)

    url = f"/api/uploads/profile-images/{filename}"
    return jsonify({'url': url}), 201


@uploads_bp.route('/uploads/profile-images/<path:filename>', methods=['GET'])
def serve_profile_image(filename):
    """Serve uploaded profile images."""
    from flask import send_from_directory

    base_dir = os.path.dirname(os.path.dirname(__file__))  # backend/
    upload_dir = os.path.join(base_dir, 'uploads', 'profile_images')
    return send_from_directory(upload_dir, filename)
