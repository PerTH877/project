const pool = require('../config/db');

const getAllWarehouses = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Warehouses WHERE is_active = TRUE ORDER BY warehouse_id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const createWarehouse = async (req, res) => {
  const { name, street_address, city, zip_code, capacity } = req.body;
  if (!name || !street_address || !city) {
    return res.status(400).json({ error: 'name, street_address, and city are required' });
  }
  const cap = capacity === undefined || capacity === null ? null : Number(capacity);
  if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
    return res.status(400).json({ error: 'capacity must be a number >= 0' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const newWarehouse = await client.query(
      `insert into warehouses (name, street_address ,city , zip_code , capacity)
       values($1,$2, $3 , $4, $5)
       returning *`,
      [String(name).trim(), String(street_address).trim(), String(city).trim(), zip_code || null, cap]
    );
    await client.query('COMMIT');
    return res.json(newWarehouse.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(err.message);
    return res.status(500).send('Server Error');
  } finally {
    if (client) client.release();
  }
};

module.exports = { getAllWarehouses, createWarehouse };