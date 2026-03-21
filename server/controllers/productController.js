const pool = require("../config/db");
const {
  parseId,
  parsePagination,
  fetchProductList,
  fetchProductDetail,
} = require("../utils/marketplace");

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const normalizeMedia = (media = []) =>
  Array.isArray(media)
    ? media
        .map((item, index) => ({
          media_url: normalizeText(item?.media_url),
          media_type: normalizeText(item?.media_type) || "image",
          is_primary: item?.is_primary === true || index === 0,
          display_order: Number.isFinite(Number(item?.display_order))
            ? Number(item.display_order)
            : index,
        }))
        .filter((item) => item.media_url)
    : [];

const normalizeSpecifications = (specifications = []) =>
  Array.isArray(specifications)
    ? specifications
        .map((spec) => ({
          spec_key: normalizeText(spec?.spec_key),
          spec_value: normalizeText(spec?.spec_value),
        }))
        .filter((spec) => spec.spec_key && spec.spec_value)
    : [];

const mapHomeProductRow = (row) => ({
  product_id: row.product_id,
  seller_id: row.seller_id,
  seller_name: row.seller_name,
  seller_verified: row.seller_verified,
  category_id: row.category_id,
  category_name: row.category_name,
  title: row.title,
  brand: row.brand,
  description: row.description,
  base_price: Number(row.base_price),
  lowest_price: Number(row.lowest_price ?? row.base_price),
  highest_price: Number(row.highest_price ?? row.base_price),
  created_at: row.created_at,
  is_active: row.is_active,
  primary_image: row.primary_image,
  avg_rating: Number(row.avg_rating ?? 0),
  review_count: Number(row.review_count ?? 0),
  total_stock: Number(row.total_stock ?? 0),
});

const normalizeVariantPayload = (variants = []) => {
  if (!Array.isArray(variants) || !variants.length) {
    throw new Error("variants is required and must be a non-empty array");
  }

  return variants.map((variant, index) => {
    const sku = normalizeText(variant?.sku);
    const attributes =
      variant?.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
        ? Object.fromEntries(
            Object.entries(variant.attributes)
              .map(([key, value]) => [String(key).trim(), String(value).trim()])
              .filter(([key, value]) => key && value)
          )
        : null;

    if (!sku) {
      throw new Error(`Variant ${index + 1} requires a SKU`);
    }

    if (!attributes || !Object.keys(attributes).length) {
      throw new Error(`Variant ${index + 1} requires at least one attribute`);
    }

    const inventory = Array.isArray(variant.inventory)
      ? variant.inventory.map((entry, entryIndex) => {
          const warehouseId = Number(entry?.warehouse_id);
          const stockQuantity = Number(entry?.stock_quantity);

          if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
            throw new Error(
              `Variant ${index + 1} inventory row ${entryIndex + 1} needs a valid warehouse_id`
            );
          }

          if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
            throw new Error(
              `Variant ${index + 1} inventory row ${entryIndex + 1} needs stock_quantity >= 0`
            );
          }

          return {
            warehouse_id: warehouseId,
            stock_quantity: stockQuantity,
            aisle_location: normalizeText(entry?.aisle_location),
          };
        })
      : [];

    return {
      variant_id: parseId(variant?.variant_id),
      sku,
      attributes,
      price_adjustment: Number(variant?.price_adjustment ?? 0),
      is_active:
        variant?.is_active === undefined || variant?.is_active === null
          ? true
          : Boolean(variant.is_active),
      inventory,
    };
  });
};

const ensureCategoryExists = async (client, categoryId) => {
  if (!categoryId) {
    return;
  }

  const result = await client.query(
    "SELECT category_id FROM categories WHERE category_id = $1",
    [categoryId]
  );

  if (!result.rows.length) {
    throw new Error("Selected category does not exist");
  }
};

const ensureWarehouseIdsExist = async (client, variants) => {
  const warehouseIds = Array.from(
    new Set(
      variants
        .flatMap((variant) => variant.inventory || [])
        .map((entry) => Number(entry.warehouse_id))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (!warehouseIds.length) {
    return;
  }

  const result = await client.query(
    "SELECT warehouse_id FROM warehouses WHERE warehouse_id = ANY($1::int[])",
    [warehouseIds]
  );

  const found = new Set(result.rows.map((row) => row.warehouse_id));
  const missing = warehouseIds.filter((warehouseId) => !found.has(warehouseId));

  if (missing.length) {
    throw new Error(`Unknown warehouse_id values: ${missing.join(", ")}`);
  }
};

const replaceProductMedia = async (client, productId, media) => {
  if (!Array.isArray(media)) {
    return;
  }

  await client.query("DELETE FROM product_media WHERE product_id = $1", [productId]);

  for (const item of media) {
    await client.query(
      `INSERT INTO product_media (product_id, media_url, media_type, is_primary, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, item.media_url, item.media_type, item.is_primary, item.display_order]
    );
  }
};

const replaceProductSpecifications = async (client, productId, specifications) => {
  if (!Array.isArray(specifications)) {
    return;
  }

  await client.query("DELETE FROM product_specifications WHERE product_id = $1", [productId]);

  for (const spec of specifications) {
    await client.query(
      `INSERT INTO product_specifications (product_id, spec_key, spec_value)
       VALUES ($1, $2, $3)`,
      [productId, spec.spec_key, spec.spec_value]
    );
  }
};

const upsertVariants = async (client, productId, variants, sellerId) => {
  const savedVariants = [];

  for (const variant of variants) {
    let variantId = variant.variant_id;

    if (variantId) {
      const ownedVariant = await client.query(
        `SELECT pv.variant_id
         FROM product_variants pv
         JOIN products p ON p.product_id = pv.product_id
         WHERE pv.variant_id = $1 AND p.product_id = $2 AND p.seller_id = $3`,
        [variantId, productId, sellerId]
      );

      if (!ownedVariant.rows.length) {
        throw new Error(`Variant ${variantId} does not belong to this product`);
      }

      const updatedVariant = await client.query(
        `UPDATE product_variants
         SET sku = $1,
             attributes = $2,
             price_adjustment = $3,
             is_active = $4
         WHERE variant_id = $5
         RETURNING *`,
        [
          variant.sku,
          variant.attributes,
          variant.price_adjustment,
          variant.is_active,
          variantId,
        ]
      );

      savedVariants.push(updatedVariant.rows[0]);
    } else {
      const insertedVariant = await client.query(
        `INSERT INTO product_variants (product_id, sku, attributes, price_adjustment, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          productId,
          variant.sku,
          variant.attributes,
          variant.price_adjustment,
          variant.is_active,
        ]
      );

      variantId = insertedVariant.rows[0].variant_id;
      savedVariants.push(insertedVariant.rows[0]);
    }

    if (Array.isArray(variant.inventory)) {
      await client.query("DELETE FROM inventory WHERE variant_id = $1", [variantId]);

      for (const inventoryRow of variant.inventory) {
        await client.query(
          `INSERT INTO inventory (variant_id, warehouse_id, stock_quantity, aisle_location)
           VALUES ($1, $2, $3, $4)`,
          [
            variantId,
            inventoryRow.warehouse_id,
            inventoryRow.stock_quantity,
            inventoryRow.aisle_location,
          ]
        );
      }
    }
  }

  return savedVariants;
};

const getHomeFeed = async (_req, res) => {
  try {
    const [
      featuredProducts,
      trendingProducts,
      newArrivals,
      dealProducts,
      topRatedProducts,
      fastDispatchResult,
      recentViewsResult,
      categoriesResult,
      spotlightResult,
      metricsResult,
    ] =
      await Promise.all([
        fetchProductList(pool, { sort: "popular", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "rating", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "newest", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "price-asc", max_price: 5000, page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "rating", page: 1, page_size: 8 }),
        pool.query(
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
        ),
        pool.query(
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
           GROUP BY p.product_id, s.company_name, s.is_verified, c.name, media.media_url, price_bounds.min_adjustment, price_bounds.max_adjustment, reviews_summary.avg_rating, reviews_summary.review_count, stock_summary.total_stock
           ORDER BY repeat_viewers DESC, browse_count DESC, reviews_summary.avg_rating DESC
           LIMIT 8`
        ),
        pool.query(
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
        ),
        pool.query(
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
        ),
        pool.query(
          `SELECT
             (SELECT COUNT(*)::int FROM sellers WHERE is_verified = TRUE) AS verified_seller_count,
             (SELECT COUNT(*)::int FROM products WHERE is_active = TRUE) AS active_product_count,
             (SELECT COUNT(*)::int FROM orders) AS order_count,
             (SELECT COUNT(DISTINCT city)::int FROM warehouses WHERE is_active = TRUE) AS warehouse_city_count`
        ),
      ]);

    const metrics = metricsResult.rows[0] || {};

    return res.json({
      hero: {
        title: "Shop verified products from sellers across Bangladesh",
        subtitle:
          "Browse electronics, fashion, home goods, beauty, and daily essentials with clear pricing, ratings, and delivery coverage.",
        metrics: [
          { label: "Verified sellers", value: Number(metrics.verified_seller_count ?? 0) },
          { label: "Products live", value: Number(metrics.active_product_count ?? 0) },
          { label: "Orders placed", value: Number(metrics.order_count ?? 0) },
          { label: "Warehouse cities", value: Number(metrics.warehouse_city_count ?? 0) },
        ],
      },
      featured_products: featuredProducts.products,
      trending_products: trendingProducts.products,
      new_arrivals: newArrivals.products,
      deal_products: dealProducts.products,
      fast_dispatch_products: fastDispatchResult.rows.map(mapHomeProductRow),
      top_rated_products: topRatedProducts.products,
      recently_viewed_products: recentViewsResult.rows.map(mapHomeProductRow),
      categories: categoriesResult.rows,
      spotlight_sellers: spotlightResult.rows.map((row) => ({
        seller_id: row.seller_id,
        company_name: row.company_name,
        rating: Number(row.rating ?? 0),
        active_products: Number(row.active_products ?? 0),
        gross_sales: Number(row.gross_sales ?? 0),
      })),
    });
  } catch (err) {
    console.error("getHomeFeed:", err.message);
    return res.status(500).json({ error: "Failed to load marketplace home feed" });
  }
};

const listProducts = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const payload = await fetchProductList(pool, req.query, pagination);
    return res.json(payload);
  } catch (err) {
    console.error("listProducts:", err.message);
    return res.status(500).json({ error: "Failed to load products" });
  }
};

const getProduct = async (req, res) => {
  const productId = parseId(req.params.product_id);
  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  try {
    const payload = await fetchProductDetail(pool, productId);
    if (!payload) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(payload);
  } catch (err) {
    console.error("getProduct:", err.message);
    return res.status(500).json({ error: "Failed to load product details" });
  }
};

const createProduct = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Missing seller_id in token" });
  }

  const title = normalizeText(req.body.title);
  const basePrice = Number(req.body.base_price);
  const categoryId =
    req.body.category_id === null || req.body.category_id === undefined || req.body.category_id === ""
      ? null
      : Number(req.body.category_id);

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return res.status(400).json({ error: "base_price must be a number >= 0" });
  }

  let variants;
  try {
    variants = normalizeVariantPayload(req.body.variants);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const media = normalizeMedia(req.body.media);
  const specifications = normalizeSpecifications(req.body.specifications);

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    await ensureCategoryExists(client, categoryId);
    await ensureWarehouseIdsExist(client, variants);

    const productResult = await client.query(
      `INSERT INTO products (seller_id, category_id, title, brand, description, base_price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [
        sellerId,
        categoryId,
        title,
        normalizeText(req.body.brand),
        normalizeText(req.body.description),
        basePrice,
      ]
    );

    const product = productResult.rows[0];
    const savedVariants = await upsertVariants(client, product.product_id, variants, sellerId);
    await replaceProductMedia(client, product.product_id, media);
    await replaceProductSpecifications(client, product.product_id, specifications);

    await client.query("COMMIT");

    const detail = await fetchProductDetail(pool, product.product_id, { includeInactive: true });
    return res.status(201).json({
      message: "Product created successfully",
      product: detail?.product || product,
      variants: savedVariants,
      detail,
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("createProduct:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "SKU already exists. Please use unique SKUs." });
    }

    return res.status(500).json({ error: err.message || "Server error while creating product" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const listSellerProducts = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const pagination = parsePagination({ ...req.query, seller_id: sellerId });
    const payload = await fetchProductList(
      pool,
      { ...req.query, seller_id: sellerId },
      { ...pagination, includeInactive: true }
    );
    return res.json(payload);
  } catch (err) {
    console.error("listSellerProducts:", err.message);
    return res.status(500).json({ error: "Failed to load seller products" });
  }
};

const getSellerProduct = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const productId = parseId(req.params.product_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  try {
    const detail = await fetchProductDetail(pool, productId, { includeInactive: true });
    if (!detail || detail.product.seller_id !== sellerId) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(detail);
  } catch (err) {
    console.error("getSellerProduct:", err.message);
    return res.status(500).json({ error: "Failed to load seller product" });
  }
};

const updateProduct = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const productId = parseId(req.params.product_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  const updates = [];
  const values = [];
  let index = 1;

  const title = req.body.title !== undefined ? normalizeText(req.body.title) : undefined;
  const brand = req.body.brand !== undefined ? normalizeText(req.body.brand) : undefined;
  const description =
    req.body.description !== undefined ? normalizeText(req.body.description) : undefined;

  if (title !== undefined) {
    if (!title) {
      return res.status(400).json({ error: "title cannot be empty" });
    }
    updates.push(`title = $${index++}`);
    values.push(title);
  }

  if (brand !== undefined) {
    updates.push(`brand = $${index++}`);
    values.push(brand);
  }

  if (description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(description);
  }

  if (req.body.base_price !== undefined) {
    const basePrice = Number(req.body.base_price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ error: "base_price must be a number >= 0" });
    }
    updates.push(`base_price = $${index++}`);
    values.push(basePrice);
  }

  let categoryId;
  if (req.body.category_id !== undefined) {
    categoryId =
      req.body.category_id === null || req.body.category_id === ""
        ? null
        : Number(req.body.category_id);

    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      return res.status(400).json({ error: "category_id must be a positive integer or null" });
    }

    updates.push(`category_id = $${index++}`);
    values.push(categoryId);
  }

  let variants;
  if (req.body.variants !== undefined) {
    try {
      variants = normalizeVariantPayload(req.body.variants);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const media = req.body.media !== undefined ? normalizeMedia(req.body.media) : undefined;
  const specifications =
    req.body.specifications !== undefined
      ? normalizeSpecifications(req.body.specifications)
      : undefined;

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const ownedProduct = await client.query(
      "SELECT product_id FROM products WHERE product_id = $1 AND seller_id = $2",
      [productId, sellerId]
    );

    if (!ownedProduct.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    if (categoryId !== undefined) {
      await ensureCategoryExists(client, categoryId);
    }

    if (variants) {
      await ensureWarehouseIdsExist(client, variants);
    }

    if (updates.length) {
      values.push(productId, sellerId);
      await client.query(
        `UPDATE products
         SET ${updates.join(", ")}
         WHERE product_id = $${values.length - 1} AND seller_id = $${values.length}`,
        values
      );
    }

    if (variants) {
      await upsertVariants(client, productId, variants, sellerId);
    }

    if (media !== undefined) {
      await replaceProductMedia(client, productId, media);
    }

    if (specifications !== undefined) {
      await replaceProductSpecifications(client, productId, specifications);
    }

    await client.query("COMMIT");

    const detail = await fetchProductDetail(pool, productId, { includeInactive: true });
    return res.json({ message: "Product updated successfully", detail });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("updateProduct:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "SKU already exists. Please use unique SKUs." });
    }

    return res.status(500).json({ error: err.message || "Failed to update product" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const deactivateProduct = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const productId = parseId(req.params.product_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE products
       SET is_active = FALSE
       WHERE product_id = $1 AND seller_id = $2
       RETURNING product_id, title, is_active`,
      [productId, sellerId]
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    await client.query("COMMIT");
    return res.json({ message: "Product deactivated", product: result.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("deactivateProduct:", err.message);
    return res.status(500).json({ error: "Failed to deactivate product" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const updateVariant = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const variantId = parseId(req.params.variant_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!variantId) {
    return res.status(400).json({ error: "variant_id must be a positive integer" });
  }

  const sku = req.body.sku !== undefined ? normalizeText(req.body.sku) : undefined;
  const priceAdjustment =
    req.body.price_adjustment !== undefined ? Number(req.body.price_adjustment) : undefined;
  const isActive =
    req.body.is_active !== undefined ? Boolean(req.body.is_active) : undefined;
  const attributes =
    req.body.attributes !== undefined &&
    req.body.attributes &&
    typeof req.body.attributes === "object" &&
    !Array.isArray(req.body.attributes)
      ? Object.fromEntries(
          Object.entries(req.body.attributes)
            .map(([key, value]) => [String(key).trim(), String(value).trim()])
            .filter(([key, value]) => key && value)
        )
      : undefined;

  if (sku !== undefined && !sku) {
    return res.status(400).json({ error: "sku cannot be empty" });
  }

  if (priceAdjustment !== undefined && !Number.isFinite(priceAdjustment)) {
    return res.status(400).json({ error: "price_adjustment must be numeric" });
  }

  if (attributes !== undefined && !Object.keys(attributes).length) {
    return res.status(400).json({ error: "attributes must include at least one key/value pair" });
  }

  const updates = [];
  const values = [];
  let index = 1;

  if (sku !== undefined) {
    updates.push(`sku = $${index++}`);
    values.push(sku);
  }
  if (attributes !== undefined) {
    updates.push(`attributes = $${index++}`);
    values.push(attributes);
  }
  if (priceAdjustment !== undefined) {
    updates.push(`price_adjustment = $${index++}`);
    values.push(priceAdjustment);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${index++}`);
    values.push(isActive);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No fields provided for update" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    values.push(variantId, sellerId);
    const result = await client.query(
      `UPDATE product_variants pv
       SET ${updates.join(", ")}
       FROM products p
       WHERE pv.variant_id = $${values.length - 1}
         AND p.product_id = pv.product_id
         AND p.seller_id = $${values.length}
       RETURNING pv.*`,
      values
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variant not found" });
    }

    await client.query("COMMIT");
    return res.json({ message: "Variant updated", variant: result.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("updateVariant:", err.message);
    if (err.code === "23505") {
      return res.status(409).json({ error: "SKU already exists. Please use a unique SKU." });
    }
    return res.status(500).json({ error: "Failed to update variant" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const updateVariantInventory = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const variantId = parseId(req.params.variant_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!variantId) {
    return res.status(400).json({ error: "variant_id must be a positive integer" });
  }

  if (!Array.isArray(req.body.inventory)) {
    return res.status(400).json({ error: "inventory must be an array" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const ownsVariant = await client.query(
      `SELECT pv.variant_id
       FROM product_variants pv
       JOIN products p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1 AND p.seller_id = $2`,
      [variantId, sellerId]
    );

    if (!ownsVariant.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variant not found" });
    }

    const variants = normalizeVariantPayload([
      {
        sku: "inventory-only",
        attributes: { scope: "inventory" },
        inventory: req.body.inventory,
      },
    ]);

    await ensureWarehouseIdsExist(client, variants);
    await client.query("DELETE FROM inventory WHERE variant_id = $1", [variantId]);

    for (const inventoryRow of variants[0].inventory) {
      await client.query(
        `INSERT INTO inventory (variant_id, warehouse_id, stock_quantity, aisle_location)
         VALUES ($1, $2, $3, $4)`,
        [
          variantId,
          inventoryRow.warehouse_id,
          inventoryRow.stock_quantity,
          inventoryRow.aisle_location,
        ]
      );
    }

    await client.query("COMMIT");
    return res.json({ message: "Inventory updated" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("updateVariantInventory:", err.message);
    return res.status(500).json({ error: err.message || "Failed to update inventory" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const createReview = async (req, res) => {
  const userId = req.user?.user_id;
  const productId = parseId(req.params.product_id);
  const rating = Number(req.body.rating);
  const comment = normalizeText(req.body.comment);
  const images = Array.isArray(req.body.images) ? req.body.images : [];

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be an integer from 1 to 5" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const purchaseCheck = await client.query(
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

    if (!purchaseCheck.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "Only customers who purchased this product can review it" });
    }

    const existingReview = await client.query(
      `SELECT review_id FROM reviews WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    if (existingReview.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already reviewed this product" });
    }

    const reviewResult = await client.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment, images)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [userId, productId, rating, comment, JSON.stringify(images)]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Review submitted", review: reviewResult.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("createReview:", err.message);
    return res.status(500).json({ error: "Failed to submit review" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const askProductQuestion = async (req, res) => {
  const userId = req.user?.user_id;
  const productId = parseId(req.params.product_id);
  const questionText = normalizeText(req.body.question_text);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ error: "product_id must be a positive integer" });
  }

  if (!questionText) {
    return res.status(400).json({ error: "question_text is required" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const productCheck = await client.query(
      "SELECT product_id FROM products WHERE product_id = $1 AND is_active = TRUE",
      [productId]
    );
    if (!productCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    const questionResult = await client.query(
      `INSERT INTO product_questions (product_id, user_id, question_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, userId, questionText]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Question submitted",
      question: questionResult.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("askProductQuestion:", err.message);
    return res.status(500).json({ error: "Failed to submit question" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const answerProductQuestion = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const questionId = parseId(req.params.question_id);
  const answerText = normalizeText(req.body.answer_text);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!questionId) {
    return res.status(400).json({ error: "question_id must be a positive integer" });
  }

  if (!answerText) {
    return res.status(400).json({ error: "answer_text is required" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const questionCheck = await client.query(
      `SELECT pq.question_id
       FROM product_questions pq
       JOIN products p ON p.product_id = pq.product_id
       WHERE pq.question_id = $1 AND p.seller_id = $2`,
      [questionId, sellerId]
    );

    if (!questionCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Question not found" });
    }

    const existingAnswer = await client.query(
      "SELECT answer_id FROM product_answers WHERE question_id = $1",
      [questionId]
    );

    if (existingAnswer.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This question already has an answer" });
    }

    const answerResult = await client.query(
      `INSERT INTO product_answers (question_id, seller_id, answer_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [questionId, sellerId, answerText]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Answer posted", answer: answerResult.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("answerProductQuestion:", err.message);
    return res.status(500).json({ error: "Failed to post answer" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  getHomeFeed,
  listProducts,
  getProduct,
  createProduct,
  listSellerProducts,
  getSellerProduct,
  updateProduct,
  deactivateProduct,
  updateVariant,
  updateVariantInventory,
  createReview,
  askProductQuestion,
  answerProductQuestion,
};
