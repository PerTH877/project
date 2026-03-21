const pool = require("../config/db");
const { parseId } = require("../utils/marketplace");

const mapOrderRow = (row) => ({
  order_id: row.order_id,
  status: row.status,
  total_amount: Number(row.total_amount),
  order_date: row.order_date,
  item_count: Number(row.item_count ?? 0),
  shipment_status: row.shipment_status,
  tracking_number: row.tracking_number,
  payment_method: row.payment_method,
  payment_status: row.payment_status,
  address_city: row.address_city,
  address_line: row.street_address,
});

const getUserOrders = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
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

    return res.json({ orders: result.rows.map(mapOrderRow) });
  } catch (err) {
    console.error("getUserOrders:", err.message);
    return res.status(500).json({ error: "Failed to load orders" });
  }
};

const getUserOrderDetail = async (req, res) => {
  const userId = req.user?.user_id;
  const orderId = parseId(req.params.order_id);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!orderId) {
    return res.status(400).json({ error: "order_id must be a positive integer" });
  }

  try {
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

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({
      order: {
        ...mapOrderRow({
          ...orderResult.rows[0],
          item_count: itemsResult.rows.length,
          address_city: orderResult.rows[0].city,
        }),
        carrier: orderResult.rows[0].carrier,
        estimated_arrival: orderResult.rows[0].estimated_arrival,
        payment_amount: Number(orderResult.rows[0].payment_amount ?? 0),
        address: {
          street_address: orderResult.rows[0].street_address,
          city: orderResult.rows[0].city,
          zip_code: orderResult.rows[0].zip_code,
          country: orderResult.rows[0].country,
        },
      },
      items: itemsResult.rows.map((row) => ({
        item_id: row.item_id,
        quantity: row.quantity,
        unit_price: Number(row.unit_price),
        line_total: Number(row.unit_price) * Number(row.quantity),
        platform_fee_percent: Number(row.platform_fee_percent),
        variant: {
          variant_id: row.variant_id,
          sku: row.sku,
          attributes: row.attributes || {},
        },
        product: {
          product_id: row.product_id,
          title: row.title,
          brand: row.brand,
          primary_image: row.primary_image,
        },
        seller: {
          seller_id: row.seller_id,
          company_name: row.seller_name,
        },
      })),
    });
  } catch (err) {
    console.error("getUserOrderDetail:", err.message);
    return res.status(500).json({ error: "Failed to load order details" });
  }
};

const getSellerOrders = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
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

    return res.json({
      orders: result.rows.map((row) => ({
        order_id: row.order_id,
        status: row.status,
        order_date: row.order_date,
        item_count: Number(row.item_count ?? 0),
        gross_sales: Number(row.gross_sales ?? 0),
        shipment_status: row.shipment_status,
        tracking_number: row.tracking_number,
        customer_name: row.customer_name,
        destination_city: row.destination_city,
      })),
    });
  } catch (err) {
    console.error("getSellerOrders:", err.message);
    return res.status(500).json({ error: "Failed to load seller orders" });
  }
};

const getSellerOrderDetail = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const orderId = parseId(req.params.order_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!orderId) {
    return res.status(400).json({ error: "order_id must be a positive integer" });
  }

  try {
    const orderResult = await pool.query(
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
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await pool.query(
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
    );

    return res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows.map((row) => ({
        item_id: row.item_id,
        quantity: row.quantity,
        unit_price: Number(row.unit_price),
        line_total: Number(row.unit_price) * Number(row.quantity),
        seller_earning: Number(row.seller_earning ?? 0),
        variant: {
          variant_id: row.variant_id,
          sku: row.sku,
          attributes: row.attributes || {},
        },
        product: {
          product_id: row.product_id,
          title: row.title,
          primary_image: row.primary_image,
        },
      })),
    });
  } catch (err) {
    console.error("getSellerOrderDetail:", err.message);
    return res.status(500).json({ error: "Failed to load seller order detail" });
  }
};

module.exports = {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
};
