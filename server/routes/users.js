const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireSuperAdmin, requireAdmin } = require('../middleware/auth');

// ================= GET ALL USERS =================
// Temporarily bypass auth for testing
router.get('/', async (req, res) => {
  try {
    const { role, school_id, search } = req.query;

    let query = supabaseAdmin.from('users').select('*');

    // Filter by role if provided
    if (role) {
      query = query.eq('role', role);
    }

    // Filter by school_id if provided
    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    // Remove passwords
    const safeUsers = data.map(u => ({ ...u, password: undefined }));
    res.json({ users: safeUsers });

  } catch (err) {
    console.error('[GET USERS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// ================= GET USER BY ID =================
// Temporarily bypass auth for testing
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });

    // Access control
    if (requester.role === 'SCHOOL_ADMIN' && data.school_id !== requester.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user: { ...data, password: undefined } });

  } catch (err) {
    console.error('[GET USER ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ================= CREATE USER =================
// Temporarily bypass auth for testing
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, school_id, class_id, admin_level, profile_image } = req.body;
    const requester = req.requester;

    // Access control - skip if no requester (auth bypassed)
    if (requester && requester.role === 'SCHOOL_ADMIN') {
      if (!['TEACHER', 'ASSISTANT', 'STUDENT', 'PARENT'].includes(role)) {
        return res.status(403).json({ error: 'Cannot create admin users' });
      }
      if (school_id && school_id !== requester.school_id) {
        return res.status(403).json({ error: 'Cannot create users for other schools' });
      }
    }

    // Generate unique_id
    const uniqueId = `${role.toLowerCase()}_${Date.now()}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    console.log('[CREATE USER] profile_image coming from frontend:', profile_image);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        role,
        school_id: school_id || null,
        class_id: class_id || null,
        admin_level: admin_level || null,
        profile_image: profile_image || null,
        unique_id: uniqueId
      })
      .select()
      .single();

    if (error) throw error;
    console.log('[CREATE USER] Saved to DB with profile_image:', data?.profile_image);

    res.json({ 
      message: 'User created successfully', 
      user: { ...data, password: undefined } 
    });

  } catch (err) {
    console.error('[CREATE USER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE USER =================
// Temporarily bypass auth for testing
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, school_id, class_id, admin_level, profile_image } = req.body;
    const requester = req.requester;

    // Get current user
    const { data: current, error: getError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'User not found' });

    // Access control - skip if no requester (auth bypassed)
    if (requester && requester.role === 'SCHOOL_ADMIN') {
      if (current.school_id !== requester.school_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (role && ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(role)) {
        return res.status(403).json({ error: 'Cannot change to admin role' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name: name || current.name,
        email: email || current.email,
        role: role || current.role,
        school_id: school_id !== undefined ? school_id : current.school_id,
        class_id: class_id !== undefined ? class_id : current.class_id,
        admin_level: admin_level !== undefined ? admin_level : current.admin_level,
        profile_image: profile_image !== undefined ? profile_image : current.profile_image
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      message: 'User updated successfully', 
      user: { ...data, password: undefined } 
    });

  } catch (err) {
    console.error('[UPDATE USER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE USER =================
// Temporarily bypass auth for testing
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.requester;

    // Get current user
    const { data: current, error: getError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'User not found' });

    // Access control - skip if no requester (auth bypassed)
    if (requester && requester.role === 'SCHOOL_ADMIN') {
      if (current.school_id !== requester.school_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });

  } catch (err) {
    console.error('[DELETE USER ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;