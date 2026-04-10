import sys
sys.path.append('.')
from db import get_connection

print('=== Backfill school_users for teachers ===')

conn = get_connection()
cursor = conn.cursor()

# Get all teachers without school_users mapping
cursor.execute('''
SELECT DISTINCT u.id, c.school_id 
FROM users u 
JOIN teacher_classes tc ON tc.teacher_id = u.id 
JOIN classes c ON c.id = tc.class_id 
WHERE u.role = \"TEACHER\" AND u.school_id IS NULL
''')
mappings = cursor.fetchall()

print(f'Found {len(mappings)} teacher-class mappings')

fixed = 0
for m in mappings:
    tid = m['id']
    sid = m['school_id']
    cursor.execute('INSERT IGNORE INTO school_users (school_id, user_id, role, created_at) VALUES (%s, %s, %s, NOW())', (sid, tid, 'TEACHER'))
    fixed += cursor.rowcount
    print(f'Mapped teacher {tid} to school {sid}')

conn.commit()
print(f'Fixed {fixed} mappings. Re-run backfill_school_ids.py')

print('✅ Done')
