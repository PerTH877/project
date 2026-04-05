const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 24;

const PRODUCT_SORTS = {
  newest: "p.created_at DESC, p.product_id DESC",
  "price-asc": "lowest_price ASC NULLS LAST, p.product_id DESC",
  "price-desc": "lowest_price DESC NULLS LAST, p.product_id DESC",
  popular: "popularity_score DESC, review_count DESC, avg_rating DESC, p.product_id DESC",
  rating: "avg_rating DESC, review_count DESC, p.product_id DESC",
  "name-asc": "p.title ASC",
};

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const parsePagination = (query = {}) => {
  const page = Math.max(DEFAULT_PAGE, parseId(query.page) ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseId(query.page_size) ?? DEFAULT_PAGE_SIZE)
  );

  return { page, pageSize, offset: (page - 1) * pageSize };
};

const getProductSort = (sort) => PRODUCT_SORTS[sort] || PRODUCT_SORTS.newest;

const mapProductRow = (row) => ({
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


const buildProductFilters = ({
  search,
  categoryId,
  sellerId,
  minPrice,
  maxPrice,
  minRating,
  inStock,
  attributes,
  includeInactive = false,
}) => {
  const filters = [];
  const params = [];

  if (!includeInactive) {
    filters.push("p.is_active = TRUE");
  }

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    filters.push(
      `(p.title ILIKE $${params.length} OR COALESCE(p.brand, '') ILIKE $${params.length} OR COALESCE(p.description, '') ILIKE $${params.length})`
    );
  }

  if (categoryId) {
    params.push(categoryId);
    filters.push(`p.category_id = $${params.length}`);
  }

  if (sellerId) {
    params.push(sellerId);
    filters.push(`p.seller_id = $${params.length}`);
  }

  if (minPrice !== null && minPrice !== undefined) {
    params.push(minPrice);
    filters.push(`(p.base_price + COALESCE(price_bounds.min_adjustment, 0)) >= $${params.length}`);
  }

  if (maxPrice !== null && maxPrice !== undefined) {
    params.push(maxPrice);
    filters.push(`(p.base_price + COALESCE(price_bounds.max_adjustment, 0)) <= $${params.length}`);
  }

  if (minRating !== null && minRating !== undefined) {
    params.push(minRating);
    filters.push(`COALESCE(reviews_summary.avg_rating, 0) >= $${params.length}`);
  }

  if (inStock === true) {
    filters.push(`COALESCE(stock_summary.total_stock, 0) > 0`);
  }

  if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key && value) {
        params.push(key);
        params.push(value);
        filters.push(`EXISTS (
          SELECT 1 FROM product_variants pv_attr 
          WHERE pv_attr.product_id = p.product_id 
          AND pv_attr.attributes->>$${params.length - 1} = $${params.length}
        )`);
      }
    });
  }

  return {
    whereClause: filters.length ? `WHERE ${filters.join(" AND ")}` : "",
    params,
  };
};


const baseProductSelect = `
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
    SELECT COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock
    FROM product_variants pv
    LEFT JOIN inventory i ON i.variant_id = pv.variant_id
    WHERE pv.product_id = p.product_id AND pv.is_active = TRUE
  ) stock_summary ON TRUE
  LEFT JOIN LATERAL (
    SELECT (
      COALESCE((
        SELECT SUM(oi.quantity)::int
        FROM order_items oi
        JOIN product_variants pv_orders ON pv_orders.variant_id = oi.variant_id
        WHERE pv_orders.product_id = p.product_id
      ), 0) * 4
      + COALESCE((
        SELECT COUNT(*)::int
        FROM cart cart_rows
        JOIN product_variants pv_cart ON pv_cart.variant_id = cart_rows.variant_id
        WHERE pv_cart.product_id = p.product_id
      ), 0) * 3
      + COALESCE((
        SELECT COUNT(*)::int
        FROM wishlist_items wi
        JOIN product_variants pv_wish ON pv_wish.variant_id = wi.variant_id
        WHERE pv_wish.product_id = p.product_id
      ), 0) * 2
      + COALESCE((
        SELECT COUNT(*)::int
        FROM browsing_history bh
        WHERE bh.product_id = p.product_id
      ), 0)
    )::int AS popularity_score
  ) engagement_summary ON TRUE
`;


const fetchProductList = async (db, query = {}, options = {}) => {
  const page = options.page ?? parsePagination(query).page;
  const pageSize = options.pageSize ?? parsePagination(query).pageSize;
  const offset = options.offset ?? (page - 1) * pageSize;
  const categoryId = parseId(query.category_id);
  const sellerId = parseId(query.seller_id);
  const minPrice = parseNumber(query.min_price, null);
  const maxPrice = parseNumber(query.max_price, null);
  const minRating = parseNumber(query.min_rating, null);
  const inStock = query.in_stock === 'true';
  const includeInactive = options.includeInactive === true;
  
  let attributes = null;
  if (query.attributes) {
    try {
      attributes = typeof query.attributes === 'string' ? JSON.parse(query.attributes) : query.attributes;
    } catch(e) {}
  }

  const { whereClause, params } = buildProductFilters({
    search: query.search,
    categoryId,
    sellerId,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    attributes,
    includeInactive,
  });

  const selectClause = `
    SELECT
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
      engagement_summary.popularity_score
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    ${baseProductSelect}
    ${whereClause}
  `;

  const countResult = await db.query(countQuery, params);
  const total = countResult.rows[0]?.total ?? 0;

  const listParams = [...params, pageSize, offset];
  const orderClause = getProductSort(query.sort);
  const listQuery = `
    ${selectClause}
    ${baseProductSelect}
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${listParams.length - 1}
    OFFSET $${listParams.length}
  `;

  const result = await db.query(listQuery, listParams);

  return {
    products: result.rows.map(mapProductRow),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    },
    filters: {
      search: query.search?.trim?.() || "",
      category_id: categoryId,
      seller_id: sellerId,
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating,
      in_stock: inStock,
      sort: query.sort || "newest",
    },
  };
};


const fetchProductDetail = async (db, productId, options = {}) => {
  const includeInactive = options.includeInactive === true;
  const params = [productId];
  const productQuery = `
    SELECT
      p.product_id,
      p.seller_id,
      s.company_name AS seller_name,
      s.contact_email AS seller_email,
      s.rating AS seller_rating,
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
      reviews_summary.avg_rating,
      reviews_summary.review_count,
      stock_summary.total_stock,
      question_summary.question_count,
      unanswered_summary.unanswered_count
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
        COALESCE(AVG(rating)::numeric(10,2), 0) AS avg_rating,
        COUNT(*)::int AS review_count
      FROM reviews
      WHERE product_id = p.product_id
    ) reviews_summary ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock
      FROM product_variants pv
      LEFT JOIN inventory i ON i.variant_id = pv.variant_id
      WHERE pv.product_id = p.product_id AND pv.is_active = TRUE
    ) stock_summary ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS question_count
      FROM product_questions pq
      WHERE pq.product_id = p.product_id
    ) question_summary ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unanswered_count
      FROM product_questions pq
      LEFT JOIN product_answers pa ON pa.question_id = pq.question_id
      WHERE pq.product_id = p.product_id AND pa.answer_id IS NULL
    ) unanswered_summary ON TRUE
    WHERE p.product_id = $1
      ${includeInactive ? "" : "AND p.is_active = TRUE"}
    LIMIT 1
  `;

  const productResult = await db.query(productQuery, params);
  const productRow = productResult.rows[0];

  if (!productRow) {
    return null;
  }

  const [mediaResult, specsResult, variantsResult, reviewsResult, questionsResult, relatedResult] =
    await Promise.all([
      db.query(
        `SELECT media_id, media_url, media_type, is_primary, display_order
         FROM product_media
         WHERE product_id = $1
         ORDER BY is_primary DESC, display_order ASC, media_id ASC`,
        [productId]
      ),
      db.query(
        `SELECT spec_id, spec_key, spec_value
         FROM product_specifications
         WHERE product_id = $1
         ORDER BY spec_key ASC, spec_id ASC`,
        [productId]
      ),
      db.query(
        `SELECT
           pv.variant_id,
           pv.product_id,
           pv.sku,
           pv.attributes,
           pv.price_adjustment,
           pv.is_active,
           COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'inventory_id', i.inventory_id,
                 'warehouse_id', i.warehouse_id,
                 'warehouse_name', w.name,
                 'city', w.city,
                 'stock_quantity', i.stock_quantity,
                 'aisle_location', i.aisle_location
               )
               ORDER BY w.city ASC, w.name ASC
             ) FILTER (WHERE i.inventory_id IS NOT NULL),
             '[]'::json
           ) AS inventory
         FROM product_variants pv
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id
         LEFT JOIN warehouses w ON w.warehouse_id = i.warehouse_id
         WHERE pv.product_id = $1
           ${includeInactive ? "" : "AND pv.is_active = TRUE"}
         GROUP BY pv.variant_id
         ORDER BY pv.variant_id ASC`,
        [productId]
      ),
      db.query(
        `SELECT
           r.review_id,
           r.rating,
           r.comment,
           r.images,
           r.created_at,
           u.user_id,
           u.full_name
         FROM reviews r
         LEFT JOIN users u ON u.user_id = r.user_id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC, r.review_id DESC`,
        [productId]
      ),
      db.query(
        `SELECT
           pq.question_id,
           pq.question_text,
           pq.created_at AS question_created_at,
           qu.user_id AS question_user_id,
           qu.full_name AS question_user_name,
           pa.answer_id,
           pa.answer_text,
           pa.created_at AS answer_created_at,
           seller.seller_id AS answer_seller_id,
           seller.company_name AS answer_seller_name,
           au.user_id AS answer_user_id,
           au.full_name AS answer_user_name
         FROM product_questions pq
         LEFT JOIN users qu ON qu.user_id = pq.user_id
         LEFT JOIN product_answers pa ON pa.question_id = pq.question_id
         LEFT JOIN sellers seller ON seller.seller_id = pa.seller_id
         LEFT JOIN users au ON au.user_id = pa.user_id
         WHERE pq.product_id = $1
         ORDER BY pq.created_at DESC, pq.question_id DESC, pa.created_at ASC NULLS LAST`,
        [productId]
      ),
      db.query(
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
           SELECT MIN(COALESCE(price_adjustment, 0)) AS min_adjustment,
                  MAX(COALESCE(price_adjustment, 0)) AS max_adjustment
           FROM product_variants
           WHERE product_id = p.product_id AND is_active = TRUE
         ) price_bounds ON TRUE
         LEFT JOIN LATERAL (
           SELECT COALESCE(AVG(rating)::numeric(10,2), 0) AS avg_rating,
                  COUNT(*)::int AS review_count
           FROM reviews
           WHERE product_id = p.product_id
         ) reviews_summary ON TRUE
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(i.stock_quantity), 0)::int AS total_stock
           FROM product_variants pv
           LEFT JOIN inventory i ON i.variant_id = pv.variant_id
           WHERE pv.product_id = p.product_id AND pv.is_active = TRUE
         ) stock_summary ON TRUE
         WHERE p.product_id <> $1
           AND p.is_active = TRUE
           AND (
             p.category_id = $2
             OR p.seller_id = $3
           )
         ORDER BY reviews_summary.review_count DESC, p.created_at DESC
         LIMIT 4`,
        [productId, productRow.category_id, productRow.seller_id]
      ),
    ]);

  const questionsMap = new Map();
  for (const row of questionsResult.rows) {
    const existing =
      questionsMap.get(row.question_id) ||
      {
        question_id: row.question_id,
        question_text: row.question_text,
        created_at: row.question_created_at,
        user: row.question_user_id
          ? {
              user_id: row.question_user_id,
              full_name: row.question_user_name,
            }
          : null,
        answers: [],
      };

    if (row.answer_id) {
      existing.answers.push({
        answer_id: row.answer_id,
        answer_text: row.answer_text,
        created_at: row.answer_created_at,
        seller: row.answer_seller_id
          ? {
              seller_id: row.answer_seller_id,
              company_name: row.answer_seller_name,
            }
          : null,
        user: row.answer_user_id
          ? {
              user_id: row.answer_user_id,
              full_name: row.answer_user_name,
            }
          : null,
      });
    }

    questionsMap.set(row.question_id, existing);
  }

  return {
    product: {
      ...mapProductRow(productRow),
      seller_email: productRow.seller_email,
      seller_rating: Number(productRow.seller_rating ?? 0),
      question_count: Number(productRow.question_count ?? 0),
      unanswered_count: Number(productRow.unanswered_count ?? 0),
    },
    media: mediaResult.rows,
    specifications: specsResult.rows,
    variants: variantsResult.rows.map((variant) => ({
      variant_id: variant.variant_id,
      product_id: variant.product_id,
      sku: variant.sku,
      attributes: variant.attributes || {},
      price_adjustment: Number(variant.price_adjustment ?? 0),
      is_active: variant.is_active,
      total_stock: Number(variant.total_stock ?? 0),
      inventory: variant.inventory || [],
    })),
    reviews: reviewsResult.rows.map((review) => ({
      review_id: review.review_id,
      rating: review.rating,
      comment: review.comment,
      images: review.images || [],
      created_at: review.created_at,
      user: review.user_id
        ? {
            user_id: review.user_id,
            full_name: review.full_name,
          }
        : null,
    })),
    questions: Array.from(questionsMap.values()),
    related_products: relatedResult.rows.map(mapProductRow),
  };
};

const fetchCartItems = async (db, userId) => {
  const itemsResult = await db.query(
    `SELECT
       c.cart_id,
       c.quantity,
       c.added_at,
       c.is_saved,
       pv.variant_id,
       pv.sku,
       pv.attributes,
       pv.price_adjustment,
       pv.is_active AS variant_is_active,
       p.product_id,
       p.title,
       p.brand,
       p.base_price,
       p.seller_id,
       s.company_name AS seller_name,
       media.media_url AS primary_image,
       COALESCE(stock_summary.total_stock, 0)::int AS available_stock
     FROM cart c
     JOIN product_variants pv ON pv.variant_id = c.variant_id
     JOIN products p ON p.product_id = pv.product_id
     JOIN sellers s ON s.seller_id = p.seller_id
     LEFT JOIN LATERAL (
       SELECT media_url
       FROM product_media
       WHERE product_id = p.product_id AND media_type = 'image'
       ORDER BY is_primary DESC, display_order ASC, media_id ASC
       LIMIT 1
     ) media ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock
       FROM inventory
       WHERE variant_id = pv.variant_id
     ) stock_summary ON TRUE
     WHERE c.user_id = $1
     ORDER BY c.cart_id ASC`,
    [userId]
  );

  const totalResult = await db.query("SELECT get_cart_total($1) AS total", [userId]);
  const subtotal = Number(totalResult.rows[0]?.total ?? 0);
  const items = itemsResult.rows.map((row) => {
    const unitPrice = Number(row.base_price) + Number(row.price_adjustment ?? 0);
    return {
      cart_id: row.cart_id,
      quantity: row.quantity,
      added_at: row.added_at,
      is_saved: row.is_saved === true,
      unit_price: unitPrice,
      line_total: unitPrice * Number(row.quantity),
      availability: {
        in_stock: Number(row.available_stock) >= Number(row.quantity),
        available_stock: Number(row.available_stock ?? 0),
      },
      variant: {
        variant_id: row.variant_id,
        sku: row.sku,
        attributes: row.attributes || {},
        price_adjustment: Number(row.price_adjustment ?? 0),
        is_active: row.variant_is_active,
      },
      product: {
        product_id: row.product_id,
        seller_id: row.seller_id,
        seller_name: row.seller_name,
        title: row.title,
        brand: row.brand,
        base_price: Number(row.base_price),
        primary_image: row.primary_image,
      },
    };
  });

  return {
    items,
    summary: {
      item_count: items.length,
      quantity_total: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      subtotal,
    },
  };
};

const fetchWishlistSummaries = async (db, userId) => {
  const wishlistsResult = await db.query(
    `SELECT wishlist_id, user_id, name, is_public, created_at
     FROM wishlists
     WHERE user_id = $1
     ORDER BY created_at DESC, wishlist_id DESC`,
    [userId]
  );

  const wishlistIds = wishlistsResult.rows.map((row) => row.wishlist_id);
  if (!wishlistIds.length) {
    return [];
  }

  const itemsResult = await db.query(
    `SELECT
       wi.item_id,
       wi.wishlist_id,
       wi.variant_id,
       wi.added_at,
       pv.sku,
       pv.attributes,
       pv.price_adjustment,
       p.product_id,
       p.title,
       p.brand,
       p.base_price,
       media.media_url AS primary_image
     FROM wishlist_items wi
     JOIN product_variants pv ON pv.variant_id = wi.variant_id
     JOIN products p ON p.product_id = pv.product_id
     LEFT JOIN LATERAL (
       SELECT media_url
       FROM product_media
       WHERE product_id = p.product_id AND media_type = 'image'
       ORDER BY is_primary DESC, display_order ASC, media_id ASC
       LIMIT 1
     ) media ON TRUE
     WHERE wi.wishlist_id = ANY($1::int[])
     ORDER BY wi.added_at DESC, wi.item_id DESC`,
    [wishlistIds]
  );

  const itemsByWishlist = new Map();
  for (const item of itemsResult.rows) {
    if (!itemsByWishlist.has(item.wishlist_id)) {
      itemsByWishlist.set(item.wishlist_id, []);
    }

    itemsByWishlist.get(item.wishlist_id).push({
      item_id: item.item_id,
      variant_id: item.variant_id,
      added_at: item.added_at,
      sku: item.sku,
      attributes: item.attributes || {},
      price: Number(item.base_price) + Number(item.price_adjustment ?? 0),
      product: {
        product_id: item.product_id,
        title: item.title,
        brand: item.brand,
        base_price: Number(item.base_price),
        primary_image: item.primary_image,
      },
    });
  }

  return wishlistsResult.rows.map((wishlist) => ({
    ...wishlist,
    items: itemsByWishlist.get(wishlist.wishlist_id) || [],
  }));
};

module.exports = {
  parseId,
  parseNumber,
  parsePagination,
  fetchProductList,
  fetchProductDetail,
  fetchCartItems,
  fetchWishlistSummaries,
};
