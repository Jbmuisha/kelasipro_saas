
"""
Script to fix the profile_image column size in the users table.
Changes the column from VARCHAR to LONGTEXT to support large base64 images.
"""

from db import get_connection

def fix_profile_image_column():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        print("Updating profile_image column to LONGTEXT...")
        
        
        cursor.execute('ALTER TABLE users MODIFY COLUMN profile_image LONGTEXT')
        conn.commit()
        
        print("✓ profile_image column updated to LONGTEXT")
        
        
        cursor.execute('DESCRIBE users')
        columns = cursor.fetchall()
        for col in columns:
            if len(col) > 1 and col[0] == 'profile_image':
                print(f"Updated profile_image column: {col[1]}")
                break
        
        cursor.close()
        conn.close()
        print("Database schema update completed successfully!")
        
    except Exception as e:
        print(f"Error updating database schema: {e}")
        import traceback
        traceback.print_exc()
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    fix_profile_image_column()