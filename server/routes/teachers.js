const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL TEACHERS =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { school_id } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin
      .from('users')
      .select('*, school:schools(*), class:class_id(*)')
      .in('role', ['TEACHER', 'ASSISTANT']);

    if (requester.role === 'SCHOOL_ADMIN') {
      query = query.eq('school_id', requester.school_id);
    } else if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    res.json({ teachers: data });

  } catch (err) {
    console.error('[GET TEACHERS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get teachers' });
  }
});

// ================= GET TEACHER BY ID =================
router.get('/:teacherId', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, school:schools(*), class:class_id(*)')
      .eq('id', teacherId)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Teacher not found' });

    res.json({ teacher: data });

  } catch (err) {
    console.error('[GET TEACHER ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get teacher' });
  }
});

// ================= CREATE TEACHER =================
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, school_id, class_id, profile_image } = req.body;
    const requester = req.requester;

    if (requester.role === 'SCHOOL_ADMIN' && school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot create teachers for other schools' });
    }

    // Generate unique_id
    const uniqueId = `teacher_${Date.now()}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        school_id: school_id || requester.school_id,
        class_id: class_id || null,
        profile_image: profile_image || null,
        unique_id: uniqueId
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Teacher created successfully', teacher: { ...data, password: undefined } });

  } catch (err) {
    console.error('[CREATE TEACHER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE TEACHER =================
router.put('/:teacherId', requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, email, school_id, class_id, profile_image } = req.body;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Teacher not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot update other schools teachers' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name: name || current.name,
        email: email || current.email,
        school_id: school_id !== undefined ? school_id : current.school_id,
        class_id: class_id !== undefined ? class_id : current.class_id,
        profile_image: profile_image !== undefined ? profile_image : current.profile_image
      })
      .eq('id', teacherId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Teacher updated successfully', teacher: { ...data, password: undefined } });

  } catch (err) {
    console.error('[UPDATE TEACHER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE TEACHER =================
router.delete('/:teacherId', requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Teacher not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot delete other schools teachers' });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', teacherId);

    if (error) throw error;

    res.json({ message: 'Teacher deleted successfully' });

  } catch (err) {
    console.error('[DELETE TEACHER ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// ================= GET TEACHER COURSES =================
router.get('/:teacherId/courses', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*, school:schools(*), class:course_classes(class:classes(*))')
      .eq('teacher_id', teacherId);

    if (error) throw error;

    res.json({ courses: data });

  } catch (err) {
    console.error('[GET TEACHER COURSES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get teacher courses' });
  }
});

module.exports = router;