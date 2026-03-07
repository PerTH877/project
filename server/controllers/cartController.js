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

// Exported at the end of the file with all handlers.  Do not add
// exports here as it will be overridden.
// -----------------------------------------------------------------------------
// Additional controller to compute the current total value of the user's cart.
// This endpoint calls the get_cart_total() function defined in the database.
// It is separated here so that it can be wired into cartRoutes without
// duplicating authentication logic.  If the function or table definitions are
// missing from the database an error is returned.  The response includes a
// decimal total with two fractional digits.

/**
 * GET /api/cart/total
 * Returns the total price of all items in the authenticated user's cart.  The
 * calculation multiplies the quantity of each item by the sum of the base
 * price and any price adjustment defined on the variant.  Uses the
 * get_cart_total(p_user_id) PL/pgSQL function.  Expects authMiddleware to
 * populate req.user.user_id.  Responds with JSON: { total: <number> }.
 */
const getCartTotal = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT get_cart_total($1) AS total', [userId]);
    const total = result.rows[0]?.total ?? 0;
    return res.json({ total: Number(total) });
  } catch (err) {
    console.error('getCartTotal:', err.message);
    return res.status(500).json({ error: 'Server error computing cart total' });
  }
};

/**
 * POST /api/cart/checkout
 * Creates an order for the authenticated user using the proc_create_order
 * stored procedure.  Requires the request body to include an address_id.
 * If the cart is empty or the address_id is invalid a 400 error is
 * returned.  On success returns the new order_id and clears the cart.
 */
const checkout = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const addressId = Number(req.body.address_id);
  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ error: 'address_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const cartCountRes = await client.query('SELECT COUNT(*)::int AS count FROM cart WHERE user_id = $1', [userId]);
    if (cartCountRes.rows[0].count === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty. Add items before checkout.' });
    }
    // Call the stored procedure.  The OUT parameter is ignored; the
    // procedure handles order creation internally.
    await client.query('CALL proc_create_order($1, $2, NULL)', [userId, addressId]);
    const orderRes = await client.query(
      'SELECT order_id FROM orders WHERE user_id = $1 ORDER BY order_id DESC LIMIT 1',
      [userId],
    );
    await client.query('COMMIT');
    const newOrderId = orderRes.rows[0]?.order_id;
    return res.status(201).json({ message: 'Order created', order_id: newOrderId });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('checkout:', err.message);
    return res.status(500).json({ error: 'Server error during checkout' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { getCartItems, addToCart, updateCartItem, removeCartItem, getCartTotal, checkout };