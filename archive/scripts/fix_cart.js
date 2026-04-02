const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'paruvo_db',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

pool.query('ALTER TABLE cart ADD COLUMN is_saved BOOLEAN DEFAULT FALSE;')
  .then(() => {
    console.log('SUCCESS: Injected `is_saved` column to database.');
  })
  .catch(err => {
    // 42701 is the Postgres error code for "column already exists"
    if (err.code === '42701') {
       console.log('SKIPPED: Column `is_saved` already exists in the `cart` table.');
    } else {
       console.error('ERROR:', err);
    }
  })
  .finally(() => {
    pool.end();
    process.exit(0);
  });
