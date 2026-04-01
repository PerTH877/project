"use strict";

const checkoutRepository = require("../repositories/checkout.repository");



const VALID_PAYMENT_METHODS = ["Cash on Delivery", "Credit Card", "bKash"];
const STANDARD_SHIPPING_COST = 50.0;








async function reviewCheckoutSummary(pool, userId) {
  let client;
  try {
    client = await pool.connect();

    const subtotal = await checkoutRepository.getCartSubtotal(client, userId);
    const shippingCost = STANDARD_SHIPPING_COST;
    const total = subtotal + shippingCost;

    return {
      subtotal,
      shipping_cost: shippingCost,
      tax: 0,
      total,
      shipping_note: "Standard delivery (3–5 business days)",
    };
  } finally {
    if (client) client.release();
  }
}











async function executeCheckout(pool, userId, addressId, paymentMethod = "Cash on Delivery") {
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    const err = new Error(
      `Invalid payment method. Accepted: ${VALID_PAYMENT_METHODS.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    
    const address = await checkoutRepository.getAddressById(client, addressId, userId);
    if (!address || !address.is_active) {
      const err = new Error("Please choose a valid active address");
      err.statusCode = 400;
      throw err;
    }

    
    const cartItems = await checkoutRepository.getCartItemsForCheckout(client, userId);
    if (cartItems.length === 0) {
      const err = new Error("Cart is empty. Add items before checkout.");
      err.statusCode = 400;
      throw err;
    }

    
    const allocations = [];
    for (const item of cartItems) {
      const inventoryRows = await checkoutRepository.getInventoryForVariant(
        client,
        item.variant_id
      );

      const totalAvailable = inventoryRows.reduce(
        (sum, row) => sum + Number(row.stock_quantity),
        0
      );

      if (totalAvailable < Number(item.quantity)) {
        const err = new Error(
          `Insufficient stock for "${item.title}". Only ${totalAvailable} unit(s) remain.`
        );
        err.statusCode = 409;
        throw err;
      }

      let remaining = Number(item.quantity);
      for (const row of inventoryRows) {
        if (remaining <= 0) break;
        const deduction = Math.min(remaining, Number(row.stock_quantity));
        if (deduction > 0) {
          allocations.push({
            inventory_id: row.inventory_id,
            new_stock_quantity: Number(row.stock_quantity) - deduction,
          });
          remaining -= deduction;
        }
      }
    }

    
    const order = await checkoutRepository.createOrder(client, userId, addressId);
    if (!order) {
      throw new Error("Failed to create order record");
    }

    
    for (const alloc of allocations) {
      await checkoutRepository.updateInventoryStock(
        client,
        alloc.inventory_id,
        alloc.new_stock_quantity
      );
    }

    await checkoutRepository.createPayment(
      client,
      order.order_id,
      paymentMethod,
      order.total_amount
    );

    const trackingNumber = `BD-${order.order_id}-${Date.now().toString().slice(-6)}`;
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 3);

    await checkoutRepository.createShipment(
      client,
      order.order_id,
      trackingNumber,
      "Paruvo Express BD",
      estimatedArrival.toISOString().split("T")[0]
    );

    // Instant Demo: Auto-complete the order bypassing manual payment gateway steps
    await client.query(`UPDATE orders SET status = 'Delivered' WHERE order_id = $1`, [order.order_id]);
    await client.query(`UPDATE payments SET status = 'Success' WHERE order_id = $1`, [order.order_id]);
    await client.query(`UPDATE shipments SET status = 'Delivered' WHERE order_id = $1`, [order.order_id]);
    
    order.status = 'Delivered';

    await client.query("COMMIT");

    return {
      message: "Order created successfully",
      order: {
        order_id: order.order_id,
        status: order.status,
        total_amount: Number(order.total_amount),
        order_date: order.order_date,
        payment_method: paymentMethod,
        tracking_number: trackingNumber,
        address_city: address.city,
      },
      checkout_summary: {
        purchased_items: cartItems.length,
      },
    };
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (client) client.release();
  }
}







async function validateAddress(pool, addressId, userId) {
  let client;
  try {
    client = await pool.connect();
    const address = await checkoutRepository.getAddressById(client, addressId, userId);
    if (!address || !address.is_active) {
      const err = new Error("Active address not found");
      err.statusCode = 404;
      throw err;
    }
    return address;
  } finally {
    if (client) client.release();
  }
}




function validatePaymentMethod(paymentMethod) {
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    const err = new Error(
      `Invalid payment method. Accepted: ${VALID_PAYMENT_METHODS.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }
  return paymentMethod;
}

module.exports = {
  reviewCheckoutSummary,
  executeCheckout,
  validateAddress,
  validatePaymentMethod,
  VALID_PAYMENT_METHODS,
};
