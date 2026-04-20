const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL COURSES =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { school_id } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin
      .from('courses')
      .select('*');

    // Debug: Show requester info
    console.log('[COURSES] requester role:', requester?.role, ', school_id:', requester?.school_id);
    
    if (requester.role === 'SCHOOL_ADMIN' && requester.school_id) {
      query = query.eq('school_id', requester.school_id);
    } else if (school_id) {
      query = query.eq('school_id', school_id);
    }
    
    // Debug: Allow debug_mode to bypass filter
    if (req.query.debug === 'all') {
      query = supabaseAdmin.from('courses').select('*');
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    res.json({ courses: data });

  } catch (err) {
    console.error('[GET COURSES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// ================= GET COURSE BY ID =================
router.get('/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Course not found' });

    res.json({ course: data });

  } catch (err) {
    console.error('[GET COURSE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// ================= CREATE COURSE =================
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, school_id, teacher_id, description, classes } = req.body;
    const requester = req.requester;

    if (requester.role === 'SCHOOL_ADMIN' && school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot create courses for other schools' });
    }

    const finalSchoolId = school_id || requester.school_id;

    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert({
        name,
        school_id: finalSchoolId,
        teacher_id: teacher_id || null,
        description: description || null
      })
      .select()
      .single();

    if (error) throw error;

    const courseId = data.id;

    // Link course to classes via course_classes table
    if (classes && Array.isArray(classes) && classes.length > 0) {
      const classLinks = classes.map((classId) => ({
        course_id: courseId,
        class_id: classId
      }));

      const { error: linkError } = await supabaseAdmin
        .from('course_classes')
        .upsert(classLinks, { onConflict: 'course_id,class_id' });

      if (linkError) {
        console.error('[COURSE_CLASSES LINK ERROR]', linkError.message);
        // Don't fail the whole request, just log the error
      }
    }

    res.json({ message: 'Course created successfully', course: data });

  } catch (err) {
    console.error('[CREATE COURSE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE COURSE =================
router.put('/:courseId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, teacher_id, description } = req.body;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Course not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot update other schools courses' });
    }

    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({
        name: name || current.name,
        teacher_id: teacher_id !== undefined ? teacher_id : current.teacher_id,
        description: description !== undefined ? description : current.description
      })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Course updated successfully', course: data });

  } catch (err) {
    console.error('[UPDATE COURSE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE COURSE =================
router.delete('/:courseId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const requester = req.requester;

    const { data: current, error: getError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Course not found' });

    if (requester.role === 'SCHOOL_ADMIN' && current.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Cannot delete other schools courses' });
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;

    res.json({ message: 'Course deleted successfully' });

  } catch (err) {
    console.error('[DELETE COURSE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ================= ASSIGN TEACHER TO COURSE =================
router.put('/:courseId/assign-teacher', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { teacher_id } = req.body;

    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacher_id)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .single();

    if (teacherError) throw teacherError;
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const { error } = await supabaseAdmin
      .from('courses')
      .update({ teacher_id })
      .eq('id', courseId);

    if (error) throw error;

    res.json({ message: 'Teacher assigned to course successfully' });

  } catch (err) {
    console.error('[ASSIGN TEACHER TO COURSE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= LINK ALL COURSES TO CLASSES (AUTO-FIX) =================
router.post('/auto-link-classes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requester = req.requester;
    const schoolId = requester.school_id;
    
    // Get all classes for this school
    const { data: classes } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId);
    
    // Get all courses for this school
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id, teacher_id')
      .eq('school_id', schoolId);
    
    if (!classes || classes.length === 0) {
      return res.json({ message: 'No classes found' });
    }
    if (!courses || courses.length === 0) {
      return res.json({ message: 'No courses found' });
    }
    
    // Link each course to its class based on teacher assignment
    // For courses with a teacher, find that teacher's class and link
    for (const course of courses) {
      let classId = null;
      
      // If course has teacher, find teacher's assigned class
      if (course.teacher_id) {
        const { data: tc } = await supabaseAdmin
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', course.teacher_id)
          .single();
        if (tc) classId = tc.class_id;
      }
      
      // Fallback: use first class for this school
      if (!classId && classes.length > 0) {
        classId = classes[0].id;
      }
      
      // Link it
      if (classId) {
        await supabaseAdmin.from('course_classes').upsert({
          course_id: course.id,
          class_id: classId
        }, { onConflict: 'course_id,class_id' });
      }
    }
    
    res.json({ message: `Linked ${courses.length} courses to classes` });
  } catch (err) {
    console.error('[AUTO-LINK ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;