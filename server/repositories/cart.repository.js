async function getCartItems(pool, userId) {
  const result = await pool.query(
    `SELECT
       c.cart_id,
       c.variant_id,
       c.quantity,
       c.is_saved,
       c.added_at,
       pv.sku,
       pv.price_adjustment,
       pv.attributes,
       p.product_id,
       p.title,
       p.base_price,
       s.company_name AS seller_name,
       media.media_url AS primary_image,
       COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
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
     LEFT JOIN inventory i ON i.variant_id = pv.variant_id
     WHERE c.user_id = $1
     GROUP BY c.cart_id, c.variant_id, c.quantity, c.is_saved, c.added_at, pv.sku, pv.price_adjustment, pv.attributes, p.product_id, p.title, p.base_price, s.company_name, media.media_url`,
    [userId]
  );
  return result.rows;
}




async function getVariantWithStock(client, variantId) {
  await client.query(
    `SELECT inventory_id FROM inventory WHERE variant_id = $1 FOR UPDATE`,
    [variantId]
  );

  const result = await client.query(
    `SELECT pv.variant_id, p.product_id, p.is_active, pv.is_active AS variant_is_active,
            COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
     FROM product_variants pv
     JOIN products p ON p.product_id = pv.product_id
     LEFT JOIN inventory i ON i.variant_id = pv.variant_id
     WHERE pv.variant_id = $1
     GROUP BY pv.variant_id, p.product_id, p.is_active, pv.is_active`,
    [variantId]
  );
  return result.rows[0] || null;
}

async function getCartItemByVariantId(client, userId, variantId) {
  const result = await client.query(
    "SELECT cart_id, quantity FROM cart WHERE user_id = $1 AND variant_id = $2",
    [userId, variantId]
  );
  return result.rows[0] || null;
}

async function upsertCartItem(client, userId, variantId, quantity, cartId = null) {
  let result;
  
  if (cartId) {
    result = await client.query(
      `UPDATE cart
       SET quantity = $1, added_at = NOW()
       WHERE cart_id = $2
       RETURNING *`,
      [quantity, cartId]
    );
  } else {
    result = await client.query(
      `INSERT INTO cart (user_id, variant_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, variantId, quantity]
    );
  }
  
  return result.rows[0] || null;
}

async function getCartItemById(client, cartId, userId) {
  const result = await client.query(
    `SELECT c.cart_id, c.user_id, c.variant_id,
            COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
     FROM cart c
     JOIN product_variants pv ON pv.variant_id = c.variant_id
     LEFT JOIN inventory i ON i.variant_id = pv.variant_id
     WHERE c.cart_id = $1
     GROUP BY c.cart_id`,
    [cartId]
  );
  const cartItem = result.rows[0];
  
  if (!cartItem || cartItem.user_id !== userId) {
    return null;
  }
  
  return cartItem;
}

async function removeCartItemById(client, cartId) {
  await client.query("DELETE FROM cart WHERE cart_id = $1", [cartId]);
}



async function toggleSaveForLater(client, cartId, userId, isSaved) {
  const result = await client.query(
    `UPDATE cart SET is_saved = $1 WHERE cart_id = $2 AND user_id = $3 RETURNING *`,
    [isSaved, cartId, userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getCartItems,

  getVariantWithStock,
  getCartItemByVariantId,
  upsertCartItem,
  getCartItemById,
  removeCartItemById,

  toggleSaveForLater,
};
