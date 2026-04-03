
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected!');
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
