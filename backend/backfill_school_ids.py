from db import get_connection
from models import User

print('=== Kelasipro Teacher School ID Backfill ===')

conn = get_connection()
cursor = conn.cursor()

# 1. Teachers without school_id
cursor.execute('SELECT id FROM users WHERE role = %s AND school_id IS NULL', ('TEACHER',))
null_teachers = [r['id'] for r in cursor.fetchall()]
print(f'Found {len(null_teachers)} teachers without school_id')

fixed = 0
for tid in null_teachers:
    # Try school_users mapping (preferred)
    cursor.execute('SELECT school_id FROM school_users WHERE user_id = %s LIMIT 1', (tid,))
    school = cursor.fetchone()
    if school and school['school_id'] is not None and school['school_id'] != 0:
        cursor.execute('UPDATE users SET school_id = %s WHERE id = %s', (school['school_id'], tid))
        fixed += 1
        print('Fixed teacher %s: school_id=%s (from school_users)' % (tid, school['school_id']))
        continue
    
    # Fallback: first course's school
    cursor.execute('SELECT school_id FROM courses WHERE teacher_id = %s LIMIT 1', (tid,))
    school = cursor.fetchone()
    if school:
        cursor.execute('UPDATE users SET school_id = %s WHERE id = %s', (school['school_id'], tid))
        fixed += 1
        print('Fixed teacher %s: school_id=%s (from courses)' % (tid, school['school_id']))
        continue
    
    # Fallback: first teacher_class's class school
    cursor.execute('SELECT c.school_id FROM classes c JOIN teacher_classes tc ON tc.class_id = c.id WHERE tc.teacher_id = %s LIMIT 1', (tid,))
    school = cursor.fetchone()
    if school:
        cursor.execute('UPDATE users SET school_id = %s WHERE id = %s', (school['school_id'], tid))
        fixed += 1
        print('Fixed teacher %s: school_id=%s (from teacher_classes)' % (tid, school['school_id']))
        continue

print(f'Fixed {fixed}/{len(null_teachers)} teachers')

# Commit all
conn.commit()
print('✅ Backfill complete. Restart backend/frontend.')

