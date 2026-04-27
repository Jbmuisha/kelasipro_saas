const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const ips = ['172.64.149.246', '104.18.38.10'];
const ports = [5432, 6543];

async function tryConnection(ip, port) {
  const connectionString = `postgresql://postgres:${serviceKey}@${ip}:${port}/postgres?sslmode=require`;
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log(`Connected to ${ip}:${port}`);
    await client.end();
    return { success: true, ip, port };
  } catch (err) {
    console.log(`Failed to connect to ${ip}:${port}: ${err.message}`);
    return { success: false, ip, port, error: err.message };
  } finally {
    if (client._ending === false) {
      await client.end().catch(() => {});
    }
  }
}

async function main() {
  for (const ip of ips) {
    for (const port of ports) {
      const result = await tryConnection(ip, port);
      if (result.success) {
        console.log(`\nSuccess! Using ${result.ip}:${result.port}`);
        // Now we can run the migrations
        await runMigrations(result.ip, result.port, serviceKey);
        return;
      }
    }
  }
  console.log('\nAll connection attempts failed.');
}

async function runMigrations(ip, port, serviceKey) {
  const connectionString = `postgresql://postgres:${serviceKey}@${ip}:${port}/postgres?sslmode=require`;
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('Connected to database for migrations');

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

main();