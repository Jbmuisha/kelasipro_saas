const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL GRADES =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { student_id, class_id, course_id, period } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin
      .from('grades')
      .select('*, student:users(*), course:courses(*), class:classes(*), submitted_by_user:users!submitted_by(*)');

    if (requester.role === 'TEACHER' || requester.role === 'ASSISTANT') {
      query = query.eq('submitted_by', requester.id);
    }

    if (student_id) query = query.eq('student_id', student_id);
    if (class_id) query = query.eq('class_id', class_id);
    if (course_id) query = query.eq('course_id', course_id);
    if (period) query = query.eq('period', period);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ grades: data });

  } catch (err) {
    console.error('[GET GRADES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get grades' });
  }
});

// ================= GET GRADE BY ID =================
router.get('/:gradeId', requireAuth, async (req, res) => {
  try {
    const { gradeId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('grades')
      .select('*, student:users(*), course:courses(*), class:classes(*), submitted_by_user:users!submitted_by(*)')
      .eq('id', gradeId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Grade not found' });

    res.json({ grade: data });

  } catch (err) {
    console.error('[GET GRADE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get grade' });
  }
});

// ================= CREATE GRADE =================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { student_id, course_id, class_id, value, period, comment, academic_year } = req.body;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('grades')
      .insert({
        student_id,
        course_id,
        class_id,
        value,
        period,
        comment: comment || null,
        academic_year: academic_year || null,
        submitted_by: requester.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Grade created successfully', grade: data });

  } catch (err) {
    console.error('[CREATE GRADE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE GRADE =================
router.put('/:gradeId', requireAuth, async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { value, period, comment } = req.body;

    const { data, error } = await supabaseAdmin
      .from('grades')
      .update({
        value: value || null,
        period: period || null,
        comment: comment || null
      })
      .eq('id', gradeId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Grade updated successfully', grade: data });

  } catch (err) {
    console.error('[UPDATE GRADE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE GRADE =================
router.delete('/:gradeId', requireAuth, async (req, res) => {
  try {
    const { gradeId } = req.params;

    const { error } = await supabaseAdmin
      .from('grades')
      .delete()
      .eq('id', gradeId);

    if (error) throw error;

    res.json({ message: 'Grade deleted successfully' });

  } catch (err) {
    console.error('[DELETE GRADE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

// ================= BULK CREATE GRADES =================
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { grades } = req.body;
    const requester = req.requester;

    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({ error: 'Grades array required' });
    }

    const gradesWithSubmitter = grades.map(g => ({
      ...g,
      submitted_by: requester.id
    }));

    const { data, error } = await supabaseAdmin
      .from('grades')
      .insert(gradesWithSubmitter)
      .select();

    if (error) throw error;

    res.json({ message: 'Grades created successfully', grades: data });

  } catch (err) {
    console.error('[BULK CREATE GRADES ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;