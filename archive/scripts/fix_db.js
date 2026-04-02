const pool = require('./server/config/db');

async function fixDb() {
  try {
    await pool.query(`
      ALTER TABLE cart 
      ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Successfully updated cart table schema.');
  } catch (err) {
    console.error('Error updating cart table:', err);
  } finally {
    process.exit(0);
  }
}

fixDb();
