const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const url = new URL(process.env.SUPABASE_URL);
const projectId = url.hostname.split('.')[0];
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

// Try the pooler host without region
const connectionString = `postgresql://postgres.${projectId}:${serviceKey}@pooler.supabase.co:6543/postgres?sslmode=require`;

console.log('Trying connection string:', connectionString.replace(serviceKey, '***'));

const client = new Client({
  connectionString,
});

async function test() {
  try {
    await client.connect();
    console.log('Connected successfully');
    const res = await client.query('SELECT version();');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

test();