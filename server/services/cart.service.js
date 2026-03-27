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
  toggleSaveForLater,
};
