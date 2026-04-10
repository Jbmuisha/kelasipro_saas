# KelasiPro School Type Isolation + Impersonation Fix Tracker

## Current Status (from analysis)
- [x] Backend DB school_type column + sync
- [x] Partial backend query filters (users/classes/teachers)
- [ ] Frontend school_type routing + impersonation token fix ← PRIORITY

## Breakdown Steps

### 1. Fix Impersonation (Immediate Data Fix)
   - Backend: Add /api/admin/impersonate/{teacher_id} endpoint (routes/auth.py) → validate SUPER_ADMIN/SCHOOL_ADMIN, generate real JWT for teacher.
   - Frontend: Update utils/auth.ts setImpersonation → call API instead of fake token, redirect `/dashboard/{teacher.school_type}/{role}`.
   - Test: Admin login-as-teacher, verify data loads.

### 2. Implement School Type Routing (Step 3)
   - frontend/app/login/page.tsx: Redirect `/dashboard/${user.school_type.toLowerCase()}/${role.toLowerCase()}`
   - Create frontend/app/dashboard/[school_type]/layout.tsx (dynamic, load type-specific CSS).
   - Update middleware.ts: Extract school_type from path.
   - Propagate in links (teachers/page.tsx etc.).

### 3. Layouts & Validation (Steps 3c/4)
   - Conditional rendering based on school_type.
   - backend/routes/classes.py: Add name pattern validation per type.

### 4. Full Tests (Step 5)
   - Create test schools/users per type.
   - Verify isolation + impersonation.

**Progress: Step 1 ✅ Complete (impersonation fixed with real tokens + school_type routing start). Next: Step 2 login redirects.**
