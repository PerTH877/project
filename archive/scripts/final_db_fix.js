const { Client } = require('pg');

async function fix() {
  const client = new Client({
    connectionString: "postgresql://postgres.aouerodvyfbbzlsprusv:%23Genocide%3Dmassmurder@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });
  
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected to Supabase.. Altering table');
    await client.query("SET statement_timeout = '15s'");
    
    // forcefully terminate active queries if any are held
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid();
    `);
    
    await client.query(`
      ALTER TABLE cart 
      ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('Successfully completed schema changes.');
  } catch(e) {
    console.error('Error modifying db:', e.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}
fix();
