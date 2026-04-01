const pool = require('./server/config/db');

async function fix() {
  const client = await pool.connect();
  try {
    // Kill all other connections forcefully
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid();
    `);
    console.log('All other db connections terminated.');

    // Now alter table!
    await client.query(`
      ALTER TABLE cart 
      ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Cart schema successfully migrated.');

  } catch (err) {
    console.error('Error during migration:', err.stack);
  } finally {
    client.release();
    process.exit(0);
  }
}
fix();
