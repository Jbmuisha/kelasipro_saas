import sys
sys.path.append('/Users/JBOY/Desktop/kelasipro-saas/backend')
from db import get_connection

conn = get_connection()
cursor = conn.cursor()

# Add school_type if missing
cursor.execute("SHOW COLUMNS FROM grade_configs LIKE 'school_type'")
if not cursor.fetchone():
cursor.execute("ALTER TABLE grade_configs ADD COLUMN school_type VARCHAR(20) DEFAULT '' AFTER max_periods")
    print("Added school_type to grade_configs")

# Populate school_type from schools
    cursor.execute("UPDATE grade_configs gc JOIN schools s ON s.id = gc.school_id SET gc.school_type = s.school_type")
    print(f"Updated {cursor.rowcount} configs with school_type")

# Ensure schools has school_type
    cursor.execute("SHOW COLUMNS FROM schools LIKE 'school_type'")
if cursor.fetchone():
    print(\"schools school_type exists\")
else:
    cursor.execute("ALTER TABLE schools ADD COLUMN school_type VARCHAR(20) DEFAULT 'primaire'")
    print("Added school_type to schools (default 'primaire')")

conn.commit()
    print("Migration complete")
cursor.close()
conn.close()

