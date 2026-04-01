require('dotenv').config({ path: './server/.env' });
const { Client } = require('pg');

async function fix() {
  const configPath = './server/config/db';
  const pool = require(configPath);
  
  const client = new Client(pool.options);
  
  try {
    await client.connect();
    console.log('Connected natively to PG.. killing other locks now');
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid();
    `);
    console.log('Killed all other PG connections to clear locks.');

    await client.query(`
      ALTER TABLE cart 
      ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Successfully completed schema changes.');
  } catch(e) {
    console.error('Error:', e.stack);
  } finally {
    await client.end();
    process.exit(0);
  }
}
fix();
