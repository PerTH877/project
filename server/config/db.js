const { Pool } = require('pg');
require('dotenv').config();

console.log("-> URL Check:", process.env.DATABASE_URL ? "URL FOUND!" : "URL IS UNDEFINED!");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = pool;