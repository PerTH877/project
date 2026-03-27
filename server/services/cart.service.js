const cartRepository = require("../repositories/cart.repository");

async function getCartItems(pool, userId) {
  const cartItems = await cartRepository.getCartItems(pool, userId);
  return {
    items: cartItems,
    count: cartItems.length,
  };
}

async function getCartTotal(pool, userId) {
  // For public API endpoints, use pool directly
  let client;
  try {
    client = await pool.connect();
    const total = await cartRepository.getCartTotal(client, userId);
    return { total };
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function addToCart(pool, userId, variantId, quantity) {
  let client;
  
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const variant = await cartRepository.getVariantWithStock(client, variantId);
    if (!variant || !variant.is_active || !variant.variant_is_active) {
      await client.query("ROLLBACK");
      throw new Error("Variant not found or inactive");
    }

    const existingItem = await cartRepository.getCartItemByVariantId(client, userId, variantId);
    const nextQuantity = (existingItem?.quantity || 0) + quantity;

    if ((variant.available_stock ?? 0) < nextQuantity) {
      await client.query("ROLLBACK");
      throw new Error(
        `Insufficient stock. Only ${variant.available_stock} unit(s) available for this variant.`
      );
    }

    const cartItem = await cartRepository.upsertCartItem(
      client,
      userId,
      variantId,
      nextQuantity,
      existingItem?.cart_id || null
    );

    await client.query("COMMIT");

    return {
      message: "Cart updated successfully",
      item: cartItem,
    };
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function updateCartItem(pool, userId, cartId, quantity) {
  let client;
  
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const cartItem = await cartRepository.getCartItemById(client, cartId, userId);
    if (!cartItem) {
      await client.query("ROLLBACK");
      throw new Error("Cart item not found");
    }

    if ((cartItem.available_stock ?? 0) < quantity) {
      await client.query("ROLLBACK");
      throw new Error(
        `Insufficient stock. Only ${cartItem.available_stock} unit(s) available.`
      );
    }

    const updatedItem = await cartRepository.upsertCartItem(
      client,
      userId,
      null,
      quantity,
      cartId
    );

    await client.query("COMMIT");

    return {
      message: "Cart item updated successfully",
      item: updatedItem,
    };
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function removeCartItem(pool, userId, cartId) {
  let client;
  
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const cartItem = await cartRepository.getCartItemById(client, cartId, userId);
    if (!cartItem) {
      await client.query("ROLLBACK");
      throw new Error("Cart item not found");
    }

    await cartRepository.removeCartItemById(client, cartId);

    await client.query("COMMIT");

    return { message: "Cart item removed successfully" };
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function checkout(pool, userId, addressId, paymentMethod = "Cash on Delivery") {
  let client;
  
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const address = await cartRepository.getAddressById(client, addressId, userId);
    if (!address || !address.is_active) {
      await client.query("ROLLBACK");
      throw new Error("Please choose a valid active address");
    }

    const cartItems = await cartRepository.getCartItemsForCheckout(client, userId);
    if (cartItems.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Cart is empty. Add items before checkout.");
    }

    const allocations = [];
    for (const item of cartItems) {
      const inventoryRows = await cartRepository.getInventoryForVariant(client, item.variant_id);

      const totalAvailable = inventoryRows.reduce(
        (sum, row) => sum + Number(row.stock_quantity),
        0
      );

      if (totalAvailable < Number(item.quantity)) {
        await client.query("ROLLBACK");
        throw new Error(
          `Insufficient stock for "${item.title}". Only ${totalAvailable} unit(s) remain.`
        );
      }

      let remaining = Number(item.quantity);
      for (const inventoryRow of inventoryRows) {
        if (remaining <= 0) break;

        const deduction = Math.min(remaining, Number(inventoryRow.stock_quantity));
        if (deduction > 0) {
          allocations.push({
            inventory_id: inventoryRow.inventory_id,
            new_stock_quantity: Number(inventoryRow.stock_quantity) - deduction,
          });
          remaining -= deduction;
        }
      }
    }

    const cartSubtotal = await cartRepository.getCartTotal(client, userId);

    const order = await cartRepository.createOrder(client, userId, addressId);
    if (!order) {
      await client.query("ROLLBACK");
      throw new Error("Failed to create order");
    }

    for (const allocation of allocations) {
      await cartRepository.updateInventoryStock(
        client,
        allocation.inventory_id,
        allocation.new_stock_quantity
      );
    }

    await cartRepository.createPayment(client, order.order_id, paymentMethod, order.total_amount);

    const trackingNumber = `BD-${order.order_id}-${Date.now().toString().slice(-6)}`;
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 3);
    
    await cartRepository.createShipment(
      client,
      order.order_id,
      trackingNumber,
      "Paruvo Express BD",
      estimatedArrival.toISOString().split("T")[0]
    );

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
        previous_cart_subtotal: cartSubtotal,
      },
    };
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function toggleSaveForLater(pool, userId, cartId, isSaved) {
  let client;
  
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const item = await cartRepository.toggleSaveForLater(client, cartId, userId, isSaved);
    
    if (!item) {
      await client.query("ROLLBACK");
      throw new Error("Cart item not found");
    }

    await client.query("COMMIT");

    return {
      message: isSaved ? "Item saved for later" : "Item moved to cart",
      item,
    };
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  getCartItems,
  getCartTotal,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkout,
  toggleSaveForLater,
};
