const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const pool = require('./server/config/db');

async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cart';");
    console.log("Cart Columns:", res.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
