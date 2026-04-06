from flask_socketio import emit, join_room, leave_room
from flask import request, session
from db import get_connection
from models import User
import os
import jwt
from datetime import datetime, timedelta

from flask_socketio import emit, join_room, leave_room, Namespace

socketio_namespaces = {}
# socketio = Namespace()



def get_requester_from_socket():
    """Extract user info from socket auth token"""
    token = request.args.get('token')
    if not token:
        return None
    try:
        secret = os.getenv("JWT_SECRET", "supersecretkey")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return {'id': int(payload['id']), 'role': payload['role'], 'school_id': int(payload.get('school_id') or 0)}
    except:
        return None

@socketio.on('connect')
def handle_connect(auth):
    """Socket connect handler"""
    requester = get_requester_from_socket()

    if not requester:
        emit('auth_error', {'error': 'Invalid token'})
        return False
    emit('connected', {'user_id': requester['id']})

@socketio.on('join_school')
def handle_join_school(data):
    requester = get_requester_from_socket()
    if not requester:
        return
    school_id = requester['school_id']
    if school_id:
        join_room(f'school_{school_id}')
        emit('joined_school', {'school_id': school_id})

@socketio.on('leave_school')
def handle_leave_school():
    requester = get_requester_from_socket()
    if requester and requester['school_id']:
        leave_room(f'school_{requester["school_id"]}')

@socketio.on('send_message')
def handle_send_message(data):
    """Socket confirmation - actual send via HTTP API"""
    emit('message_sent', data, broadcast=True)

@socketio.on('message_read')
def handle_message_read(data):
    """Broadcast read status to sender"""
    room = f'school_{data.get("school_id") or 0}'
    emit('message_read', data, room=room, include_self=False)

def broadcast_unread_update(user_id, school_id, delta):
    """Notify school room of unread change for specific user"""
    room = f'school_{school_id}' if school_id else None
    emit('unread_update', {
        'user_id': user_id, 
        'delta': delta  # +1 new, -all read
    }, room=room)

def emit_online_status(user_id, school_id, is_online=True):
    room = f'school_{school_id}' if school_id else None
    emit('user_online', {'user_id': user_id, 'is_online': is_online}, room=room)

