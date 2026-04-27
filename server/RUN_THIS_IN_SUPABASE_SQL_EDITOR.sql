-- =============================================================================
-- KELASIPRO COMPLETE SCHEMA MIGRATION
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard → Your Project → SQL Editor → New Query
-- =============================================================================

-- ================= USERS TABLE =================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
  school_id INTEGER,
  class_id INTEGER,
  unique_id VARCHAR(100),
  profile_image TEXT,
  admin_level VARCHAR(50),
  school_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= SCHOOLS TABLE =================
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  school_type VARCHAR(50) DEFAULT 'primaire',
  full_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure full_access column exists (for existing installations)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT TRUE;

-- Backfill full_access for existing schools
UPDATE schools SET full_access = TRUE WHERE full_access IS NULL;

-- ================= CLASSES TABLE =================
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  level VARCHAR(50),
  academic_year VARCHAR(20),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= COURSES TABLE =================
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= GRADES TABLE =================
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  value DECIMAL(5,2),
  period VARCHAR(50),
  comment TEXT,
  academic_year VARCHAR(20),
  submitted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= MESSAGES TABLE =================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= SCHEDULES TABLE =================
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20),
  start_time TIME,
  end_time TIME,
  room VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= TEACHER_CLASSES TABLE =================
CREATE TABLE IF NOT EXISTS teacher_classes (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, class_id)
);

-- ================= COURSE_CLASSES TABLE =================
CREATE TABLE IF NOT EXISTS course_classes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, class_id)
);

-- ================= PARENT_STUDENT TABLE =================
CREATE TABLE IF NOT EXISTS parent_student (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

-- ================= SCHOOL_USERS TABLE =================
CREATE TABLE IF NOT EXISTS school_users (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, user_id)
);

-- ================= USER_ONLINE_STATUS TABLE =================
CREATE TABLE IF NOT EXISTS user_online_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE
);

-- ================= SUBSCRIPTION_PLANS TABLE =================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  features TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= SUBSCRIPTIONS TABLE =================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'basic',
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= CONTRACTS TABLE =================
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  contract_number VARCHAR(100) UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  signed_by_school BOOLEAN DEFAULT FALSE,
  signed_by_platform BOOLEAN DEFAULT FALSE,
  school_signature_date TIMESTAMP,
  platform_signature_date TIMESTAMP,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= CREATE INDEXES =================
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_course_id ON grades(course_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON parent_student(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON parent_student(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_contracts_school_id ON contracts(school_id);

-- ================= INSERT SUPER ADMIN =================
-- Password: jbGolden2912#
INSERT INTO users (name, email, password, role, unique_id)
VALUES ('jboyGolden', 'jbmuisha@gmail.com', '$2a$10$rQEY6bQKK3Z0vZ5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'SUPER_ADMIN', 'super_admin_1')
ON CONFLICT (email) DO NOTHING;

-- ================= INSERT DEFAULT SUBSCRIPTION PLANS =================
INSERT INTO subscription_plans (name, description, price, duration_months, features) VALUES
('Basic Monthly', 'Basic plan for small schools with up to 100 students', 50.00, 1, '{"max_students": 100, "max_teachers": 10, "support": "email"}'),
('Standard Monthly', 'Standard plan for medium schools with up to 500 students', 100.00, 1, '{"max_students": 500, "max_teachers": 30, "support": "email+phone", "reports": true}'),
('Premium Monthly', 'Premium plan for large schools with unlimited students', 200.00, 1, '{"max_students": "unlimited", "max_teachers": "unlimited", "support": "priority", "reports": true, "api_access": true}'),
('Basic Yearly', 'Basic plan for small schools - yearly billing (2 months free)', 500.00, 12, '{"max_students": 100, "max_teachers": 10, "support": "email"}'),
('Standard Yearly', 'Standard plan for medium schools - yearly billing (2 months free)', 1000.00, 12, '{"max_students": 500, "max_teachers": 30, "support": "email+phone", "reports": true}'),
('Premium Yearly', 'Premium plan for large schools - yearly billing (2 months free)', 2000.00, 12, '{"max_students": "unlimited", "max_teachers": "unlimited", "support": "priority", "reports": true, "api_access": true}')
ON CONFLICT DO NOTHING;

-- ================= VERIFY =================
SELECT 'users' as table_name, COUNT(*) as rows FROM users
UNION ALL SELECT 'schools', COUNT(*) FROM schools
UNION ALL SELECT 'classes', COUNT(*) FROM classes
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'grades', COUNT(*) FROM grades
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL SELECT 'teacher_classes', COUNT(*) FROM teacher_classes
UNION ALL SELECT 'course_classes', COUNT(*) FROM course_classes
UNION ALL SELECT 'parent_student', COUNT(*) FROM parent_student
UNION ALL SELECT 'school_users', COUNT(*) FROM school_users
UNION ALL SELECT 'user_online_status', COUNT(*) FROM user_online_status
UNION ALL SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'contracts', COUNT(*) FROM contracts;

