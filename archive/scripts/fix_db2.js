const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.aouerodvyfbbzlsprusv:%23Genocide%3Dmassmurder@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
});

async function run() {
  try {
    console.log("Adding is_saved to cart...");
    await pool.query("ALTER TABLE cart ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;");
    console.log("Success");
    process.exit(0);
  } catch (err) {
    console.error("Error adding is_saved:", err.message);
    process.exit(1);
  }
}

run();
