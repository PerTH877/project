const pool = require("../config/db");

const getUserOrders = async (userId) => {
  const result = await pool.query(
    `SELECT
       o.order_id,
       o.status,
       o.total_amount,
       o.order_date,
       COUNT(oi.item_id)::int AS item_count,
       MAX(sh.status) AS shipment_status,
       MAX(sh.tracking_number) AS tracking_number,
       MAX(pay.payment_method) AS payment_method,
       MAX(pay.status) AS payment_status,
       a.city AS address_city,
       a.street_address
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.order_id
     LEFT JOIN shipments sh ON sh.order_id = o.order_id
     LEFT JOIN payments pay ON pay.order_id = o.order_id
     LEFT JOIN addresses a ON a.address_id = o.address_id
     WHERE o.user_id = $1
     GROUP BY o.order_id, a.city, a.street_address
     ORDER BY o.order_date DESC, o.order_id DESC`,
    [userId]
  );
  return result.rows;
};

const getUserOrderDetail = async (userId, orderId) => {
  const [orderResult, itemsResult] = await Promise.all([
    pool.query(
      `SELECT
         o.order_id,
         o.status,
         o.total_amount,
         o.order_date,
         sh.status AS shipment_status,
         sh.tracking_number,
         sh.carrier,
         sh.estimated_arrival,
         pay.payment_method,
         pay.status AS payment_status,
         pay.amount AS payment_amount,
         a.street_address,
         a.city,
         a.zip_code,
         a.country
       FROM orders o
       LEFT JOIN shipments sh ON sh.order_id = o.order_id
       LEFT JOIN payments pay ON pay.order_id = o.order_id
       LEFT JOIN addresses a ON a.address_id = o.address_id
       WHERE o.order_id = $1 AND o.user_id = $2
       LIMIT 1`,
      [orderId, userId]
    ),
    pool.query(
      `SELECT
         oi.item_id,
         oi.quantity,
         oi.unit_price,
         oi.platform_fee_percent,
         pv.variant_id,
         pv.sku,
         pv.attributes,
         p.product_id,
         p.title,
         p.brand,
         s.seller_id,
         s.company_name AS seller_name,
         media.media_url AS primary_image
       FROM order_items oi
       JOIN product_variants pv ON pv.variant_id = oi.variant_id
       JOIN products p ON p.product_id = pv.product_id
       JOIN sellers s ON s.seller_id = p.seller_id
       LEFT JOIN LATERAL (
         SELECT media_url
         FROM product_media
         WHERE product_id = p.product_id AND media_type = 'image'
         ORDER BY is_primary DESC, display_order ASC, media_id ASC
         LIMIT 1
       ) media ON TRUE
       WHERE oi.order_id = $1
       ORDER BY oi.item_id ASC`,
      [orderId]
    ),
  ]);

  return {
    orderRow: orderResult.rows[0] || null,
    itemRows: itemsResult.rows,
  };
};

const getSellerOrders = async (sellerId) => {
  const result = await pool.query(
    `SELECT
       o.order_id,
       o.status,
       o.order_date,
       COUNT(oi.item_id)::int AS item_count,
       COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales,
       sh.status AS shipment_status,
       sh.tracking_number,
       u.full_name AS customer_name,
       a.city AS destination_city
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.order_id
     JOIN product_variants pv ON pv.variant_id = oi.variant_id
     JOIN products p ON p.product_id = pv.product_id
     JOIN users u ON u.user_id = o.user_id
     LEFT JOIN shipments sh ON sh.order_id = o.order_id
     LEFT JOIN addresses a ON a.address_id = o.address_id
     WHERE p.seller_id = $1
     GROUP BY o.order_id, sh.status, sh.tracking_number, u.full_name, a.city
     ORDER BY o.order_date DESC, o.order_id DESC`,
    [sellerId]
  );
  return result.rows;
};

const getSellerOrderDetail = async (sellerId, orderId) => {
  const [orderResult, itemsResult] = await Promise.all([
    pool.query(
      `SELECT
         o.order_id,
         o.status,
         o.order_date,
         sh.status AS shipment_status,
         sh.tracking_number,
         sh.carrier,
         a.city AS destination_city,
         a.street_address,
         u.full_name AS customer_name
       FROM orders o
       LEFT JOIN shipments sh ON sh.order_id = o.order_id
       LEFT JOIN addresses a ON a.address_id = o.address_id
       JOIN users u ON u.user_id = o.user_id
       WHERE o.order_id = $1
         AND EXISTS (
           SELECT 1
           FROM order_items oi
           JOIN product_variants pv ON pv.variant_id = oi.variant_id
           JOIN products p ON p.product_id = pv.product_id
           WHERE oi.order_id = o.order_id AND p.seller_id = $2
         )
       LIMIT 1`,
      [orderId, sellerId]
    ),
    pool.query(
      `SELECT
         oi.item_id,
         oi.quantity,
         oi.unit_price,
         oi.seller_earning,
         pv.variant_id,
         pv.sku,
         pv.attributes,
         p.product_id,
         p.title,
         media.media_url AS primary_image
       FROM order_items oi
       JOIN product_variants pv ON pv.variant_id = oi.variant_id
       JOIN products p ON p.product_id = pv.product_id
       LEFT JOIN LATERAL (
         SELECT media_url
         FROM product_media
         WHERE product_id = p.product_id AND media_type = 'image'
         ORDER BY is_primary DESC, display_order ASC, media_id ASC
         LIMIT 1
       ) media ON TRUE
       WHERE oi.order_id = $1 AND p.seller_id = $2
       ORDER BY oi.item_id ASC`,
      [orderId, sellerId]
    ),
  ]);

  return {
    orderRow: orderResult.rows[0] || null,
    itemRows: itemsResult.rows,
  };
};

module.exports = {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
};
