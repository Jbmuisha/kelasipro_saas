#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_connection

print('Aligning user.admin_level with school.school_type for TEACHER roles...')

conn = get_connection()
with conn.cursor() as cursor:
    cursor.execute("""
        UPDATE users u 
        JOIN schools s ON u.school_id = s.id 
        SET u.admin_level = s.school_type 
        WHERE u.role = 'TEACHER' AND (u.admin_level IS NULL OR u.admin_level != s.school_type)
    """)
    count = cursor.rowcount
    conn.commit()

print("Updated {} teachers.".format(count))

print('\\nRun with: python backend/utils/align_school_types.py')
