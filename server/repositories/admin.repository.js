const pool = require("../config/db");







const listPendingSellers = async () => {
  const result = await pool.query(
    `SELECT seller_id, company_name, contact_email, gst_number, is_verified
     FROM Sellers
     WHERE is_verified = FALSE
     ORDER BY seller_id DESC`
  );
  return result.rows;
};

const verifySellerId = async (client, sellerId) => {
  const updated = await client.query(
    `UPDATE Sellers
     SET is_verified = TRUE
     WHERE seller_id = $1
     RETURNING seller_id, company_name, contact_email, is_verified`,
    [sellerId]
  );
  return updated.rows;
};


const getAdminOverviewData = async () => {
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

  return {
    summary: summaryResult.rows[0] || {},
    warehouses: warehouseResult.rows,
  };
};


const getSellerPerformanceData = async () => {
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
  return result.rows;
};

const getCategoryPerformanceData = async () => {
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
  return result.rows;
};

const getDemandOpportunitiesData = async () => {
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
  return result.rows;
};

const getWarehousePressureData = async () => {
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
  return result.rows;
};

const getGeographicDemandData = async () => {
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
  return result.rows;
};

const getReturnsRiskData = async () => {
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

  return {
    sellers: sellerResult.rows,
    products: productResult.rows,
    categories: categoryResult.rows,
  };
};

const getInventoryRiskData = async () => {
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
  return result.rows;
};

const getConversionSignalsData = async () => {
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
  return result.rows;
};

const getTopCategoriesData = async () => {
  const result = await pool.query(
    `SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.category_id
     GROUP BY c.category_id, c.name
     ORDER BY product_count DESC, c.name ASC
     LIMIT 5`
  );
  return result.rows;
};

const getTopSellersData = async () => {
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
  return result.rows;
};

const getTopProductsData = async () => {
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
  return result.rows;
};

module.exports = {
  listPendingSellers,
  verifySellerId,
  getAdminOverviewData,
  getSellerPerformanceData,
  getCategoryPerformanceData,
  getDemandOpportunitiesData,
  getWarehousePressureData,
  getGeographicDemandData,
  getReturnsRiskData,
  getInventoryRiskData,
  getConversionSignalsData,
  getTopCategoriesData,
  getTopSellersData,
  getTopProductsData,
};
