"use strict";

// ─── Checkout Repository ───────────────────────────────────────────────────────
// All SQL for the order-execution and review flows lives here.
// This is fully decoupled from cart.repository.js so that changes to the
// checkout domain cannot accidentally break cart CRUD operations.

/**
 * Fetch a single address that belongs to the given user.
 */
async function getAddressById(client, addressId, userId) {
  const result = await client.query(
    `SELECT address_id, city, is_active
     FROM addresses
     WHERE address_id = $1 AND user_id = $2`,
    [addressId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Fetch the active (non-saved) cart items for a user, ready for checkout.
 */
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
     WHERE c.user_id = $1 AND (c.is_saved IS FALSE OR c.is_saved IS NULL)
     ORDER BY c.cart_id ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Fetch all inventory rows for a variant with a FOR UPDATE lock to prevent
 * concurrent oversells during checkout transactions.
 */
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

/**
 * Call the stored procedure to create the order and then retrieve the newly
 * created order row.
 */
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

/**
 * Decrement a specific inventory row to the new stock quantity.
 */
async function updateInventoryStock(client, inventoryId, newStock) {
  await client.query(
    `UPDATE inventory
     SET stock_quantity = $1
     WHERE inventory_id = $2`,
    [newStock, inventoryId]
  );
}

/**
 * Insert a payment record for the given order.
 */
async function createPayment(client, orderId, paymentMethod, amount) {
  await client.query(
    `INSERT INTO payments (order_id, payment_method, status, amount)
     VALUES ($1, $2, 'Pending', $3)`,
    [orderId, paymentMethod, amount]
  );
}

/**
 * Insert a shipment record for the given order.
 */
async function createShipment(client, orderId, trackingNumber, carrier, estimatedArrival) {
  await client.query(
    `INSERT INTO shipments (order_id, tracking_number, carrier, estimated_arrival, status)
     VALUES ($1, $2, $3, $4, 'Processing')`,
    [orderId, trackingNumber, carrier, estimatedArrival]
  );
}

/**
 * Compute a lightweight cart subtotal for the checkout review step.
 * Uses base_price + price_adjustment per cart line so no stored function is needed.
 */
async function getCartSubtotal(client, userId) {
  const result = await client.query(
    `SELECT COALESCE(
       SUM(c.quantity * (p.base_price + COALESCE(pv.price_adjustment, 0))),
       0
     ) AS subtotal
     FROM cart c
     JOIN product_variants pv ON pv.variant_id = c.variant_id
     JOIN products p ON p.product_id = pv.product_id
     WHERE c.user_id = $1 AND (c.is_saved IS FALSE OR c.is_saved IS NULL)`,
    [userId]
  );
  return Number(result.rows[0]?.subtotal ?? 0);
}

module.exports = {
  getAddressById,
  getCartItemsForCheckout,
  getInventoryForVariant,
  createOrder,
  updateInventoryStock,
  createPayment,
  createShipment,
  getCartSubtotal,
};
