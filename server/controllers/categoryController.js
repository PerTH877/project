const pool = require("../config/db");


const createCategory = async (req, res) => {
  const { parent_id = null, name, description = null } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required (string)' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    if (parent_id !== null) {
      const p = await client.query('SELECT 1 FROM Categories WHERE category_id = $1', [parent_id]);
      if (p.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid parent_id (category not found)' });
      }
    }
    const result = await client.query(
      `INSERT INTO Categories (parent_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parent_id, name.trim(), description]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Category created', category: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('createCategory:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};



const listCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category_id, parent_id, name, description
       FROM Categories
       ORDER BY category_id ASC`
    );
    return res.json({ categories: result.rows });
  } catch (err) {
    console.error("listCategories:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createCategory, listCategories };