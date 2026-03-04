const pool = require('../config/db');

const getCartItems = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      `SELECT cart_id, variant_id, quantity, added_at
       FROM cart
       WHERE user_id = $1
       ORDER BY cart_id ASC`,
      [userId]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('getCartItems:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

const addToCart = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  let { variant_id, quantity } = req.body;
  const vid = Number(variant_id);
  const qty = Number(quantity);
  if (!Number.isInteger(vid) || vid <= 0) {
    return res.status(400).json({ error: 'variant_id must be a positive integer' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const variantRes = await client.query('SELECT variant_id FROM product_variants WHERE variant_id = $1', [vid]);
    if (variantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid variant_id' });
    }
    const existing = await client.query(
      'SELECT cart_id, quantity FROM cart WHERE user_id = $1 AND variant_id = $2',
      [userId, vid]
    );
    let cartItem;
    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      const updateRes = await client.query(
        'UPDATE cart SET quantity = $1, added_at = NOW() WHERE cart_id = $2 RETURNING *',
        [newQty, existing.rows[0].cart_id]
      );
      cartItem = updateRes.rows[0];
    } else {
      const insertRes = await client.query(
        'INSERT INTO cart (user_id, variant_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [userId, vid, qty]
      );
      cartItem = insertRes.rows[0];
    }
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Cart updated', item: cartItem });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('addToCart:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const updateCartItem = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const cartId = Number(req.params.cart_id);
  let { quantity } = req.body;
  const qty = Number(quantity);
  if (!Number.isInteger(cartId) || cartId <= 0) {
    return res.status(400).json({ error: 'cart_id must be a positive integer' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const cartRes = await client.query('SELECT cart_id, user_id FROM cart WHERE cart_id = $1', [cartId]);
    if (cartRes.rows.length === 0 || cartRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cart item not found' });
    }
    const updateRes = await client.query(
      'UPDATE cart SET quantity = $1 WHERE cart_id = $2 RETURNING *',
      [qty, cartId]
    );
    await client.query('COMMIT');
    return res.json({ message: 'Cart item updated', item: updateRes.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('updateCartItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const removeCartItem = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const cartId = Number(req.params.cart_id);
  if (!Number.isInteger(cartId) || cartId <= 0) {
    return res.status(400).json({ error: 'cart_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const cartRes = await client.query('SELECT cart_id, user_id FROM cart WHERE cart_id = $1', [cartId]);
    if (cartRes.rows.length === 0 || cartRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cart item not found' });
    }
    await client.query('DELETE FROM cart WHERE cart_id = $1', [cartId]);
    await client.query('COMMIT');
    return res.json({ message: 'Cart item removed' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('removeCartItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { getCartItems, addToCart, updateCartItem, removeCartItem };