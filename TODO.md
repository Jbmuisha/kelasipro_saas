# Kelasipro SaaS - Backend & Grading Fixed ✅

## Backend Startup (Copy-paste)
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install Flask Flask
venv) JBOY@johnboy backend % python app.py
Traceback (most recent call last):
  File "/Users/JBOY/Desktop/kelasipro-saas/backend/app.py", line 11, in <module>
    from routes.grades import grades_bp
  File "/Users/JBOY/Desktop/kelasipro-saas/backend/routes/grades.py", line 109
    cursor.execute(\"ALTER TABLE grade_configs ADD COLUMN IF NOT EXISTS school_type VARCHAR(20) AFTER max_periods\")
                    ^
SyntaxError: unexpected character after line continuation character
(venv) JBOY@johnboy backend % 