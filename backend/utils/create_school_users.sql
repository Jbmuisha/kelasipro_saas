-- Migration: create school_users mapping table and backfill from users
-- Save as backend/utils/create_school_users.sql and run with:
--   mysql -u <user> -p <database> < backend/utils/create_school_users.sql
-- or run the statements manually in your MySQL client.

-- 1) Add created_by column to users (if your MySQL supports IF NOT EXISTS, this will be safe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT NULL;

-- 2) Create the school_users table (idempotent)
CREATE TABLE IF NOT EXISTS school_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_user (school_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Backfill existing users into school_users (only users that already have a school_id)
INSERT IGNORE INTO school_users (school_id, user_id, role, created_by, created_at)
SELECT school_id, id, role, created_by, NOW()
FROM users
WHERE school_id IS NOT NULL;

-- 4) (Optional) Add foreign key constraints to keep referential integrity
-- Run these only after verifying the backfill results and ensuring there are no conflicting rows.
-- Uncomment and run if you want the FK constraints.

-- ALTER TABLE school_users
--   ADD CONSTRAINT fk_su_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_su_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
--   ADD CONSTRAINT fk_su_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5) Quick verification queries (run in your client)
-- SELECT COUNT(*) FROM school_users;
-- SELECT * FROM school_users WHERE school_id = 8 LIMIT 100;
-- SELECT school_id, COUNT(*) AS members FROM school_users GROUP BY school_id ORDER BY school_id;

-- End of migration
