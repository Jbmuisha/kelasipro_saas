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
      .select('id, name, email, role, profile_image, school_id, class_id')
      .in('role', ['TEACHER', 'ASSISTANT']);

    if (requester.role === 'SCHOOL_ADMIN') {
      query = query.eq('school_id', requester.school_id);
    } else if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    // Get school info for each teacher
    if (data && data.length > 0) {
      const schoolIds = [...new Set(data.map(t => t.school_id).filter(Boolean))];
      
      if (schoolIds.length > 0) {
        const { data: schools } = await supabaseAdmin
          .from('schools')
          .select('id, name, school_type')
          .in('id', schoolIds);
        
        const schoolMap = (schools || []).reduce((acc, school) => {
          acc[school.id] = school;
          return acc;
        }, {});
        
        // Attach school info to teachers
        data.forEach(teacher => {
          if (teacher.school_id && schoolMap[teacher.school_id]) {
            teacher.school_name = schoolMap[teacher.school_id].name;
            teacher.school_type_from_school = schoolMap[teacher.school_id].school_type;
          }
        });
      }
      
      // Get class info for principal classes
      const classIds = [...new Set(data.map(t => t.class_id).filter(Boolean))];
      
      if (classIds.length > 0) {
        const { data: classes } = await supabaseAdmin
          .from('classes')
          .select('id, name, level')
          .in('id', classIds);
        
        const classMap = (classes || []).reduce((acc, cls) => {
          acc[cls.id] = cls;
          return acc;
        }, {});
        
        // Attach class info to teachers
        data.forEach(teacher => {
          if (teacher.class_id && classMap[teacher.class_id]) {
            teacher.principal_class_name = classMap[teacher.class_id].name;
            teacher.principal_class_level = classMap[teacher.class_id].level;
          }
        });
      }
      
      // Get courses for each teacher
      const teacherIds = data.map(t => t.id);
      const { data: courseLinks } = await supabaseAdmin
        .from('courses')
        .select('id, name, teacher_id')
        .in('teacher_id', teacherIds);
      
      // Attach courses to each teacher
      data.forEach(teacher => {
        teacher.courses = (courseLinks || [])
          .filter(c => c.teacher_id === teacher.id)
          .map(c => ({ id: c.id, name: c.name }));
      });
      
      console.log('[GET TEACHERS] Sample teacher:', JSON.stringify(data[0], null, 2));
    }

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
      .select('*')
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
router.post('/', requireAuth, requireAdmin, async (req, res) => {
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
router.put('/:teacherId', requireAuth, requireAdmin, async (req, res) => {
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
router.delete('/:teacherId', requireAuth, requireAdmin, async (req, res) => {
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
      .select('*')
      .eq('teacher_id', teacherId);

    if (error) throw error;

    res.json({ courses: data });

  } catch (err) {
    console.error('[GET TEACHER COURSES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get teacher courses' });
  }
});

module.exports = router;