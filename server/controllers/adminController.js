const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: "Admin credentials are not configured on the server" });
    }

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "admin", email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("adminLogin:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const listPendingSellers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT seller_id, company_name, contact_email, gst_number, is_verified
       FROM Sellers
       WHERE is_verified = FALSE
       ORDER BY seller_id DESC`
    );

    return res.json({ sellers: result.rows });
  } catch (err) {
    console.error("listPendingSellers:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const verifySeller = async (req, res) => {
  const sellerId = Number(req.params.seller_id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return res.status(400).json({ error: 'seller_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE Sellers
       SET is_verified = TRUE
       WHERE seller_id = $1
       RETURNING seller_id, company_name, contact_email, is_verified`,
      [sellerId]
    );
    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Seller not found' });
    }
    await client.query('COMMIT');
    return res.json({ message: 'Seller verified', seller: updated.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('verifySeller:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------------------------------------------------------
// Analytics endpoints for admin.  These handlers return various
// aggregated statistics across multiple tables.  They use complex SQL
// queries involving joins, grouping and ordering to satisfy the
// “complex query” requirements of the project checklist.  Only admins
// should be able to access these endpoints via adminRoutes.

/**
 * GET /api/admin/analytics/top-categories
 * Returns the top 5 categories ranked by the number of products.  The
 * category name and count of products are returned in descending order.
 */
const getTopCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.category_id
       GROUP BY c.category_id, c.name
       ORDER BY product_count DESC, c.name ASC
       LIMIT 5`
    );
    return res.json({ categories: result.rows });
  } catch (err) {
    console.error('getTopCategories:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/admin/analytics/top-sellers
 * Returns the top 5 sellers ranked by total sales.  Sales are computed as
 * the sum of quantity multiplied by unit_price across all order_items for
 * products sold by a seller.  Sellers with no sales appear with zero.
 */
const getTopSellers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.seller_id, s.company_name,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales
       FROM sellers s
       LEFT JOIN products p ON p.seller_id = s.seller_id
       LEFT JOIN product_variants pv ON pv.product_id = p.product_id
       LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
       GROUP BY s.seller_id, s.company_name
       ORDER BY total_sales DESC, s.company_name ASC
       LIMIT 5`
    );
    return res.json({ sellers: result.rows });
  } catch (err) {
    console.error('getTopSellers:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/admin/analytics/top-products
 * Returns the top 5 products ranked by popularity, defined as the total
 * number of times a product's variants appear in carts or wishlist items.
 */
const getTopProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.title,
              COALESCE(SUM(CASE WHEN c.cart_id IS NOT NULL THEN 1 ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN wi.item_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS popularity
       FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.product_id
       LEFT JOIN cart c ON c.variant_id = pv.variant_id
       LEFT JOIN wishlist_items wi ON wi.variant_id = pv.variant_id
       GROUP BY p.product_id, p.title
       ORDER BY popularity DESC, p.title ASC
       LIMIT 5`
    );
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('getTopProducts:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  adminLogin,
  listPendingSellers,
  verifySeller,
  getTopCategories,
  getTopSellers,
  getTopProducts,
};