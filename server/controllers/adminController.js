const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const asNumber = (value) => Number(value ?? 0);

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

const getCurrentAdmin = async (req, res) => {
  if (!req.user?.email || req.user.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({
    admin: {
      email: req.user.email,
      role: req.user.role,
    },
  });
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

const getAdminOverview = async (_req, res) => {
  try {
    const [summaryResult, warehouseResult] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM users) AS customer_count,
           (SELECT COUNT(*)::int FROM sellers WHERE is_verified = TRUE) AS verified_seller_count,
           (SELECT COUNT(*)::int FROM sellers WHERE is_verified = FALSE) AS pending_seller_count,
           (SELECT COUNT(*)::int FROM products WHERE is_active = TRUE) AS active_product_count,
           (SELECT COUNT(*)::int FROM orders) AS order_count,
           (SELECT COALESCE(SUM(total_amount), 0)::numeric(12,2) FROM orders) AS gross_merchandise_value`
      ),
      pool.query(
        `SELECT
           w.warehouse_id,
           w.name,
           w.city,
           COUNT(DISTINCT i.variant_id)::int AS tracked_variants,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
         FROM warehouses w
         LEFT JOIN inventory i ON i.warehouse_id = w.warehouse_id
         WHERE w.is_active = TRUE
         GROUP BY w.warehouse_id
         ORDER BY stock_units DESC, w.city ASC`
      ),
    ]);

    const summary = summaryResult.rows[0] || {};
    return res.json({
      summary: {
        customer_count: Number(summary.customer_count ?? 0),
        verified_seller_count: Number(summary.verified_seller_count ?? 0),
        pending_seller_count: Number(summary.pending_seller_count ?? 0),
        active_product_count: Number(summary.active_product_count ?? 0),
        order_count: Number(summary.order_count ?? 0),
        gross_merchandise_value: Number(summary.gross_merchandise_value ?? 0),
      },
      warehouses: warehouseResult.rows.map((row) => ({
        ...row,
        tracked_variants: Number(row.tracked_variants ?? 0),
        stock_units: Number(row.stock_units ?? 0),
      })),
    });
  } catch (err) {
    console.error("getAdminOverview:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getSellerPerformance = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH seller_base AS (
         SELECT
           s.seller_id,
           s.company_name,
           COALESCE(s.rating, 0)::numeric(10,2) AS rating,
           COUNT(DISTINCT p.product_id) FILTER (WHERE p.is_active = TRUE)::int AS active_products
         FROM sellers s
         LEFT JOIN products p ON p.seller_id = s.seller_id
         GROUP BY s.seller_id
       ),
       sales AS (
         SELECT
           p.seller_id,
           COUNT(DISTINCT o.order_id)::int AS total_orders,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS total_gmv,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           COALESCE(COUNT(r.return_id), 0)::int AS returns_count,
           COALESCE(
             SUM(
               CASE
                 WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days'
                 THEN oi.quantity * oi.unit_price
                 ELSE 0
               END
             ),
             0
           )::numeric(12,2) AS current_period_gmv,
           COALESCE(
             SUM(
               CASE
                 WHEN o.order_date < CURRENT_DATE - INTERVAL '30 days'
                  AND o.order_date >= CURRENT_DATE - INTERVAL '60 days'
                 THEN oi.quantity * oi.unit_price
                 ELSE 0
               END
             ),
             0
           )::numeric(12,2) AS previous_period_gmv
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         LEFT JOIN returns r ON r.item_id = oi.item_id
         GROUP BY p.seller_id
       ),
       payouts AS (
         SELECT
           seller_id,
           COALESCE(SUM(amount), 0)::numeric(12,2) AS payout_total
         FROM seller_payouts
         WHERE status = 'Paid'
         GROUP BY seller_id
       )
       SELECT
         sb.seller_id,
         sb.company_name,
         sb.rating,
         sb.active_products,
         COALESCE(sa.total_gmv, 0)::numeric(12,2) AS total_gmv,
         COALESCE(sa.total_orders, 0)::int AS total_orders,
         CASE
           WHEN COALESCE(sa.total_orders, 0) > 0
           THEN ROUND((sa.total_gmv / sa.total_orders)::numeric, 2)
           ELSE 0
         END AS avg_order_value,
         COALESCE(sa.units_sold, 0)::int AS units_sold,
         CASE
           WHEN COALESCE(sa.units_sold, 0) > 0
           THEN ROUND((COALESCE(sa.returns_count, 0)::numeric / sa.units_sold) * 100, 2)
           ELSE 0
         END AS return_rate,
         COALESCE(p.payout_total, 0)::numeric(12,2) AS payout_total,
         CASE
           WHEN COALESCE(sa.previous_period_gmv, 0) > 0
           THEN ROUND(((sa.current_period_gmv - sa.previous_period_gmv) / sa.previous_period_gmv) * 100, 2)
           WHEN COALESCE(sa.current_period_gmv, 0) > 0
           THEN 100
           ELSE 0
         END AS growth_rate
       FROM seller_base sb
       LEFT JOIN sales sa ON sa.seller_id = sb.seller_id
       LEFT JOIN payouts p ON p.seller_id = sb.seller_id
       ORDER BY total_gmv DESC, growth_rate DESC, sb.company_name ASC
       LIMIT 12`
    );

    return res.json({
      sellers: result.rows.map((row) => ({
        seller_id: row.seller_id,
        company_name: row.company_name,
        rating: asNumber(row.rating),
        active_products: asNumber(row.active_products),
        total_gmv: asNumber(row.total_gmv),
        total_orders: asNumber(row.total_orders),
        avg_order_value: asNumber(row.avg_order_value),
        units_sold: asNumber(row.units_sold),
        return_rate: asNumber(row.return_rate),
        payout_total: asNumber(row.payout_total),
        growth_rate: asNumber(row.growth_rate),
      })),
    });
  } catch (err) {
    console.error("getSellerPerformance:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getCategoryPerformance = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH product_counts AS (
         SELECT
           category_id,
           COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_products
         FROM products
         GROUP BY category_id
       ),
       sales AS (
         SELECT
           p.category_id,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gmv,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           COUNT(DISTINCT o.order_id)::int AS order_count
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         GROUP BY p.category_id
       ),
       ratings AS (
         SELECT
           p.category_id,
           COALESCE(AVG(r.rating), 0)::numeric(10,2) AS avg_rating
         FROM products p
         LEFT JOIN reviews r ON r.product_id = p.product_id
         GROUP BY p.category_id
       ),
       interest AS (
         SELECT
           p.category_id,
           COUNT(DISTINCT bh.history_id)::int AS browse_count,
           COUNT(DISTINCT c.cart_id)::int AS cart_adds,
           COUNT(DISTINCT wi.item_id)::int AS wishlist_adds
         FROM products p
         LEFT JOIN browsing_history bh ON bh.product_id = p.product_id
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN cart c ON c.variant_id = pv.variant_id
         LEFT JOIN wishlist_items wi ON wi.variant_id = pv.variant_id
         GROUP BY p.category_id
       ),
       stock AS (
         SELECT
           p.category_id,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         GROUP BY p.category_id
       )
       SELECT
         c.category_id,
         c.name AS category_name,
         COALESCE(s.gmv, 0)::numeric(12,2) AS gmv,
         COALESCE(s.units_sold, 0)::int AS units_sold,
         COALESCE(s.order_count, 0)::int AS order_count,
         COALESCE(r.avg_rating, 0)::numeric(10,2) AS avg_rating,
         COALESCE(i.browse_count, 0)::int AS browse_count,
         COALESCE(i.cart_adds, 0)::int AS cart_adds,
         COALESCE(i.wishlist_adds, 0)::int AS wishlist_adds,
         COALESCE(pc.active_products, 0)::int AS active_products,
         COALESCE(st.stock_units, 0)::int AS stock_units,
         (
           COALESCE(i.browse_count, 0)
           + (COALESCE(i.cart_adds, 0) * 3)
           + (COALESCE(i.wishlist_adds, 0) * 2)
           + GREATEST(60 - COALESCE(st.stock_units, 0), 0)
         )::int AS opportunity_score
       FROM categories c
       LEFT JOIN product_counts pc ON pc.category_id = c.category_id
       LEFT JOIN sales s ON s.category_id = c.category_id
       LEFT JOIN ratings r ON r.category_id = c.category_id
       LEFT JOIN interest i ON i.category_id = c.category_id
       LEFT JOIN stock st ON st.category_id = c.category_id
       ORDER BY gmv DESC, units_sold DESC, c.name ASC
       LIMIT 12`
    );

    return res.json({
      categories: result.rows.map((row) => ({
        category_id: row.category_id,
        category_name: row.category_name,
        gmv: asNumber(row.gmv),
        units_sold: asNumber(row.units_sold),
        order_count: asNumber(row.order_count),
        avg_rating: asNumber(row.avg_rating),
        browse_count: asNumber(row.browse_count),
        cart_adds: asNumber(row.cart_adds),
        wishlist_adds: asNumber(row.wishlist_adds),
        active_products: asNumber(row.active_products),
        stock_units: asNumber(row.stock_units),
        opportunity_score: asNumber(row.opportunity_score),
      })),
    });
  } catch (err) {
    console.error("getCategoryPerformance:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getDemandOpportunities = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH interest AS (
         SELECT
           p.product_id,
           p.title,
           s.company_name AS seller_name,
           c.name AS category_name,
           COUNT(DISTINCT bh.history_id)::int AS browse_count,
           COUNT(DISTINCT cart.cart_id)::int AS cart_adds,
           COUNT(DISTINCT wi.item_id)::int AS wishlist_adds
         FROM products p
         JOIN sellers s ON s.seller_id = p.seller_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         LEFT JOIN browsing_history bh ON bh.product_id = p.product_id
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN cart ON cart.variant_id = pv.variant_id
         LEFT JOIN wishlist_items wi ON wi.variant_id = pv.variant_id
         WHERE p.is_active = TRUE
         GROUP BY p.product_id, s.company_name, c.name
       ),
       sales AS (
         SELECT
           p.product_id,
           COUNT(DISTINCT o.order_id)::int AS order_count,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         GROUP BY p.product_id
       ),
       stock AS (
         SELECT
           p.product_id,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         GROUP BY p.product_id
       )
       SELECT
         i.product_id,
         i.title,
         i.seller_name,
         COALESCE(i.category_name, 'Uncategorized') AS category_name,
         i.browse_count,
         i.cart_adds,
         i.wishlist_adds,
         COALESCE(s.order_count, 0)::int AS order_count,
         COALESCE(s.units_sold, 0)::int AS units_sold,
         COALESCE(st.stock_units, 0)::int AS stock_units,
         (
           COALESCE(i.browse_count, 0)
           + (COALESCE(i.cart_adds, 0) * 4)
           + (COALESCE(i.wishlist_adds, 0) * 3)
           - (COALESCE(s.order_count, 0) * 2)
           + GREATEST(24 - COALESCE(st.stock_units, 0), 0)
         )::int AS opportunity_score
       FROM interest i
       LEFT JOIN sales s ON s.product_id = i.product_id
       LEFT JOIN stock st ON st.product_id = i.product_id
       WHERE COALESCE(i.browse_count, 0) + COALESCE(i.cart_adds, 0) + COALESCE(i.wishlist_adds, 0) > 0
       ORDER BY opportunity_score DESC, i.browse_count DESC, i.title ASC
       LIMIT 12`
    );

    return res.json({
      opportunities: result.rows.map((row) => ({
        product_id: row.product_id,
        title: row.title,
        seller_name: row.seller_name,
        category_name: row.category_name,
        browse_count: asNumber(row.browse_count),
        cart_adds: asNumber(row.cart_adds),
        wishlist_adds: asNumber(row.wishlist_adds),
        order_count: asNumber(row.order_count),
        units_sold: asNumber(row.units_sold),
        stock_units: asNumber(row.stock_units),
        opportunity_score: asNumber(row.opportunity_score),
      })),
    });
  } catch (err) {
    console.error("getDemandOpportunities:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Warehouse pressure uses the warehouse with the highest recorded stock for a variant
// as the best available fulfillment proxy because order_items are not directly assigned
// to warehouses in the current schema.
const getWarehousePressure = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH primary_warehouse AS (
         SELECT DISTINCT ON (variant_id)
           variant_id,
           warehouse_id
         FROM inventory
         ORDER BY variant_id, stock_quantity DESC, warehouse_id ASC
       ),
       inventory_summary AS (
         SELECT
           w.warehouse_id,
           w.name,
           w.city,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units,
           COUNT(DISTINCT CASE WHEN i.stock_quantity <= 5 THEN i.variant_id END)::int AS low_stock_variants
         FROM warehouses w
         LEFT JOIN inventory i ON i.warehouse_id = w.warehouse_id
         WHERE w.is_active = TRUE
         GROUP BY w.warehouse_id
       ),
       order_pressure AS (
         SELECT
           pw.warehouse_id,
           COUNT(DISTINCT CASE WHEN o.status IN ('Shipped', 'Delivered') THEN o.order_id END)::int AS fulfilled_orders,
           COUNT(DISTINCT CASE WHEN o.status IN ('Pending', 'Processing') THEN o.order_id END)::int AS pending_orders,
           COUNT(r.return_id)::int AS return_volume
         FROM primary_warehouse pw
         LEFT JOIN order_items oi ON oi.variant_id = pw.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         LEFT JOIN returns r ON r.item_id = oi.item_id
         GROUP BY pw.warehouse_id
       )
       SELECT
         i.warehouse_id,
         i.name,
         i.city,
         i.stock_units,
         i.low_stock_variants,
         COALESCE(o.fulfilled_orders, 0)::int AS fulfilled_orders,
         COALESCE(o.pending_orders, 0)::int AS pending_orders,
         COALESCE(o.return_volume, 0)::int AS return_volume,
         ROUND(
           (
             (COALESCE(o.pending_orders, 0) * 4)
             + (i.low_stock_variants * 3)
             + (COALESCE(o.return_volume, 0) * 2)
             + GREATEST(COALESCE(o.fulfilled_orders, 0) - (i.stock_units / 20.0), 0)
           )::numeric,
           2
         ) AS pressure_score
       FROM inventory_summary i
       LEFT JOIN order_pressure o ON o.warehouse_id = i.warehouse_id
       ORDER BY pressure_score DESC, i.stock_units DESC, i.city ASC`
    );

    return res.json({
      warehouses: result.rows.map((row) => ({
        warehouse_id: row.warehouse_id,
        name: row.name,
        city: row.city,
        stock_units: asNumber(row.stock_units),
        low_stock_variants: asNumber(row.low_stock_variants),
        fulfilled_orders: asNumber(row.fulfilled_orders),
        pending_orders: asNumber(row.pending_orders),
        return_volume: asNumber(row.return_volume),
        pressure_score: asNumber(row.pressure_score),
      })),
    });
  } catch (err) {
    console.error("getWarehousePressure:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getGeographicDemand = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH city_sales AS (
         SELECT
           a.city,
           COUNT(DISTINCT o.order_id)::int AS order_count,
           COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS gmv,
           COUNT(DISTINCT o.user_id)::int AS active_customers,
           COUNT(DISTINCT CASE WHEN o.status = 'Delivered' THEN o.order_id END)::int AS delivered_orders,
           COALESCE(
             SUM(
               CASE
                 WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days'
                 THEN o.total_amount
                 ELSE 0
               END
             ),
             0
           )::numeric(12,2) AS current_period_gmv,
           COALESCE(
             SUM(
               CASE
                 WHEN o.order_date < CURRENT_DATE - INTERVAL '30 days'
                  AND o.order_date >= CURRENT_DATE - INTERVAL '60 days'
                 THEN o.total_amount
                 ELSE 0
               END
             ),
             0
           )::numeric(12,2) AS previous_period_gmv
         FROM orders o
         JOIN addresses a ON a.address_id = o.address_id
         GROUP BY a.city
       ),
       city_category AS (
         SELECT
           a.city,
           COALESCE(c.name, 'Uncategorized') AS category_name,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gmv
         FROM orders o
         JOIN addresses a ON a.address_id = o.address_id
         JOIN order_items oi ON oi.order_id = o.order_id
         JOIN product_variants pv ON pv.variant_id = oi.variant_id
         JOIN products p ON p.product_id = pv.product_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         GROUP BY a.city, COALESCE(c.name, 'Uncategorized')
       ),
       ranked_category AS (
         SELECT
           city,
           category_name,
           gmv,
           ROW_NUMBER() OVER (PARTITION BY city ORDER BY gmv DESC, category_name ASC) AS rank_in_city
         FROM city_category
       )
       SELECT
         cs.city,
         cs.order_count,
         cs.gmv,
         cs.active_customers,
         cs.delivered_orders,
         COALESCE(rc.category_name, 'Uncategorized') AS top_category,
         CASE
           WHEN COALESCE(cs.previous_period_gmv, 0) > 0
           THEN ROUND(((cs.current_period_gmv - cs.previous_period_gmv) / cs.previous_period_gmv) * 100, 2)
           WHEN COALESCE(cs.current_period_gmv, 0) > 0
           THEN 100
           ELSE 0
         END AS growth_rate
       FROM city_sales cs
       LEFT JOIN ranked_category rc
         ON rc.city = cs.city
        AND rc.rank_in_city = 1
       ORDER BY cs.gmv DESC, cs.order_count DESC, cs.city ASC`
    );

    return res.json({
      cities: result.rows.map((row) => ({
        city: row.city,
        order_count: asNumber(row.order_count),
        gmv: asNumber(row.gmv),
        active_customers: asNumber(row.active_customers),
        delivered_orders: asNumber(row.delivered_orders),
        top_category: row.top_category,
        growth_rate: asNumber(row.growth_rate),
      })),
    });
  } catch (err) {
    console.error("getGeographicDemand:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getReturnsRisk = async (_req, res) => {
  try {
    const [sellerResult, productResult, categoryResult] = await Promise.all([
      pool.query(
        `SELECT
           s.seller_id,
           s.company_name,
           COUNT(r.return_id)::int AS return_count,
           COALESCE(SUM(r.refund_amount), 0)::numeric(12,2) AS refund_total,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           CASE
             WHEN COALESCE(SUM(oi.quantity), 0) > 0
             THEN ROUND((COUNT(r.return_id)::numeric / SUM(oi.quantity)) * 100, 2)
             ELSE 0
           END AS return_rate
         FROM sellers s
         JOIN products p ON p.seller_id = s.seller_id
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN returns r ON r.item_id = oi.item_id
         GROUP BY s.seller_id
         HAVING COUNT(r.return_id) > 0
         ORDER BY return_rate DESC, return_count DESC, s.company_name ASC
         LIMIT 10`
      ),
      pool.query(
        `SELECT
           p.product_id,
           p.title,
           COUNT(r.return_id)::int AS return_count,
           COALESCE(SUM(r.refund_amount), 0)::numeric(12,2) AS refund_total,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           CASE
             WHEN COALESCE(SUM(oi.quantity), 0) > 0
             THEN ROUND((COUNT(r.return_id)::numeric / SUM(oi.quantity)) * 100, 2)
             ELSE 0
           END AS return_rate
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN returns r ON r.item_id = oi.item_id
         GROUP BY p.product_id
         HAVING COUNT(r.return_id) > 0
         ORDER BY return_rate DESC, return_count DESC, p.title ASC
         LIMIT 10`
      ),
      pool.query(
        `SELECT
           c.category_id,
           c.name AS category_name,
           COUNT(r.return_id)::int AS return_count,
           COALESCE(SUM(r.refund_amount), 0)::numeric(12,2) AS refund_total,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           CASE
             WHEN COALESCE(SUM(oi.quantity), 0) > 0
             THEN ROUND((COUNT(r.return_id)::numeric / SUM(oi.quantity)) * 100, 2)
             ELSE 0
           END AS return_rate
         FROM categories c
         JOIN products p ON p.category_id = c.category_id
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN returns r ON r.item_id = oi.item_id
         GROUP BY c.category_id
         HAVING COUNT(r.return_id) > 0
         ORDER BY return_rate DESC, return_count DESC, c.name ASC
         LIMIT 10`
      ),
    ]);

    return res.json({
      sellers: sellerResult.rows.map((row) => ({
        seller_id: row.seller_id,
        company_name: row.company_name,
        return_count: asNumber(row.return_count),
        refund_total: asNumber(row.refund_total),
        units_sold: asNumber(row.units_sold),
        return_rate: asNumber(row.return_rate),
      })),
      products: productResult.rows.map((row) => ({
        product_id: row.product_id,
        title: row.title,
        return_count: asNumber(row.return_count),
        refund_total: asNumber(row.refund_total),
        units_sold: asNumber(row.units_sold),
        return_rate: asNumber(row.return_rate),
      })),
      categories: categoryResult.rows.map((row) => ({
        category_id: row.category_id,
        category_name: row.category_name,
        return_count: asNumber(row.return_count),
        refund_total: asNumber(row.refund_total),
        units_sold: asNumber(row.units_sold),
        return_rate: asNumber(row.return_rate),
      })),
    });
  } catch (err) {
    console.error("getReturnsRisk:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getInventoryRisk = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH stock AS (
         SELECT
           p.product_id,
           COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         GROUP BY p.product_id
       ),
       recent_sales AS (
         SELECT
           p.product_id,
           COALESCE(
             SUM(
               CASE
                 WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days'
                 THEN oi.quantity
                 ELSE 0
               END
             ),
             0
           )::int AS recent_units_sold
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         GROUP BY p.product_id
       ),
       demand AS (
         SELECT
           p.product_id,
           COUNT(DISTINCT bh.history_id)::int AS browse_count,
           COUNT(DISTINCT cart.cart_id)::int AS cart_adds
         FROM products p
         LEFT JOIN browsing_history bh ON bh.product_id = p.product_id
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN cart ON cart.variant_id = pv.variant_id
         GROUP BY p.product_id
       )
       SELECT
         p.product_id,
         p.title,
         s.company_name AS seller_name,
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(st.stock_units, 0)::int AS stock_units,
         COALESCE(rs.recent_units_sold, 0)::int AS recent_units_sold,
         COALESCE(d.browse_count, 0)::int AS browse_count,
         COALESCE(d.cart_adds, 0)::int AS cart_adds,
         GREATEST((COALESCE(rs.recent_units_sold, 0) * 2) + COALESCE(d.cart_adds, 0) - COALESCE(st.stock_units, 0), 0)::int AS stock_gap,
         ROUND(
           (
             GREATEST((COALESCE(rs.recent_units_sold, 0) * 2) + COALESCE(d.cart_adds, 0) - COALESCE(st.stock_units, 0), 0)
             + (COALESCE(d.browse_count, 0) / 10.0)
           )::numeric,
           2
         ) AS risk_score
       FROM products p
       JOIN sellers s ON s.seller_id = p.seller_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN stock st ON st.product_id = p.product_id
       LEFT JOIN recent_sales rs ON rs.product_id = p.product_id
       LEFT JOIN demand d ON d.product_id = p.product_id
       WHERE p.is_active = TRUE
       ORDER BY risk_score DESC, stock_gap DESC, p.title ASC
       LIMIT 12`
    );

    return res.json({
      products: result.rows.map((row) => ({
        product_id: row.product_id,
        title: row.title,
        seller_name: row.seller_name,
        category_name: row.category_name,
        stock_units: asNumber(row.stock_units),
        recent_units_sold: asNumber(row.recent_units_sold),
        browse_count: asNumber(row.browse_count),
        cart_adds: asNumber(row.cart_adds),
        stock_gap: asNumber(row.stock_gap),
        risk_score: asNumber(row.risk_score),
      })),
    });
  } catch (err) {
    console.error("getInventoryRisk:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Conversion signals are intent proxies derived from browsing, cart, wishlist, and order
// activity because the current schema does not store a literal browse->checkout funnel.
const getConversionSignals = async (_req, res) => {
  try {
    const result = await pool.query(
      `WITH interest AS (
         SELECT
           p.product_id,
           COUNT(DISTINCT bh.history_id)::int AS browse_count,
           COUNT(DISTINCT cart.cart_id)::int AS cart_adds,
           COUNT(DISTINCT wi.item_id)::int AS wishlist_adds
         FROM products p
         LEFT JOIN browsing_history bh ON bh.product_id = p.product_id
         LEFT JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN cart ON cart.variant_id = pv.variant_id
         LEFT JOIN wishlist_items wi ON wi.variant_id = pv.variant_id
         GROUP BY p.product_id
       ),
       sales AS (
         SELECT
           p.product_id,
           COUNT(DISTINCT o.order_id)::int AS order_count,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.product_id
         LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
         LEFT JOIN orders o ON o.order_id = oi.order_id
         GROUP BY p.product_id
       )
       SELECT
         p.product_id,
         p.title,
         s.company_name AS seller_name,
         COALESCE(i.browse_count, 0)::int AS browse_count,
         COALESCE(i.cart_adds, 0)::int AS cart_adds,
         COALESCE(i.wishlist_adds, 0)::int AS wishlist_adds,
         COALESCE(sa.order_count, 0)::int AS order_count,
         COALESCE(sa.units_sold, 0)::int AS units_sold,
         CASE
           WHEN COALESCE(i.browse_count, 0) > 0
           THEN ROUND((i.cart_adds::numeric / i.browse_count) * 100, 2)
           ELSE 0
         END AS browse_to_cart_rate,
         CASE
           WHEN COALESCE(i.cart_adds, 0) > 0
           THEN ROUND((COALESCE(sa.order_count, 0)::numeric / i.cart_adds) * 100, 2)
           ELSE 0
         END AS cart_to_order_rate,
         (
           COALESCE(i.browse_count, 0)
           + (COALESCE(i.wishlist_adds, 0) * 2)
           - (COALESCE(sa.order_count, 0) * 3)
         )::int AS conversion_gap_score
       FROM products p
       JOIN sellers s ON s.seller_id = p.seller_id
       LEFT JOIN interest i ON i.product_id = p.product_id
       LEFT JOIN sales sa ON sa.product_id = p.product_id
       WHERE p.is_active = TRUE
         AND (COALESCE(i.browse_count, 0) > 0 OR COALESCE(i.cart_adds, 0) > 0 OR COALESCE(i.wishlist_adds, 0) > 0)
       ORDER BY conversion_gap_score DESC, browse_count DESC, p.title ASC
       LIMIT 12`
    );

    return res.json({
      products: result.rows.map((row) => ({
        product_id: row.product_id,
        title: row.title,
        seller_name: row.seller_name,
        browse_count: asNumber(row.browse_count),
        cart_adds: asNumber(row.cart_adds),
        wishlist_adds: asNumber(row.wishlist_adds),
        order_count: asNumber(row.order_count),
        units_sold: asNumber(row.units_sold),
        browse_to_cart_rate: asNumber(row.browse_to_cart_rate),
        cart_to_order_rate: asNumber(row.cart_to_order_rate),
        conversion_gap_score: asNumber(row.conversion_gap_score),
      })),
    });
  } catch (err) {
    console.error("getConversionSignals:", err.message);
    return res.status(500).json({ error: "Server error" });
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
              + COALESCE(SUM(CASE WHEN wi.item_id IS NOT NULL THEN 1 ELSE 0 END), 0)
              + COALESCE(COUNT(DISTINCT bh.history_id), 0) AS popularity
       FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.product_id
       LEFT JOIN cart c ON c.variant_id = pv.variant_id
       LEFT JOIN wishlist_items wi ON wi.variant_id = pv.variant_id
       LEFT JOIN browsing_history bh ON bh.product_id = p.product_id
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
  getCurrentAdmin,
  getAdminOverview,
  getSellerPerformance,
  getCategoryPerformance,
  getDemandOpportunities,
  getWarehousePressure,
  getGeographicDemand,
  getReturnsRisk,
  getInventoryRisk,
  getConversionSignals,
  listPendingSellers,
  verifySeller,
  getTopCategories,
  getTopSellers,
  getTopProducts,
};
