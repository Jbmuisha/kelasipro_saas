/**
 * Seed Super Admin User
 * Run this script to create the super admin user in Supabase
 * 
 * Usage: node seed_super_admin.js
 * 
 * Before running, make sure your server/.env has valid Supabase credentials
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('./utils/supabase');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'jboyGolden';

async function seedSuperAdmin() {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, salt);

    console.log('[SEED] Creating super admin user...');
    console.log('[SEED] Email:', SUPER_ADMIN_EMAIL);
    console.log('[SEED] Password:', SUPER_ADMIN_PASSWORD);
    console.log('[SEED] Hashed Password:', hashedPassword);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', SUPER_ADMIN_EMAIL)
      .single();

    if (existingUser) {
      console.log('[SEED] User already exists, updating password...');
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          unique_id: 'super_admin_1',
          name: SUPER_ADMIN_NAME
        })
        .eq('email', SUPER_ADMIN_EMAIL)
        .select();

      if (updateError) throw updateError;
      console.log('[SEED] Super admin updated successfully!');
      console.log('[SEED] User:', updatedUser);
    } else {
      console.log('[SEED] Creating new super admin user...');
      
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          name: SUPER_ADMIN_NAME,
          email: SUPER_ADMIN_EMAIL,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          unique_id: 'super_admin_1'
        })
        .select();

      if (insertError) throw insertError;
      console.log('[SEED] Super admin created successfully!');
      console.log('[SEED] User:', newUser);
    }

    console.log('\n✅ Super admin seeded successfully!');
    console.log('   Email: jbmuisha@gmail.com');
    console.log('   Password: 1234567890');
    
  } catch (error) {
    console.error('[SEED ERROR]', error.message);
    process.exit(1);
  }
}

seedSuperAdmin();