const pool = require('../config/db');

const createWishlist = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { name, is_public } = req.body;
  const nameVal = name && typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'My Wishlist';
  const isPublicBool = is_public === true || is_public === 'true' || is_public === 1 || is_public === '1';
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO wishlists (user_id, name, is_public)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, nameVal, isPublicBool]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Wishlist created', wishlist: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('createWishlist:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const getWishlists = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const wishRes = await pool.query('SELECT * FROM wishlists WHERE user_id = $1 ORDER BY wishlist_id ASC', [userId]);
    const ids = wishRes.rows.map((w) => w.wishlist_id);
    const itemsMap = {};
    if (ids.length > 0) {
      const itemsRes = await pool.query(
        'SELECT wishlist_id, variant_id FROM wishlist_items WHERE wishlist_id = ANY($1::int[])',
        [ids]
      );
      for (const row of itemsRes.rows) {
        if (!itemsMap[row.wishlist_id]) itemsMap[row.wishlist_id] = [];
        itemsMap[row.wishlist_id].push(row.variant_id);
      }
    }
    const result = wishRes.rows.map((w) => {
      return { ...w, items: itemsMap[w.wishlist_id] || [] };
    });
    return res.json({ wishlists: result });
  } catch (err) {
    console.error('getWishlists:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

const addWishlistItem = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const wishlistId = Number(req.params.wishlist_id);
  const { variant_id } = req.body;
  const vid = Number(variant_id);
  if (!Number.isInteger(wishlistId) || wishlistId <= 0) {
    return res.status(400).json({ error: 'wishlist_id must be a positive integer' });
  }
  if (!Number.isInteger(vid) || vid <= 0) {
    return res.status(400).json({ error: 'variant_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const wlRes = await client.query('SELECT user_id FROM wishlists WHERE wishlist_id = $1', [wishlistId]);
    if (wlRes.rows.length === 0 || wlRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    const variantRes = await client.query('SELECT variant_id FROM product_variants WHERE variant_id = $1', [vid]);
    if (variantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid variant_id' });
    }
    await client.query(
      `INSERT INTO wishlist_items (wishlist_id, variant_id)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id, variant_id) DO NOTHING`,
      [wishlistId, vid]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Item added to wishlist' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('addWishlistItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const removeWishlistItem = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const wishlistId = Number(req.params.wishlist_id);
  const variantId = Number(req.params.variant_id);
  if (!Number.isInteger(wishlistId) || wishlistId <= 0) {
    return res.status(400).json({ error: 'wishlist_id must be a positive integer' });
  }
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return res.status(400).json({ error: 'variant_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const wlRes = await client.query('SELECT user_id FROM wishlists WHERE wishlist_id = $1', [wishlistId]);
    if (wlRes.rows.length === 0 || wlRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    await client.query('DELETE FROM wishlist_items WHERE wishlist_id = $1 AND variant_id = $2', [wishlistId, variantId]);
    await client.query('COMMIT');
    return res.json({ message: 'Item removed from wishlist' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('removeWishlistItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { createWishlist, getWishlists, addWishlistItem, removeWishlistItem };