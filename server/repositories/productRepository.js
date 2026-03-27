"use strict";

const findCategoryById = async (client, categoryId) => {
  const result = await client.query(
    "SELECT category_id FROM categories WHERE category_id = $1",
    [categoryId]
  );
  return result.rows[0] || null;
};

const findWarehousesByIds = async (client, warehouseIds) => {
  const result = await client.query(
    "SELECT warehouse_id FROM warehouses WHERE warehouse_id = ANY($1::int[])",
    [warehouseIds]
  );
  return result.rows.map((r) => r.warehouse_id);
};

const insertProduct = async (client, { sellerId, categoryId, title, brand, description, basePrice }) => {
  const result = await client.query(
    `INSERT INTO products (seller_id, category_id, title, brand, description, base_price, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING *`,
    [sellerId, categoryId, title, brand, description, basePrice]
  );
  return result.rows[0];
};

const findProductBySeller = async (client, productId, sellerId) => {
  const result = await client.query(
    "SELECT product_id FROM products WHERE product_id = $1 AND seller_id = $2",
    [productId, sellerId]
  );
  return result.rows[0] || null;
};

const updateProductFields = async (client, productId, sellerId, setClauses, values) => {
  const pidIndex = values.length + 1;
  const sidIndex = values.length + 2;
  await client.query(
    `UPDATE products
     SET ${setClauses.join(", ")}
     WHERE product_id = $${pidIndex} AND seller_id = $${sidIndex}`,
    [...values, productId, sellerId]
  );
};

const deactivateProductRow = async (client, productId, sellerId) => {
  const result = await client.query(
    `UPDATE products
     SET is_active = FALSE
     WHERE product_id = $1 AND seller_id = $2
     RETURNING product_id, title, is_active`,
    [productId, sellerId]
  );
  return result.rows[0] || null;
};

const findActiveProduct = async (client, productId) => {
  const result = await client.query(
    "SELECT product_id FROM products WHERE product_id = $1 AND is_active = TRUE",
    [productId]
  );
  return result.rows[0] || null;
};

const findVariantBySeller = async (client, variantId, productId, sellerId) => {
  const result = await client.query(
    `SELECT pv.variant_id
     FROM product_variants pv
     JOIN products p ON p.product_id = pv.product_id
     WHERE pv.variant_id = $1 AND p.product_id = $2 AND p.seller_id = $3`,
    [variantId, productId, sellerId]
  );
  return result.rows[0] || null;
};

const findVariantOwnerBySeller = async (client, variantId, sellerId) => {
  const result = await client.query(
    `SELECT pv.variant_id
     FROM product_variants pv
     JOIN products p ON p.product_id = pv.product_id
     WHERE pv.variant_id = $1 AND p.seller_id = $2`,
    [variantId, sellerId]
  );
  return result.rows[0] || null;
};

const insertVariant = async (client, { productId, sku, attributes, priceAdjustment, isActive }) => {
  const result = await client.query(
    `INSERT INTO product_variants (product_id, sku, attributes, price_adjustment, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [productId, sku, attributes, priceAdjustment, isActive]
  );
  return result.rows[0];
};

const updateVariantRow = async (client, variantId, sellerId, setClauses, values) => {
  const vidIndex = values.length + 1;
  const sidIndex = values.length + 2;
  const result = await client.query(
    `UPDATE product_variants pv
     SET ${setClauses.join(", ")}
     FROM products p
     WHERE pv.variant_id = $${vidIndex}
       AND p.product_id = pv.product_id
       AND p.seller_id = $${sidIndex}
     RETURNING pv.*`,
    [...values, variantId, sellerId]
  );
  return result.rows[0] || null;
};

const updateVariantFields = async (client, variantId, { sku, attributes, priceAdjustment, isActive }) => {
  const result = await client.query(
    `UPDATE product_variants
     SET sku = $1,
         attributes = $2,
         price_adjustment = $3,
         is_active = $4
     WHERE variant_id = $5
     RETURNING *`,
    [sku, attributes, priceAdjustment, isActive, variantId]
  );
  return result.rows[0];
};

const deleteInventoryByVariant = async (client, variantId) => {
  await client.query("DELETE FROM inventory WHERE variant_id = $1", [variantId]);
};

const insertInventoryRow = async (client, { variantId, warehouseId, stockQuantity, aisleLocation }) => {
  await client.query(
    `INSERT INTO inventory (variant_id, warehouse_id, stock_quantity, aisle_location)
     VALUES ($1, $2, $3, $4)`,
    [variantId, warehouseId, stockQuantity, aisleLocation]
  );
};

const deleteProductMedia = async (client, productId) => {
  await client.query("DELETE FROM product_media WHERE product_id = $1", [productId]);
};

const insertProductMedia = async (client, { productId, mediaUrl, mediaType, isPrimary, displayOrder }) => {
  await client.query(
    `INSERT INTO product_media (product_id, media_url, media_type, is_primary, display_order)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, mediaUrl, mediaType, isPrimary, displayOrder]
  );
};

const deleteProductSpecs = async (client, productId) => {
  await client.query("DELETE FROM product_specifications WHERE product_id = $1", [productId]);
};

const insertProductSpec = async (client, { productId, specKey, specValue }) => {
  await client.query(
    `INSERT INTO product_specifications (product_id, spec_key, spec_value)
     VALUES ($1, $2, $3)`,
    [productId, specKey, specValue]
  );
};

const checkUserPurchased = async (client, userId, productId) => {
  const result = await client.query(
    `SELECT 1
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.order_id
     JOIN product_variants pv ON pv.variant_id = oi.variant_id
     WHERE o.user_id = $1
       AND pv.product_id = $2
       AND o.status IN ('Processing', 'Shipped', 'Delivered', 'Returned')
     LIMIT 1`,
    [userId, productId]
  );
  return result.rows.length > 0;
};

const findExistingReview = async (client, userId, productId) => {
  const result = await client.query(
    "SELECT review_id FROM reviews WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return result.rows[0] || null;
};

const insertReview = async (client, { userId, productId, rating, comment, images }) => {
  const result = await client.query(
    `INSERT INTO reviews (user_id, product_id, rating, comment, images)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [userId, productId, rating, comment, JSON.stringify(images)]
  );
  return result.rows[0];
};

const insertQuestion = async (client, { productId, userId, questionText }) => {
  const result = await client.query(
    `INSERT INTO product_questions (product_id, user_id, question_text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [productId, userId, questionText]
  );
  return result.rows[0];
};

const findQuestionBySeller = async (client, questionId, sellerId) => {
  const result = await client.query(
    `SELECT pq.question_id
     FROM product_questions pq
     JOIN products p ON p.product_id = pq.product_id
     WHERE pq.question_id = $1 AND p.seller_id = $2`,
    [questionId, sellerId]
  );
  return result.rows[0] || null;
};

const findExistingAnswer = async (client, questionId) => {
  const result = await client.query(
    "SELECT answer_id FROM product_answers WHERE question_id = $1",
    [questionId]
  );
  return result.rows[0] || null;
};

const insertAnswer = async (client, { questionId, sellerId, answerText }) => {
  const result = await client.query(
    `INSERT INTO product_answers (question_id, seller_id, answer_text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [questionId, sellerId, answerText]
  );
  return result.rows[0];
};

const getFastDispatchProducts = async (pool) => {
  const result = await pool.query(
    `SELECT
       p.product_id,
       p.seller_id,
       s.company_name AS seller_name,
       s.is_verified AS seller_verified,
       p.category_id,
       c.name AS category_name,
       p.title,
       p.brand,
       p.description,
       p.base_price,
       p.created_at,
       p.is_active,
       media.media_url AS primary_image,
       (p.base_price + COALESCE(price_bounds.min_adjustment, 0)) AS lowest_price,
       (p.base_price + COALESCE(price_bounds.max_adjustment, 0)) AS highest_price,
       reviews_summary.avg_rating,
       reviews_summary.review_count,
       stock_summary.total_stock
     FROM products p
     JOIN sellers s ON s.seller_id = p.seller_id
     LEFT JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN LATERAL (
       SELECT media_url
       FROM product_media
       WHERE product_id = p.product_id AND media_type = 'image'
       ORDER BY is_primary DESC, display_order ASC, media_id ASC
       LIMIT 1
     ) media ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         MIN(COALESCE(price_adjustment, 0)) AS min_adjustment,
         MAX(COALESCE(price_adjustment, 0)) AS max_adjustment
       FROM product_variants
       WHERE product_id = p.product_id AND is_active = TRUE
     ) price_bounds ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(AVG(r.rating)::numeric(10,2), 0) AS avg_rating,
         COUNT(*)::int AS review_count
       FROM reviews r
       WHERE r.product_id = p.product_id
     ) reviews_summary ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT i.warehouse_id)::int AS warehouse_count,
         COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock
       FROM product_variants pv
       LEFT JOIN inventory i ON i.variant_id = pv.variant_id
       WHERE pv.product_id = p.product_id AND pv.is_active = TRUE
     ) stock_summary ON TRUE
     WHERE p.is_active = TRUE
       AND stock_summary.total_stock > 0
     ORDER BY stock_summary.warehouse_count DESC, stock_summary.total_stock DESC, reviews_summary.avg_rating DESC, p.created_at DESC
     LIMIT 8`
  );
  return result.rows;
};

const getRecentlyViewedProducts = async (pool) => {
  const result = await pool.query(
    `SELECT
       p.product_id,
       p.seller_id,
       s.company_name AS seller_name,
       s.is_verified AS seller_verified,
       p.category_id,
       c.name AS category_name,
       p.title,
       p.brand,
       p.description,
       p.base_price,
       p.created_at,
       p.is_active,
       media.media_url AS primary_image,
       (p.base_price + COALESCE(price_bounds.min_adjustment, 0)) AS lowest_price,
       (p.base_price + COALESCE(price_bounds.max_adjustment, 0)) AS highest_price,
       reviews_summary.avg_rating,
       reviews_summary.review_count,
       stock_summary.total_stock,
       COUNT(bh.history_id)::int AS browse_count,
       COUNT(DISTINCT bh.user_id)::int AS repeat_viewers
     FROM browsing_history bh
     JOIN products p ON p.product_id = bh.product_id AND p.is_active = TRUE
     JOIN sellers s ON s.seller_id = p.seller_id
     LEFT JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN LATERAL (
       SELECT media_url
       FROM product_media
       WHERE product_id = p.product_id AND media_type = 'image'
       ORDER BY is_primary DESC, display_order ASC, media_id ASC
       LIMIT 1
     ) media ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         MIN(COALESCE(price_adjustment, 0)) AS min_adjustment,
         MAX(COALESCE(price_adjustment, 0)) AS max_adjustment
       FROM product_variants
       WHERE product_id = p.product_id AND is_active = TRUE
     ) price_bounds ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(AVG(r.rating)::numeric(10,2), 0) AS avg_rating,
         COUNT(*)::int AS review_count
       FROM reviews r
       WHERE r.product_id = p.product_id
     ) reviews_summary ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock
       FROM product_variants pv
       LEFT JOIN inventory i ON i.variant_id = pv.variant_id
       WHERE pv.product_id = p.product_id AND pv.is_active = TRUE
     ) stock_summary ON TRUE
     GROUP BY p.product_id, s.company_name, s.is_verified, c.name, media.media_url,
              price_bounds.min_adjustment, price_bounds.max_adjustment,
              reviews_summary.avg_rating, reviews_summary.review_count, stock_summary.total_stock
     ORDER BY repeat_viewers DESC, browse_count DESC, reviews_summary.avg_rating DESC
     LIMIT 8`
  );
  return result.rows;
};

const getCategoriesWithSampleMedia = async (pool) => {
  const result = await pool.query(
    `SELECT
       c.category_id,
       c.name,
       c.description,
       COUNT(p.product_id)::int AS product_count,
       sample_media.media_url AS sample_image
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.category_id AND p.is_active = TRUE
     LEFT JOIN LATERAL (
       SELECT pm.media_url
       FROM products p2
       JOIN product_media pm ON pm.product_id = p2.product_id
       WHERE p2.category_id = c.category_id
         AND p2.is_active = TRUE
         AND pm.media_type = 'image'
         AND EXISTS (
           SELECT 1
           FROM product_variants pv
           JOIN inventory i ON i.variant_id = pv.variant_id
           WHERE pv.product_id = p2.product_id
             AND pv.is_active = TRUE
             AND i.stock_quantity > 0
         )
       ORDER BY pm.is_primary DESC, pm.display_order ASC, pm.media_id ASC
       LIMIT 1
     ) sample_media ON TRUE
     GROUP BY c.category_id, sample_media.media_url
     ORDER BY product_count DESC, c.name ASC
     LIMIT 8`
  );
  return result.rows;
};

const getSpotlightSellers = async (pool) => {
  const result = await pool.query(
    `SELECT
       s.seller_id,
       s.company_name,
       s.rating,
       COUNT(DISTINCT p.product_id)::int AS active_products,
       COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric(12,2) AS gross_sales
     FROM sellers s
     JOIN products p ON p.seller_id = s.seller_id AND p.is_active = TRUE
     LEFT JOIN product_variants pv ON pv.product_id = p.product_id
     LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
     WHERE s.is_verified = TRUE
     GROUP BY s.seller_id
     ORDER BY gross_sales DESC, active_products DESC, s.company_name ASC
     LIMIT 6`
  );
  return result.rows;
};

const getMarketplaceMetrics = async (pool) => {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM sellers WHERE is_verified = TRUE) AS verified_seller_count,
       (SELECT COUNT(*)::int FROM products WHERE is_active = TRUE) AS active_product_count,
       (SELECT COUNT(*)::int FROM orders) AS order_count,
       (SELECT COUNT(DISTINCT city)::int FROM warehouses WHERE is_active = TRUE) AS warehouse_city_count`
  );
  return result.rows[0] || {};
};

module.exports = {
  findCategoryById,
  findWarehousesByIds,
  insertProduct,
  findProductBySeller,
  updateProductFields,
  deactivateProductRow,
  findActiveProduct,
  findVariantBySeller,
  findVariantOwnerBySeller,
  insertVariant,
  updateVariantRow,
  updateVariantFields,
  deleteInventoryByVariant,
  insertInventoryRow,
  deleteProductMedia,
  insertProductMedia,
  deleteProductSpecs,
  insertProductSpec,
  checkUserPurchased,
  findExistingReview,
  insertReview,
  insertQuestion,
  findQuestionBySeller,
  findExistingAnswer,
  insertAnswer,
  getFastDispatchProducts,
  getRecentlyViewedProducts,
  getCategoriesWithSampleMedia,
  getSpotlightSellers,
  getMarketplaceMetrics,
};