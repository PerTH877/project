require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const shouldReset = process.argv.includes('--reset');

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    if (shouldReset) {
      console.log('Resetting public schema...');
      await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    }
    
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
