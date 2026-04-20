const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../utils/supabase');
const { getRequesterFromAuth, requireAuth, requireSuperAdmin, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Search by email OR unique_id
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(`email.eq.${email},unique_id.eq.${email}`)
      .limit(1);

    if (error) throw error;
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable. Vérifiez votre email ou ID.' });
    }

    const user = users[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('[LOGIN FAILED] Incorrect password for user:', email);
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    // Resolve school_type deterministically
    let school_type = null;
    if (user.school_id) {
      const { data: school } = await supabaseAdmin
        .from('schools')
        .select('school_type')
        .eq('id', user.school_id)
        .single();
      
      if (school) school_type = school.school_type;
    }

    if (!school_type && user.role === 'SCHOOL_ADMIN') {
      school_type = user.admin_level;
    }

    if (!school_type) {
      school_type = user.school_type;
    }

    // Generate JWT token
    const payload = {
      id: user.id,
      role: user.role,
      school_id: user.school_id,
      school_type: school_type
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    console.log('[LOGIN SUCCESS] User logged in:', email, '(role:', user.role, ', school_type:', school_type, ')');

    // Prepare safe user object
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
      school_type: school_type,
      unique_id: user.unique_id,
      profile_image: user.profile_image,
      admin_level: user.admin_level,
      class_id: user.class_id
    };

    // Fetch children for PARENT users
    if (user.role === 'PARENT') {
      const { data: children } = await supabaseAdmin
        .from('parent_student')
        .select(`
          student:users!parent_student_student_id_fkey(
            id, name, email, class_id, unique_id
          )
        `)
        .eq('parent_id', user.id);
      
      safeUser.children = children ? children.map(c => c.student).filter(Boolean) : [];
    }

    // Fetch parents for STUDENT users
    if (user.role === 'STUDENT') {
      const { data: parents } = await supabaseAdmin
        .from('parent_student')
        .select(`
          parent:users!parent_student_parent_id_fkey(
            id, name, email
          )
        `)
        .eq('student_id', user.id);
      
      safeUser.parents = parents ? parents.map(p => p.parent).filter(Boolean) : [];
    }

    res.json({
      message: 'Login successful',
      token: token,
      user: safeUser
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ================= LOGOUT =================
router.post('/logout', requireAuth, (req, res) => {
  console.log('[LOGOUT] User', req.requester.id, '(role:', req.requester.role, ') logged out');
  res.json({ message: 'Logout successful' });
});

// ================= IMPERSONATE =================
// Route for SUPER_ADMIN only (existing)
router.post('/admin/impersonate/:teacherId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const requester = req.requester;

    console.log('[IMPERSONATE] Requester:', requester);
    console.log('[IMPERSONATE] Target teacher ID:', teacherId);

    // Get teacher
    const { data: teachers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacherId)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .limit(1);

    if (error) throw error;

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found or access denied' });
    }

    const teacher = teachers[0];

    // Generate JWT with teacher's payload
    const payload = {
      id: teacher.id,
      role: teacher.role,
      school_id: teacher.school_id,
      school_type: teacher.school_type
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    console.log('[IMPERSONATE]', requester.role, requester.id, 'impersonating teacher', teacher.id);

    const safeUser = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      school_id: teacher.school_id,
      school_type: teacher.school_type,
      unique_id: teacher.unique_id,
      profile_image: teacher.profile_image
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[IMPERSONATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route for SCHOOL_ADMIN (limited - their own school only)
router.post('/school/impersonate/:teacherId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const requester = req.requester;
    const teacherIdNum = parseInt(teacherId, 10);

    console.log('[IMPERSONATE] Requester:', requester);
    console.log('[IMPERSONATE] Target teacher ID:', teacherIdNum);

    // Get teacher (filter by role and school)
    const { data: teachers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', teacherIdNum)
      .in('role', ['TEACHER', 'ASSISTANT'])
      .limit(1);

    console.log('[IMPERSONATE] Query for teacher id:', teacherIdNum);
    console.log('[IMPERSONATE] Teachers found:', teachers?.length || 0);

    if (error) throw error;

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found or access denied' });
    }

    const teacher = teachers[0];

    // SCHOOL_ADMIN can only impersonate teachers from their own school
    if (requester.role === 'SCHOOL_ADMIN') {
      if (!teacher.school_id || teacher.school_id !== requester.school_id) {
        console.log('[IMPERSONATE DENIED] SCHOOL_ADMIN', requester.id, 'attempted to impersonate teacher from different school');
        return res.status(403).json({ error: 'Cannot impersonate teacher from a different school' });
      }
    }

    // Generate JWT with teacher's payload
    const payload = {
      id: teacher.id,
      role: teacher.role,
      school_id: teacher.school_id,
      school_type: teacher.school_type
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    console.log('[IMPERSONATE]', requester.role, requester.id, 'impersonating teacher', teacher.id);

    const safeUser = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      school_id: teacher.school_id,
      school_type: teacher.school_type,
      unique_id: teacher.unique_id,
      profile_image: teacher.profile_image
    };

    res.json({ token: token, user: safeUser });

  } catch (err) {
    console.error('[IMPERSONATE ERROR]', err.message);
    res.status(500).json({ error: 'Impersonation failed' });
  }
});

module.exports = router;