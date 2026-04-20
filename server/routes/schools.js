const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireSuperAdmin, requireAdmin } = require('../middleware/auth');

// ================= GET ALL SCHOOLS =================
// Temporarily bypass auth for testing
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ schools: data });

  } catch (err) {
    console.error('[GET SCHOOLS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// ================= GET SCHOOL BY ID =================
// Temporarily bypass auth for testing
router.get('/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'School not found' });

    res.json({ school: data });

  } catch (err) {
    console.error('[GET SCHOOL ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get school' });
  }
});

// ================= GET SCHOOL TEACHER COURSES =================
// Temporarily bypass auth for testing
router.get('/:schoolId/teacher-courses', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const requester = req.requester;

    // Get courses for the school
    let coursesQuery = supabaseAdmin
      .from('courses')
      .select('*, teacher:users(*)')
      .eq('school_id', schoolId);
    
    // Debug bypass
    if (req.query.debug === 'all') {
      coursesQuery = supabaseAdmin.from('courses').select('*, teacher:users(*)');
    }
    
    const { data: courses, error } = await coursesQuery;

    if (error) throw error;

    // For each course, get the linked classes
    const coursesWithClasses = await Promise.all(
      (courses || []).map(async (course) => {
        const { data: cc } = await supabaseAdmin
          .from('course_classes')
          .select('*, class:classes(id, name)')
          .eq('course_id', course.id);

        return {
          ...course,
          classes: cc || []
        };
      })
    );

    res.json({ courses: coursesWithClasses });

  } catch (err) {
    console.error('[GET TEACHER COURSES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get teacher courses' });
  }
});

// ================= CREATE SCHOOL =================
// Temporarily disabled auth for testing
router.post('/', async (req, res) => {
  try {
    const { name, address, phone, email, school_type } = req.body;
    
    console.log('[CREATE SCHOOL] Request received:', { name, address, phone, email, school_type });

    const { data, error } = await supabaseAdmin
      .from('schools')
      .insert({
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        school_type: school_type || 'primaire'
      })
      .select()
      .single();

    if (error) {
      console.error('[CREATE SCHOOL ERROR] Supabase error:', error);
      throw error;
    }

    console.log('[CREATE SCHOOL SUCCESS]', data);
    res.json({ message: 'School created successfully', school: data });

  } catch (err) {
    console.error('[CREATE SCHOOL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE SCHOOL =================
router.put('/:schoolId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, address, phone, email, school_type } = req.body;
    const requester = req.requester;

    // SCHOOL_ADMIN can only update their own school
    if (requester.role === 'SCHOOL_ADMIN' && requester.school_id !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Cannot update other schools' });
    }

    // Get current
    const { data: current, error: getError } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'School not found' });

    const { data, error } = await supabaseAdmin
      .from('schools')
      .update({
        name: name || current.name,
        address: address !== undefined ? address : current.address,
        phone: phone !== undefined ? phone : current.phone,
        email: email !== undefined ? email : current.email,
        school_type: school_type || current.school_type
      })
      .eq('id', schoolId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'School updated successfully', school: data });

  } catch (err) {
    console.error('[UPDATE SCHOOL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE SCHOOL =================
router.delete('/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;
    console.log('[DEBUG] DELETE school', schoolId, 'attempt');

    // Get all users in this school
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('school_id', schoolId);

    const userIds = users ? users.map(u => u.id) : [];

    // Delete related data in correct order
    
    // 1. Delete parent_student relationships
    await supabaseAdmin
      .from('parent_student')
      .delete()
      .in('parent_id', userIds.length ? userIds : [0]);
    
    await supabaseAdmin
      .from('parent_student')
      .delete()
      .in('student_id', userIds.length ? userIds : [0]);

    // 2. Delete course_classes
    const { data: classes } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId);
    
    const classIds = classes ? classes.map(c => c.id) : [];
    
    if (classIds.length > 0) {
      await supabaseAdmin
        .from('course_classes')
        .delete()
        .in('class_id', classIds);
    }

    // 3. Delete teacher_classes
    if (classIds.length > 0) {
      await supabaseAdmin
        .from('teacher_classes')
        .delete()
        .in('class_id', classIds);
    }

    // 4. Delete school_users
    await supabaseAdmin
      .from('school_users')
      .delete()
      .eq('school_id', schoolId);

    // 5. Delete grades
    if (classIds.length > 0) {
      await supabaseAdmin
        .from('grades')
        .delete()
        .in('class_id', classIds);
    }

    // 6. Delete courses
    await supabaseAdmin
      .from('courses')
      .delete()
      .eq('school_id', schoolId);

    // 7. Delete classes
    await supabaseAdmin
      .from('classes')
      .delete()
      .eq('school_id', schoolId);

    // 8. Delete users
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('school_id', schoolId);

    // 9. Finally delete the school
    const { error } = await supabaseAdmin
      .from('schools')
      .delete()
      .eq('id', schoolId);

    if (error) throw error;

    console.log('[DEBUG] Deleted school', schoolId, 'with', userIds.length, 'users');
    res.json({ message: 'School and all related data deleted successfully' });

  } catch (err) {
    console.error('[DELETE SCHOOL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;