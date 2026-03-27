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
       COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
     FROM cart c
     JOIN product_variants pv ON pv.variant_id = c.variant_id
     JOIN products p ON p.product_id = pv.product_id
     LEFT JOIN inventory i ON i.variant_id = pv.variant_id
     WHERE c.user_id = $1
     GROUP BY c.cart_id, pv.variant_id, p.product_id`,
    [userId]
  );
  return result.rows;
}

async function getCartTotal(client, userId) {
  const result = await client.query("SELECT get_cart_total($1) AS total", [userId]);
  return Number(result.rows[0]?.total ?? 0);
}

async function getVariantWithStock(client, variantId) {
  // Step 1: Acquire row-level locks on all inventory rows for this variant.
  // This blocks any concurrent transaction from reading/modifying the same
  // rows until this transaction commits or rolls back, preventing overselling.
  await client.query(
    `SELECT inventory_id FROM inventory WHERE variant_id = $1 FOR UPDATE`,
    [variantId]
  );

  // Step 2: Now safely read the variant details and aggregate the locked stock.
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

async function getAddressById(client, addressId, userId) {
  const result = await client.query(
    `SELECT address_id, city, is_active
     FROM addresses
     WHERE address_id = $1 AND user_id = $2`,
    [addressId, userId]
  );
  return result.rows[0] || null;
}

async function getCartItemsForCheckout(client, userId) {
  const result = await client.query(
    `SELECT
       c.cart_id,
       c.variant_id,
       c.quantity,
       pv.sku,
       pv.price_adjustment,
       pv.attributes,
       p.product_id,
       p.title,
       p.base_price
     FROM cart c
     JOIN product_variants pv ON pv.variant_id = c.variant_id
     JOIN products p ON p.product_id = pv.product_id
     WHERE c.user_id = $1
     ORDER BY c.cart_id ASC`,
    [userId]
  );
  return result.rows;
}

async function getInventoryForVariant(client, variantId) {
  const result = await client.query(
    `SELECT inventory_id, warehouse_id, stock_quantity
     FROM inventory
     WHERE variant_id = $1
     ORDER BY stock_quantity DESC, warehouse_id ASC
     FOR UPDATE`,
    [variantId]
  );
  return result.rows;
}

async function createOrder(client, userId, addressId) {
  await client.query("CALL proc_create_order($1, $2, NULL)", [userId, addressId]);
  
  const result = await client.query(
    `SELECT order_id, total_amount, status, order_date
     FROM orders
     WHERE user_id = $1
     ORDER BY order_id DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateInventoryStock(client, inventoryId, newStock) {
  await client.query(
    `UPDATE inventory
     SET stock_quantity = $1
     WHERE inventory_id = $2`,
    [newStock, inventoryId]
  );
}

async function createPayment(client, orderId, paymentMethod, amount) {
  await client.query(
    `INSERT INTO payments (order_id, payment_method, status, amount)
     VALUES ($1, $2, 'Pending', $3)`,
    [orderId, paymentMethod, amount]
  );
}

async function createShipment(client, orderId, trackingNumber, carrier, estimatedArrival) {
  await client.query(
    `INSERT INTO shipments (order_id, tracking_number, carrier, estimated_arrival, status)
     VALUES ($1, $2, $3, $4, 'Processing')`,
    [orderId, trackingNumber, carrier, estimatedArrival]
  );
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
  getCartTotal,
  getVariantWithStock,
  getCartItemByVariantId,
  upsertCartItem,
  getCartItemById,
  removeCartItemById,
  getAddressById,
  getCartItemsForCheckout,
  getInventoryForVariant,
  createOrder,
  updateInventoryStock,
  createPayment,
  createShipment,
  toggleSaveForLater,
};
