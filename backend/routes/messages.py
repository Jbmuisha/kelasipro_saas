from flask import Blueprint, request, jsonify
from db import get_connection
from models import User
import traceback
from datetime import datetime, timedelta

messages_bp = Blueprint('messages', __name__)

# A user is considered online if their last heartbeat was within this many seconds
ONLINE_THRESHOLD_SECONDS = 30

# Track whether tables have been ensured this process lifetime
_tables_ensured = False


def ensure_messages_table():
    """Create tables if they don't exist. Only runs once per process."""
    global _tables_ensured
    if _tables_ensured:
        return
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    receiver_id INT NOT NULL,
                    content TEXT NOT NULL,
                    is_read TINYINT(1) DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX (sender_id),
                    INDEX (receiver_id),
                    INDEX (created_at),
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_online_status (
                    user_id INT PRIMARY KEY,
                    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
        conn.commit()
        conn.close()
        _tables_ensured = True
    except Exception:
        # If table creation fails,i think 'll try again next request
        traceback.print_exc()


def get_requester_from_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        import os, jwt
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get('id')
        role = payload.get('role')
        school_id = payload.get('school_id')
        if not user_id or not role:
            return None
        return {'id': int(user_id), 'role': role, 'school_id': int(school_id) if school_id else None}
    except Exception:
        return None


@messages_bp.route('/messages/contacts', methods=['GET'])
def get_contacts():
    """Return all staff from same school (except self) + anyone we've ever messaged."""
    conn = None
    try:
        requester = get_requester_from_auth()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        ensure_messages_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, school_id, role, name FROM users WHERE id=%s", (requester['id'],))
            me = cursor.fetchone()
            if not me:
                return jsonify({'error': 'User not found in DB'}), 404

            my_id = int(me['id'])
            my_school = me['school_id']

            contacts_by_id = {}

            # 1) All staff from same school except me
            if my_school:
                cursor.execute(
                    "SELECT id, name, email, role FROM users "
                    "WHERE school_id = %s AND id != %s "
                    "AND role IN ('SCHOOL_ADMIN','SECRETARY','TEACHER','ASSISTANT') "
                    "ORDER BY name",
                    (my_school, my_id)
                )
                for row in cursor.fetchall():
                    contacts_by_id[int(row['id'])] = row

            # 2) Anyone I've messaged or who messaged me
            cursor.execute(
                "SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u "
                "INNER JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id) "
                "WHERE u.id != %s AND (m.sender_id = %s OR m.receiver_id = %s)",
                (my_id, my_id, my_id)
            )
            for row in cursor.fetchall():
                uid = int(row['id'])
                if uid not in contacts_by_id:
                    contacts_by_id[uid] = row

            contacts_by_id.pop(my_id, None)

            contacts = list(contacts_by_id.values())
            contact_ids = [int(c['id']) for c in contacts]

            # Batch-fetch online status (graceful if table missing)
            online_set = set()
            last_seen_map = {}
            try:
                if contact_ids:
                    fmt = ','.join(['%s'] * len(contact_ids))
                    threshold = datetime.utcnow() - timedelta(seconds=ONLINE_THRESHOLD_SECONDS)
                    cursor.execute(
                        f"SELECT user_id, last_seen FROM user_online_status WHERE user_id IN ({fmt})",
                        tuple(contact_ids)
                    )
                    for row in cursor.fetchall():
                        uid = row['user_id']
                        ls = row['last_seen']
                        last_seen_map[uid] = ls
                        if ls and ls >= threshold:
                            online_set.add(uid)
            except Exception:
                pass

            for c in contacts:
                cursor.execute(
                    "SELECT COUNT(*) as cnt FROM messages WHERE sender_id=%s AND receiver_id=%s AND is_read=0",
                    (int(c['id']), my_id)
                )
                r = cursor.fetchone()
                c['unread'] = r['cnt'] if r else 0
                c['is_online'] = int(c['id']) in online_set
                if not c['is_online'] and int(c['id']) in last_seen_map and last_seen_map[int(c['id'])]:
                    c['last_seen'] = last_seen_map[int(c['id'])].isoformat()
                else:
                    c['last_seen'] = None

            contacts.sort(key=lambda x: (not x.get('is_online', False), -x.get('unread', 0), x.get('name', '')))

        return jsonify({
            'contacts': contacts,
            'debug': {'my_id': my_id, 'my_school': my_school, 'my_role': me['role'], 'count': len(contacts)}
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@messages_bp.route('/messages/conversation/<int:other_user_id>', methods=['GET'])
def get_conversation(other_user_id):
    """Get messages between current user and another user."""
    conn = None
    try:
        requester = get_requester_from_auth()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        my_id = requester['id']
        ensure_messages_table()

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at, "
                "s.name as sender_name, r.name as receiver_name "
                "FROM messages m "
                "JOIN users s ON s.id = m.sender_id "
                "JOIN users r ON r.id = m.receiver_id "
                "WHERE (m.sender_id=%s AND m.receiver_id=%s) "
                "   OR (m.sender_id=%s AND m.receiver_id=%s) "
                "ORDER BY m.created_at ASC LIMIT 200",
                (my_id, other_user_id, other_user_id, my_id)
            )
            messages = cursor.fetchall()

            cursor.execute(
                "UPDATE messages SET is_read=1 WHERE sender_id=%s AND receiver_id=%s AND is_read=0",
                (other_user_id, my_id)
            )
            updated_count = cursor.rowcount  # Number of messages marked read
            conn.commit()
            
            # Socket emit read update (disabled due to import error)
            school_id = requester.get('school_id')
            # from routes.socketio import broadcast_unread_update
            # broadcast_unread_update(my_id, school_id, -updated_count)

            for m in messages:
                if m.get('created_at'):
                    m['created_at'] = m['created_at'].isoformat()

        return jsonify({'messages': messages}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@messages_bp.route('/messages/send', methods=['POST'])
def send_message():
    """Send a message to another user."""
    conn = None
    try:
        requester = get_requester_from_auth()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.get_json() or {}
        receiver_id = data.get('receiver_id')
        content = (data.get('content') or '').strip()

        if not receiver_id:
            return jsonify({'error': 'receiver_id is required'}), 400
        if not content:
            return jsonify({'error': 'Message content is required'}), 400

        my_id = requester['id']

        receiver = User.get_by_id(int(receiver_id))
        if not receiver:
            return jsonify({'error': 'Receiver not found'}), 404

        ensure_messages_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO messages (sender_id, receiver_id, content) VALUES (%s, %s, %s)",
                (my_id, int(receiver_id), content)
            )
            conn.commit()
            msg_id = cursor.lastrowid

            cursor.execute(
                "SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at, "
                "s.name as sender_name "
                "FROM messages m JOIN users s ON s.id = m.sender_id WHERE m.id=%s",
                (msg_id,)
            )
            msg = cursor.fetchone()
            if msg and msg.get('created_at'):
                msg['created_at'] = msg['created_at'].isoformat()

        # Socket.IO emit new unread +1 for receiver (disabled)
        school_id = requester.get('school_id')
        # from routes.socketio import broadcast_unread_update
        # broadcast_unread_update(int(receiver_id), school_id, 1)

        # Emit live message (disabled)
        # emit_data = {'message': msg, 'school_id': school_id}
        # from flask_socketio import emit
        # emit('send_message', emit_data, room=f'school_{school_id or 0}', namespace='/')
        
        return jsonify({'message': msg}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@messages_bp.route('/messages/unread-count', methods=['GET'])
def unread_count():
    """Get total unread message count for current user."""
    conn = None
    try:
        requester = get_requester_from_auth()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        ensure_messages_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) as cnt FROM messages WHERE receiver_id=%s AND is_read=0",
                (requester['id'],)
            )
            row = cursor.fetchone()

        return jsonify({'unread': row['cnt'] if row else 0}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@messages_bp.route('/messages/heartbeat', methods=['POST'])
def heartbeat():
    """Called periodically by the frontend to signal the user is online."""
    conn = None
    try:
        requester = get_requester_from_auth()
        if not requester:
            return jsonify({'error': 'Unauthorized'}), 401

        ensure_messages_table()
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO user_online_status (user_id, last_seen) VALUES (%s, UTC_TIMESTAMP()) "
                "ON DUPLICATE KEY UPDATE last_seen = UTC_TIMESTAMP()",
                (requester['id'],)
            )
            conn.commit()

        return jsonify({'ok': True}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
