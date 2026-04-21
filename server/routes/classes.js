const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL CLASSES =================
// Debug - bypass auth temporarily
router.get('/', async (req, res) => {
  // Get school_id from query or header
  let schoolId = req.query.school_id || req.headers.get('x-school-id');
  
  try {
    let query = supabaseAdmin.from('classes').select('*');
    
    // Filter by school if provided in query
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    // Get teacher assignments for each class
    try {
      const classIds = data.map(c => c.id);
      if (classIds.length > 0) {
        // First get teacher IDs
        const { data: assignments } = await supabaseAdmin
          .from('teacher_classes')
          .select('class_id, teacher_id')
          .in('class_id', classIds);

        // Then get teacher names separately
        const teacherIds = [...new Set((assignments || []).map(a => a.teacher_id).filter(Boolean))];
        let teacherMap = {};
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabaseAdmin
            .from('users')
            .select('id, name')
            .in('id', teacherIds);
          (teachers || []).forEach(t => { teacherMap[t.id] = t.name; });
        }

        // Add main_teacher_name to each class
        data.forEach(cls => {
          const assignment = (assignments || []).find(a => a.class_id === cls.id);
          cls.main_teacher_name = assignment?.teacher_id ? teacherMap[assignment.teacher_id] : null;
          cls.main_teacher_id = assignment?.teacher_id || null;
        });
      }
    } catch (err) {
      console.error('[TEACHER LOOKUP ERROR]', err.message);
    }

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
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, level, academic_year } = req.body;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('classes')
      .insert({
        name,
        school_id: requester.school_id,
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
router.put('/:classId', requireAuth, requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// ================= DELETE CLASS =================
router.delete('/:classId', requireAuth, requireAdmin, async (req, res) => {
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
router.post('/:classId/assign-teacher', requireAuth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id, unassign } = req.body;
    const requester = req.requester;

    // Get class info
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*, school:schools(*)')
      .eq('id', classId)
      .single();

    if (classError) throw classError;
    if (!classData) return res.status(404).json({ error: 'Class not found' });

    // Check if this requester has permission to manage this class
    // SCHOOL_ADMIN can manage their own school's classes
    if (requester.role === 'SCHOOL_ADMIN' && classData.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot manage this class' });
    }

    // If unassign is true, remove the teacher
    if (unassign) {
      // Delete existing assignment
      const { error: deleteError } = await supabaseAdmin
        .from('teacher_classes')
        .delete()
        .eq('class_id', classId);

      if (deleteError) throw deleteError;

      // Also update main_teacher_id in classes table
      await supabaseAdmin
        .from('classes')
        .update({ main_teacher_id: null })
        .eq('id', classId);

      return res.json({ message: 'Teacher unassigned from class' });
    }

    // Validate teacher exists
    if (!teacher_id) {
      return res.status(400).json({ error: 'Teacher ID required' });
    }

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacher_id)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .single();

    if (teacherError) throw teacherError;
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Delete existing teacher assignment for this class first
    await supabaseAdmin
      .from('teacher_classes')
      .delete()
      .eq('class_id', classId);

    // Insert new assignment
    const { error: insertError } = await supabaseAdmin
      .from('teacher_classes')
      .insert({
        class_id: classId,
        teacher_id: teacher_id
      });

    if (insertError) throw insertError;

    // Update main_teacher_id in classes table
    const { error: updateError } = await supabaseAdmin
      .from('classes')
      .update({ main_teacher_id: teacher_id })
      .eq('id', classId);

    if (updateError) console.error('[UPDATE CLASS TEACHER ERROR]', updateError.message);

    res.json({ message: 'Teacher assigned to class successfully' });

  } catch (err) {
    console.error('[ASSIGN TEACHER TO CLASS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;