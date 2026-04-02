const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function test() {
  console.log('Testing connection to Supabase...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    console.log('Successfully connected!');
    const res = await client.query('SELECT NOW()');
    console.log('Time from DB:', res.rows[0].now);
    client.release();
  } catch(e) {
    console.error('Connection failed:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
test();
