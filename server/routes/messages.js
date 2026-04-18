const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

// ================= GET MESSAGES =================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    const requester = req.requester;

    let query = supabaseAdmin
      .from('messages')
      .select('*, sender:users(*), receiver:users(*)')
      .or(`sender_id.eq.${requester.id},receiver_id.eq.${requester.id}`)
      .order('created_at', { ascending: false });

    const { data, error } = await query.limit(100);
    if (error) throw error;

    res.json({ messages: data });

  } catch (err) {
    console.error('[GET MESSAGES ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// ================= GET CONVERSATION =================
router.get('/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.requester;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*, sender:users(*), receiver:users(*)')
      .or(`and(sender_id.eq.${requester.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${requester.id})`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ messages: data });

  } catch (err) {
    console.error('[GET CONVERSATION ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// ================= SEND MESSAGE =================
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const requester = req.requester;

    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'receiver_id and content required' });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: requester.id,
        receiver_id,
        content
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Message sent successfully', message: data });

  } catch (err) {
    console.error('[SEND MESSAGE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= GET CONTACTS =================
router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const requester = req.requester;

    // Get users who have sent or received messages with this user
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${requester.id},receiver_id.eq.${requester.id}`);

    if (error) throw error;

    // Get unique user IDs
    const userIds = new Set();
    data.forEach(m => {
      if (m.sender_id !== requester.id) userIds.add(m.sender_id);
      if (m.receiver_id !== requester.id) userIds.add(m.receiver_id);
    });

    // Get user details
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, profile_image')
      .in('id', Array.from(userIds));

    res.json({ contacts: users || [] });

  } catch (err) {
    console.error('[GET CONTACTS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// ================= GET UNREAD COUNT =================
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const requester = req.requester;

    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', requester.id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count });

  } catch (err) {
    console.error('[GET UNREAD COUNT ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ================= MARK AS READ =================
router.put('/read/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('receiver_id', req.requester.id);

    if (error) throw error;

    res.json({ message: 'Message marked as read' });

  } catch (err) {
    console.error('[MARK AS READ ERROR]', err.message);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;