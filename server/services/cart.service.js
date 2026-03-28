const cartRepository = require("../repositories/cart.repository");

async function getCartItems(pool, userId) {
  const rows = await cartRepository.getCartItems(pool, userId);

  const items = rows.map((row) => {
    const unit_price = Number(row.base_price) + Number(row.price_adjustment || 0);
    const line_total = Math.round(unit_price * row.quantity * 100) / 100;

    return {
      cart_id: row.cart_id,
      quantity: row.quantity,
      added_at: row.added_at,
      is_saved: row.is_saved,
      unit_price,
      line_total,
      availability: {
        in_stock: row.available_stock > 0,
        available_stock: row.available_stock,
      },
      variant: {
        variant_id: row.variant_id,
        sku: row.sku,
        attributes: row.attributes || {},
        price_adjustment: row.price_adjustment,
        is_active: row.variant_is_active,
      },
      product: {
        product_id: row.product_id,
        seller_id: row.seller_id,
        seller_name: row.seller_name,
        title: row.title,
        brand: row.brand || null,
        base_price: row.base_price,
        primary_image: row.primary_image || null,
      },
    };
  });

  const activeItems = items.filter((item) => !item.is_saved);
  const summary = {
    item_count: activeItems.length,
    quantity_total: activeItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Math.round(activeItems.reduce((sum, item) => sum + item.line_total * 100, 0)) / 100,
  };

  return { items, summary };
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
