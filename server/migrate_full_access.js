const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[migrate_full_access] ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('[migrate_full_access] Starting migration via Supabase REST API...');

    // 1. Add full_access column using raw SQL via RPC (if available) or via REST
    // Supabase doesn't expose ALTER TABLE directly via REST, so we use the pg helper
    // But since pg pooler hangs, let's try using the Supabase management API or
    // just use the pg module with a timeout and alternative connection methods

    const { Client } = require('pg');
    const url = new URL(supabaseUrl);
    const projectId = url.hostname.split('.')[0];

    // Try multiple connection strategies
    const connectionStrings = [
      // Strategy 1: PgBouncer pooler with sslmode=require
      `postgresql://postgres.${projectId}:${supabaseServiceKey}@${projectId}.supabase.co:6543/postgres?sslmode=require`,
      // Strategy 2: Direct connection port 5432
      `postgresql://postgres.${projectId}:${supabaseServiceKey}@${projectId}.supabase.co:5432/postgres?sslmode=require`,
      // Strategy 3: Pooler with region prefix
      `postgresql://postgres.${projectId}:${supabaseServiceKey}@aws-us-east-1-pooler.supabase.co:6543/postgres?sslmode=require`,
      // Strategy 4: Direct IP (using Supabase IPs from final_migrate.js pattern)
      // We don't know the exact IPs, so we'll skip this unless needed
    ];

    let connected = false;
    let client = null;

    for (const connStr of connectionStrings) {
      if (connected) break;
      console.log(`[migrate_full_access] Trying connection...`);
      client = new Client({
        connectionString: connStr,
        connectionTimeoutMillis: 10000, // 10 second timeout
      });
      try {
        await client.connect();
        console.log('[migrate_full_access] Connected!');
        connected = true;
      } catch (err) {
        console.log(`[migrate_full_access] Connection failed: ${err.message}`);
        try { await client.end(); } catch (e) {}
      }
    }

    if (!connected || !client) {
      console.error('[migrate_full_access] All direct connections failed.');
      console.error('[migrate_full_access] Please run this SQL directly in your Supabase SQL Editor:');
      console.error('');
      console.error('  ALTER TABLE schools ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT TRUE;');
      console.error('  UPDATE schools SET full_access = TRUE WHERE full_access IS NULL;');
      console.error('');
      process.exit(1);
    }

    // 1. Add full_access column if it doesn't exist
    console.log('[migrate_full_access] Running: ALTER TABLE schools ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT TRUE');
    await client.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT TRUE;');
    console.log('[migrate_full_access] ALTER TABLE completed');

    // 2. Backfill existing rows where full_access is NULL
    const updateResult = await client.query('UPDATE schools SET full_access = TRUE WHERE full_access IS NULL;');
    console.log(`[migrate_full_access] Backfilled ${updateResult.rowCount} row(s)`);

    // 3. Verify the column exists and show sample data
    const verifyResult = await client.query('SELECT id, name, full_access FROM schools LIMIT 5;');
    console.log('[migrate_full_access] Verification sample:', verifyResult.rows);

    await client.end();

    console.log('[migrate_full_access] Migration completed successfully!');
    console.log('[migrate_full_access] IMPORTANT: Wait 10-30 seconds for Supabase PostgREST to refresh its schema cache before testing the API.');
  } catch (err) {
    console.error('[migrate_full_access] Migration failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runMigration();

