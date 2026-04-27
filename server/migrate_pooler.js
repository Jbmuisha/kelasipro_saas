const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const url = new URL(process.env.SUPABASE_URL);
const projectId = url.hostname.split('.')[0];

// Using Supabase connection pooler (PgBouncer) for direct database access
// Host: <project_id>.supabase.co
// Port: 6543
// User: postgres.[project_id]
// Password: SUPABASE_SERVICE_KEY (service_role JWT)
const connectionString = `postgresql://postgres.${projectId}:${process.env.SUPABASE_SERVICE_KEY}@${projectId}.supabase.co:6543/postgres?sslmode=require`;

const client = new Client({
  connectionString,
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database via PgBouncer');

    // Read the schema.sql file
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Split SQL into individual statements (naive split by semicolon, but works for our case)
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      // Skip comments and empty lines
      if (statement.startsWith('--') || statement === '') {
        continue;
      }
      try {
        await client.query(statement);
        console.log(`Executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
        console.error(err.message);
        // Continue with other statements
      }
    }

    console.log('Migrations completed');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigrations();