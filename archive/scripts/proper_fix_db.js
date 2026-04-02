require('dotenv').config({ path: './server/.env' });
const { Client } = require('pg');

async function fix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to Supabase.. Altering table');
    // Using an explicit timeout so it doesn't hang forever
    await client.query("SET statement_timeout = '15s'");
    await client.query(`
      ALTER TABLE cart 
      ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('Successfully completed schema changes. Added is_saved and added_at.');
  } catch(e) {
    console.error('Error modifying db:', e.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}
fix();
