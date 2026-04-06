# -*- coding: utf-8 -*-
from db import get_connection

def create_messages_indexes():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Performance indexes for messages
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages (receiver_id, is_read, created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id, created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)')
            print("Messages indexes created/verified")
            
            # Verify
            cursor.execute("SHOW INDEX FROM messages WHERE Key_name='idx_messages_receiver_read'")
            if cursor.fetchone():
                print("Primary index idx_messages_receiver_read confirmed")
            
        conn.commit()
        print("All good!")
    except Exception as e:
        print("Index creation failed: " + str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    create_messages_indexes()

