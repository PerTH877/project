const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const registerSeller = async (req, res) => {
  const companyName = normalizeText(req.body.company_name);
  const contactEmail = normalizeEmail(req.body.contact_email);
  const password = String(req.body.password || "");
  const gstNumber = normalizeText(req.body.gst_number);

  if (!companyName) {
    return res
      .status(400)
      .json({ error: "company_name is required and must be a non-empty string" });
  }

  if (!contactEmail) {
    return res.status(400).json({ error: "contact_email is required" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const sellerCheck = await client.query(
      "SELECT seller_id FROM sellers WHERE contact_email = $1",
      [contactEmail]
    );

    if (sellerCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "A seller with this email already exists" });
    }

    const newSeller = await client.query(
      `INSERT INTO sellers (company_name, contact_email, password_hash, gst_number, is_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING seller_id, company_name, contact_email, gst_number, rating, is_verified, balance`,
      [companyName, contactEmail, passwordHash, gstNumber]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Seller application received. Admin verification is required before login.",
      seller: newSeller.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("registerSeller:", err.message);
    if (err.code === "23505") {
      return res.status(409).json({ error: "A seller with this email already exists" });
    }
    return res.status(500).json({ error: "Failed to register seller" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const loginSeller = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "password is required" });
    }

    const sellerResult = await pool.query(
      `SELECT seller_id, company_name, contact_email, password_hash, is_verified
       FROM sellers
       WHERE contact_email = $1`,
      [email]
    );

    if (!sellerResult.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const seller = sellerResult.rows[0];
    const validPassword = await bcrypt.compare(password, seller.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!seller.is_verified) {
      return res.status(403).json({
        error: "Seller verification pending",
        seller: {
          seller_id: seller.seller_id,
          company_name: seller.company_name,
          contact_email: seller.contact_email,
          is_verified: seller.is_verified,
        },
      });
    }

    const token = jwt.sign(
      { seller_id: seller.seller_id, role: "seller" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      seller: {
        seller_id: seller.seller_id,
        company_name: seller.company_name,
        contact_email: seller.contact_email,
        is_verified: seller.is_verified,
      },
    });
  } catch (err) {
    console.error("loginSeller:", err.message);
    return res.status(500).json({ error: "Failed to log in seller" });
  }
};

const getSellerProfile = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      `SELECT
         seller_id,
         company_name,
         contact_email,
         gst_number,
         rating,
         is_verified,
         balance
       FROM sellers
       WHERE seller_id = $1
       LIMIT 1`,
      [sellerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Seller not found" });
    }

    return res.json({
      seller: {
        ...result.rows[0],
        rating: Number(result.rows[0].rating ?? 0),
        balance: Number(result.rows[0].balance ?? 0),
      },
    });
  } catch (err) {
    console.error("getSellerProfile:", err.message);
    return res.status(500).json({ error: "Failed to load seller profile" });
  }
};

const getSellerDashboard = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [summaryResult, lowStockResult, recentOrdersResult, warehouseResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(DISTINCT p.product_id)::int AS product_count,
           COUNT(DISTINCT pv.variant_id)::int AS variant_count,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales,
           COALESCE(SUM(oi.seller_earning), 0)::numeric(12,2) AS seller_earnings,
           COUNT(DISTINCT o.order_id)::int AS order_count
         FROM sellers s
         LEFT JOIN products p ON p.seller_id = s.seller_id AND p.is_active = TRUE
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         WHERE s.seller_id = $1
         GROUP BY s.seller_id`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           p.product_id,
           p.title,
           pv.variant_id,
           pv.sku,
           COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         WHERE p.seller_id = $1 AND p.is_active = TRUE AND pv.is_active = TRUE
         GROUP BY p.product_id, pv.variant_id
         HAVING COALESCE(SUM(i.stock_quantity), 0) <= 8
         ORDER BY available_stock ASC, p.title ASC
         LIMIT 8`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           o.order_id,
           o.status,
           o.order_date,
           COUNT(oi.item_id)::int AS item_count,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales,
           u.full_name AS customer_name,
           sh.status AS shipment_status
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.order_id
         JOIN product_variants pv ON pv.variant_id = oi.variant_id
         JOIN products p ON p.product_id = pv.product_id
         JOIN users u ON u.user_id = o.user_id
         LEFT JOIN shipments sh ON sh.order_id = o.order_id
         WHERE p.seller_id = $1
         GROUP BY o.order_id, u.full_name, sh.status
         ORDER BY o.order_date DESC, o.order_id DESC
         LIMIT 6`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           w.warehouse_id,
           w.name,
           w.city,
           COUNT(DISTINCT pv.variant_id)::int AS active_variants,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
         FROM warehouses w
         JOIN inventory i ON i.warehouse_id = w.warehouse_id
         JOIN product_variants pv ON pv.variant_id = i.variant_id
         JOIN products p ON p.product_id = pv.product_id
         WHERE p.seller_id = $1
         GROUP BY w.warehouse_id
         ORDER BY stock_units DESC, w.city ASC`,
        [sellerId]
      ),
    ]);

    const summary = summaryResult.rows[0] || {};

    return res.json({
      summary: {
        product_count: Number(summary.product_count ?? 0),
        variant_count: Number(summary.variant_count ?? 0),
        gross_sales: Number(summary.gross_sales ?? 0),
        seller_earnings: Number(summary.seller_earnings ?? 0),
        order_count: Number(summary.order_count ?? 0),
      },
      low_stock: lowStockResult.rows.map((row) => ({
        ...row,
        available_stock: Number(row.available_stock ?? 0),
      })),
      recent_orders: recentOrdersResult.rows.map((row) => ({
        ...row,
        item_count: Number(row.item_count ?? 0),
        gross_sales: Number(row.gross_sales ?? 0),
      })),
      inventory_by_warehouse: warehouseResult.rows.map((row) => ({
        ...row,
        active_variants: Number(row.active_variants ?? 0),
        stock_units: Number(row.stock_units ?? 0),
      })),
    });
  } catch (err) {
    console.error("getSellerDashboard:", err.message);
    return res.status(500).json({ error: "Failed to load seller dashboard" });
  }
};

const getSellerAnalytics = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [salesTrendResult, topProductsResult, categoryResult, alertsResult] = await Promise.all([
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', o.order_date), 'Mon YYYY') AS month_label,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales,
           COALESCE(SUM(oi.seller_earning), 0)::numeric(12,2) AS seller_earnings,
           COUNT(DISTINCT o.order_id)::int AS order_count
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.order_id
         JOIN product_variants pv ON pv.variant_id = oi.variant_id
         JOIN products p ON p.product_id = pv.product_id
         WHERE p.seller_id = $1
         GROUP BY DATE_TRUNC('month', o.order_date)
         ORDER BY DATE_TRUNC('month', o.order_date) ASC`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           p.product_id,
           p.title,
           COUNT(oi.item_id)::int AS order_items,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales,
           COALESCE(AVG(r.rating)::numeric(10,2), 0) AS avg_rating,
           COUNT(DISTINCT r.review_id)::int AS review_count
         FROM products p
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN reviews r ON r.product_id = p.product_id
         WHERE p.seller_id = $1
         GROUP BY p.product_id
         ORDER BY gross_sales DESC, units_sold DESC, p.title ASC
         LIMIT 8`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           c.name AS category_name,
           COUNT(DISTINCT p.product_id)::int AS product_count,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales
         FROM products p
         LEFT JOIN categories c ON c.category_id = p.category_id
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         WHERE p.seller_id = $1
         GROUP BY c.name
         ORDER BY gross_sales DESC, product_count DESC`,
        [sellerId]
      ),
      pool.query(
        `SELECT
           p.title,
           pv.sku,
           COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         WHERE p.seller_id = $1
         GROUP BY p.title, pv.sku
         HAVING COALESCE(SUM(i.stock_quantity), 0) <= 8
         ORDER BY available_stock ASC, p.title ASC
         LIMIT 10`,
        [sellerId]
      ),
    ]);

    return res.json({
      sales_trend: salesTrendResult.rows.map((row) => ({
        month_label: row.month_label,
        gross_sales: Number(row.gross_sales ?? 0),
        seller_earnings: Number(row.seller_earnings ?? 0),
        order_count: Number(row.order_count ?? 0),
      })),
      top_products: topProductsResult.rows.map((row) => ({
        ...row,
        order_items: Number(row.order_items ?? 0),
        units_sold: Number(row.units_sold ?? 0),
        gross_sales: Number(row.gross_sales ?? 0),
        avg_rating: Number(row.avg_rating ?? 0),
        review_count: Number(row.review_count ?? 0),
      })),
      category_breakdown: categoryResult.rows.map((row) => ({
        category_name: row.category_name || "Uncategorized",
        product_count: Number(row.product_count ?? 0),
        gross_sales: Number(row.gross_sales ?? 0),
      })),
      stock_alerts: alertsResult.rows.map((row) => ({
        ...row,
        available_stock: Number(row.available_stock ?? 0),
      })),
    });
  } catch (err) {
    console.error("getSellerAnalytics:", err.message);
    return res.status(500).json({ error: "Failed to load seller analytics" });
  }
};

module.exports = {
  registerSeller,
  loginSeller,
  getSellerProfile,
  getSellerDashboard,
  getSellerAnalytics,
};
