const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const url = new URL(process.env.SUPABASE_URL);
const projectId = url.hostname.split('.')[0];
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const connectionAttempts = [
  { host: `${projectId}.supabase.co`, port: 5432, label: 'direct (no db., port 5432)' },
  { host: `${projectId}.supabase.co`, port: 6543, label: 'pooler (no db., port 6543)' },
  { host: `db.${projectId}.supabase.co`, port: 5432, label: 'direct (with db., port 5432)' },
  { host: `db.${projectId}.supabase.co`, port: 6543, label: 'pooler (with db., port 6543)' },
];

async function tryConnection(attempt) {
  const connectionString = `postgresql://postgres:${serviceKey}@${attempt.host}:${attempt.port}/postgres?sslmode=require`;
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log(`Connected via ${attempt.label}`);
    await client.end();
    return { success: true, connectionString };
  } catch (err) {
    console.log(`Failed via ${attempt.label}: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    // Ensure client is ended if it was created
    if (client._ending === false) {
      await client.end().catch(() => {});
    }
  }
}

async function main() {
  for (const attempt of connectionAttempts) {
    const result = await tryConnection(attempt);
    if (result.success) {
      console.log(`\nSuccess! Using connection string:`);
      console.log(result.connectionString.replace(serviceKey, '***'));
      return;
    }
  }
  console.log('\nAll connection attempts failed.');
}

main();