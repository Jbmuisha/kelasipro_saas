const { supabaseAdmin } = require('./utils/supabase');
const fs = require('fs');
const path = require('path');

async function createTables() {
  try {
    // Read the schema.sql file
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
        const { error } = await supabaseAdmin.query(statement);
        if (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
          console.error(error);
          // Depending on the error, we might want to continue or break
          // For example, if the table already exists, we can continue
          if (error.code && error.code === '42P07') { // duplicate_table
            console.log('Table already exists, continuing...');
            continue;
          }
        } else {
          console.log(`Executed: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        console.error(`Exception executing statement: ${statement.substring(0, 100)}...`);
        console.error(err);
      }
    }

    console.log('Tables creation process completed');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

createTables();