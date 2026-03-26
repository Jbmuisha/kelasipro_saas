import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

def get_connection():
    # More resilient connection settings to reduce "MySQL server has gone away" errors.
    # Note: server-side timeouts (wait_timeout/max_allowed_packet) may still need tuning.
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "kelasipro_db"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=10,
        read_timeout=30,
        write_timeout=30,
    )
