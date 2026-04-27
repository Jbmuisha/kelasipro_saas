const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const url = new URL(process.env.SUPABASE_URL);
const projectId = url.hostname.split('.')[0];

// Try direct connection to the Supabase host (without db.) on port 5432
const connectionString = `postgresql://postgres:${process.env.SUPABASE_SERVICE_KEY}@${projectId}.supabase.co:5432/postgres?sslmode=require`;

console.log('Connection string:', connectionString.replace(process.env.SUPABASE_SERVICE_KEY, '***'));

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
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