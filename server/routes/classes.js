const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL CLASSES =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { school_id } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin.from('classes').select('*');
    
    if (requester.role === 'SCHOOL_ADMIN') {
      query = query.eq('school_id', requester.school_id);
    } else if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    res.json({ classes: data });

  } catch (err) {
    console.error('[GET CLASSES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get classes' });
  }
});

// ================= GET CLASS BY ID =================
router.get('/:classId', requireAuth, async (req, res) => {
  try {
    const { classId } = req.params;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Class not found' });

    res.json({ class: data });

  } catch (err) {
    console.error('[GET CLASS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get class' });
  }
});

// ================= CREATE CLASS =================
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, school_id, level, academic_year } = req.body;
    const requester = req.requester;

    if (requester.role === 'SCHOOL_ADMIN' && school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot create classes for other schools' });
    }

    const { data, error } = await supabaseAdmin
      .from('classes')
      .insert({
        name,
        school_id: school_id || requester.school_id,
        level: level || null,
        academic_year: academic_year || null
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Class created successfully', class: data });

  } catch (err) {
    console.error('[CREATE CLASS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE CLASS =================
router.put('/:classId', requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, level, academic_year } = req.body;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Class not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot update other schools classes' });
    }

    const { data, error } = await supabaseAdmin
      .from('classes')
      .update({
        name: name || current.name,
        level: level !== undefined ? level : current.level,
        academic_year: academic_year !== undefined ? academic_year : current.academic_year
      })
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Class updated successfully', class: data });

  } catch (err) {
    console.error('[UPDATE CLASS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE CLASS =================
router.delete('/:classId', requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Class not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot delete other schools classes' });
    }

    const { error } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;

    res.json({ message: 'Class deleted successfully' });

  } catch (err) {
    console.error('[DELETE CLASS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// ================= ASSIGN TEACHER TO CLASS =================
router.post('/:classId/assign-teacher', requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id } = req.body;
    const requester = req.requester;

    // Verify class exists
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (classError) throw classError;
    if (!classData) return res.status(404).json({ error: 'Class not found' });

    // Verify teacher exists
    const { data: teacherData, error: teacherError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacher_id)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .single();

    if (teacherError) throw teacherError;
    if (!teacherData) return res.status(404).json({ error: 'Teacher not found' });

    // Check if already assigned
    const { data: existing } = await supabaseAdmin
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('class_id', classId)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Teacher already assigned to this class' });
    }

    // Assign teacher
    const { error } = await supabaseAdmin
      .from('teacher_classes')
      .insert({ teacher_id, class_id: classId });

    if (error) throw error;

    res.json({ message: 'Teacher assigned to class successfully' });

  } catch (err) {
    console.error('[ASSIGN TEACHER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;