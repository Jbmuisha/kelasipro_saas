const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ================= GET ALL SCHEDULES =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { class_id, day_of_week } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin
      .from('schedules')
      .select('*, course:courses(*), class:classes(*)');

    if (class_id) query = query.eq('class_id', class_id);
    if (day_of_week) query = query.eq('day_of_week', day_of_week);

    const { data, error } = await query.order('start_time');
    if (error) throw error;

    res.json({ schedules: data });

  } catch (err) {
    console.error('[GET SCHEDULES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

// ================= GET SCHEDULE BY ID =================
router.get('/:scheduleId', requireAuth, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('*, course:courses(*), class:classes(*)')
      .eq('id', scheduleId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Schedule not found' });

    res.json({ schedule: data });

  } catch (err) {
    console.error('[GET SCHEDULE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// ================= CREATE SCHEDULE =================
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { class_id, course_id, day_of_week, start_time, end_time, room } = req.body;

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .insert({
        class_id,
        course_id,
        day_of_week,
        start_time,
        end_time,
        room: room || null
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Schedule created successfully', schedule: data });

  } catch (err) {
    console.error('[CREATE SCHEDULE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE SCHEDULE =================
router.put('/:scheduleId', requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { class_id, course_id, day_of_week, start_time, end_time, room } = req.body;

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .update({
        class_id: class_id || null,
        course_id: course_id || null,
        day_of_week: day_of_week || null,
        start_time: start_time || null,
        end_time: end_time || null,
        room: room || null
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Schedule updated successfully', schedule: data });

  } catch (err) {
    console.error('[UPDATE SCHEDULE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE SCHEDULE =================
router.delete('/:scheduleId', requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const { error } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;

    res.json({ message: 'Schedule deleted successfully' });

  } catch (err) {
    console.error('[DELETE SCHEDULE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;