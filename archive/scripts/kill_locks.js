const pool = require('./server/config/db');

async function clearLocks() {
  try {
    const res = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() AND pid <> pg_backend_pid()
    `);
    console.log('Terminated backends:', res.rowCount);
  } catch (err) {
    console.error('Error terminating:', err.message);
  } finally {
    process.exit(0);
  }
}

clearLocks();
