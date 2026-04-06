# KelasiPro - Strict School Type Isolation (Primaire/Secondaire/Maternelle)

## Task: Partition everything by school_type

Separate primaire, secondaire, maternelle completely. No cross-type mixing for users/classes/teachers.

## Step-by-Step Plan

### [ ] Step 1: Add user.school_type column & sync
**Files:** backend/models.py (User), backend/routes/users.py (create/update), backend/routes/schools.py (user sync)
- ALTER TABLE users ADD COLUMN school_type VARCHAR(20) NULL;
- On user create/update: set user.school_type = school.school_type.
- Run alignment script.

### [ ] Step 2: Filter all queries by school_type match
**Files:** backend/routes/users.py (get_all/get_by_id), classes.py (get_by_school), teachers.py (list_teachers)
- get_users/classes/teachers: WHERE u.school_type = requester.school_type
- Login: Verify user.school_type in JWT.

### [ ] Step 3: Frontend routing by school_type
**Files:** frontend/utils/schoolType.ts, app/login/page.tsx, dashboard layouts
- Post-login: Redirect to /dashboard/{school_type} (primaire/teacher, secondaire/teacher etc.)
- Separate layouts per type.

### [ ] Step 4: Class name validation strict
**Files:** backend/routes/classes.py (create)
- Already good; reinforce.

### [ ] Step 5: Test isolation
- Create primaire/ secondaire schools.
- Users/classes stay isolated.

**Progress:** 1/5 ✅

Note: Backend deps need venv (macOS Python3.13 protected):
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate  # After run
```

### [x] Step 1: Add user.school_type column & sync ✅
**Files:** backend/app.py (migration), backend/models.py (User init/from_dict/to_dict)

