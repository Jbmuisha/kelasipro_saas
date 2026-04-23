const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

// ================= GET ALL SUBSCRIPTIONS =================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        school:schools(id, name, email, school_type),
        plan:subscription_plans(id, name, price, duration_months)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ subscriptions: data });
  } catch (err) {
    console.error('[GET SUBSCRIPTIONS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

// ================= GET SUBSCRIPTION BY ID =================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        school:schools(id, name, email, school_type),
        plan:subscription_plans(id, name, price, duration_months)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Subscription not found' });

    res.json({ subscription: data });
  } catch (err) {
    console.error('[GET SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// ================= GET SUBSCRIPTIONS BY SCHOOL =================
router.get('/school/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(id, name, price, duration_months)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ subscriptions: data });
  } catch (err) {
    console.error('[GET SCHOOL SUBSCRIPTIONS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get school subscriptions' });
  }
});

// ================= CREATE SUBSCRIPTION =================
router.post('/', async (req, res) => {
  try {
    const {
      school_id,
      plan_type,
      start_date,
      end_date,
      amount,
      payment_method,
      transaction_id,
      notes
    } = req.body;

    if (!school_id || !end_date || !amount) {
      return res.status(400).json({ error: 'Missing required fields: school_id, end_date, amount' });
    }

    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('id', school_id)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        school_id,
        plan_type: plan_type || 'basic',
        start_date: start_date || new Date().toISOString(),
        end_date,
        status: 'active',
        payment_status: 'pending',
        amount,
        payment_method: payment_method || null,
        transaction_id: transaction_id || null,
        notes: notes || null
      })
      .select(`
        *,
        school:schools(id, name, email),
        plan:subscription_plans(id, name, price)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Subscription created successfully', subscription: data });
  } catch (err) {
    console.error('[CREATE SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE SUBSCRIPTION =================
router.put('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_type,
      end_date,
      status,
      payment_status,
      amount,
      payment_method,
      transaction_id,
      notes
    } = req.body;

    const { data: current, error: getError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Subscription not found' });

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_type: plan_type || current.plan_type,
        end_date: end_date || current.end_date,
        status: status || current.status,
        payment_status: payment_status || current.payment_status,
        amount: amount || current.amount,
        payment_method: payment_method !== undefined ? payment_method : current.payment_method,
        transaction_id: transaction_id !== undefined ? transaction_id : current.transaction_id,
        notes: notes !== undefined ? notes : current.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        school:schools(id, name, email),
        plan:subscription_plans(id, name, price)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Subscription updated successfully', subscription: data });
  } catch (err) {
    console.error('[UPDATE SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= ACTIVATE SUBSCRIPTION =================
router.post('/:id/activate', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_id, payment_method } = req.body;

    const { data: current, error: getError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, school:schools(id, name)')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Subscription not found' });

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        payment_status: 'paid',
        transaction_id: transaction_id || current.transaction_id,
        payment_method: payment_method || current.payment_method,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        school:schools(id, name, email),
        plan:subscription_plans(id, name, price)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Subscription activated successfully', subscription: data });
  } catch (err) {
    console.error('[ACTIVATE SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= CANCEL SUBSCRIPTION =================
router.post('/:id/cancel', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: current, error: getError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Subscription not found' });

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : current.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        school:schools(id, name, email),
        plan:subscription_plans(id, name, price)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Subscription cancelled successfully', subscription: data });
  } catch (err) {
    console.error('[CANCEL SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE SUBSCRIPTION =================
router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Subscription deleted successfully' });
  } catch (err) {
    console.error('[DELETE SUBSCRIPTION ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= GET ALL SUBSCRIPTION PLANS =================
router.get('/plans/all', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (error) throw error;
    res.json({ plans: data });
  } catch (err) {
    console.error('[GET SUBSCRIPTION PLANS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

// ================= CHECK EXPIRED SUBSCRIPTIONS =================
router.post('/check-expiry', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data: expiredSubs, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, school_id, end_date, school:schools(name)')
      .eq('status', 'active')
      .lt('end_date', now);

    if (fetchError) throw fetchError;

    if (expiredSubs && expiredSubs.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: now })
        .eq('status', 'active')
        .lt('end_date', now);

      if (updateError) throw updateError;

      res.json({
        message: `${expiredSubs.length} subscription(s) marked as expired`,
        expired: expiredSubs
      });
    } else {
      res.json({ message: 'No expired subscriptions found', expired: [] });
    }
  } catch (err) {
    console.error('[CHECK EXPIRY ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= CONTRACTS ROUTES =================

// Get all contracts
router.get('/contracts/all', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        school:schools(id, name, email),
        subscription:subscriptions(id, plan_type, amount)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ contracts: data });
  } catch (err) {
    console.error('[GET CONTRACTS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get contracts' });
  }
});

// Get contract by ID
router.get('/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        school:schools(id, name, email, address),
        subscription:subscriptions(id, plan_type, amount, start_date, end_date)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contract not found' });

    res.json({ contract: data });
  } catch (err) {
    console.error('[GET CONTRACT ERROR]', err.message);
    res.status(500).json({ error: 'Failed to get contract' });
  }
});

// Create contract
router.post('/contracts', async (req, res) => {
  try {
    const {
      school_id,
      subscription_id,
      start_date,
      end_date,
      terms,
      status
    } = req.body;

    if (!school_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contractNumber = `CNT-${Date.now()}-${school_id}`;

    const { data, error } = await supabaseAdmin
      .from('contracts')
      .insert({
        school_id,
        subscription_id: subscription_id || null,
        contract_number: contractNumber,
        start_date,
        end_date,
        terms: terms || null,
        status: status || 'draft'
      })
      .select(`
        *,
        school:schools(id, name, email),
        subscription:subscriptions(id, plan_type, amount)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Contract created successfully', contract: data });
  } catch (err) {
    console.error('[CREATE CONTRACT ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update contract
router.put('/contracts/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      start_date,
      end_date,
      terms,
      status,
      signed_by_school,
      signed_by_platform
    } = req.body;

    const { data: current, error: getError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!current) return res.status(404).json({ error: 'Contract not found' });

    const updateData = {
      start_date: start_date || current.start_date,
      end_date: end_date || current.end_date,
      terms: terms !== undefined ? terms : current.terms,
      status: status || current.status,
      updated_at: new Date().toISOString()
    };

    if (signed_by_school !== undefined) {
      updateData.signed_by_school = signed_by_school;
      if (signed_by_school) updateData.school_signature_date = new Date().toISOString();
    }

    if (signed_by_platform !== undefined) {
      updateData.signed_by_platform = signed_by_platform;
      if (signed_by_platform) updateData.platform_signature_date = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        school:schools(id, name, email),
        subscription:subscriptions(id, plan_type, amount)
      `)
      .single();

    if (error) throw error;

    res.json({ message: 'Contract updated successfully', contract: data });
  } catch (err) {
    console.error('[UPDATE CONTRACT ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
