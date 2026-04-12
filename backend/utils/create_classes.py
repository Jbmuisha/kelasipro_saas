import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_connection
from models import ClassModel

def create_standard_classes():
    conn = get_connection()
    with conn.cursor() as cursor:
        # Get all schools
        cursor.execute("SELECT id, school_type FROM schools")
        schools = cursor.fetchall()
        
        for school in schools:
            school_id = school['id']
            school_type = school['school_type'] or 'primaire'
            
            # Delete existing classes for clean slate
            cursor.execute("DELETE FROM classes WHERE school_id = %s", (school_id,))
            
            # Create standard classes
            standard_classes = []
            if school_type.lower() in ('maternelle',):
                standard_classes = ["1ere maternelle", "2eme maternelle", "3eme maternelle"]
            elif school_type.lower() in ('primaire',):
                standard_classes = ["1ere primaire", "2eme primaire", "3eme primaire", "4eme primaire", "5eme primaire", "6eme primaire"]
            elif school_type.lower() in ('secondaire', 'secondary'):
                standard_classes = ["7eme secondaire", "8eme secondaire", "1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire"]
            else:
                standard_classes = ["1ere primaire", "2eme primaire"]  # default
            
            for name in standard_classes:
                try:
                    ClassModel.create(school_id, name)
                    print(f"Created {name} for school {school_id}")
                except Exception as e:
                    print(f"Error creating {name}: {e}")
    
    conn.commit()
    print("Standard classes created for all schools!")

if __name__ == "__main__":
    create_standard_classes()

