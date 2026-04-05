const cartRepository = require("../repositories/cart.repository");

async function getCartItems(pool, userId) {
  const cartItems = await cartRepository.getCartItems(pool, userId);
  
  const transformedItems = cartItems.map(row => {
    const unitPrice = Number(row.base_price) + Number(row.price_adjustment || 0);
    const lineTotal = unitPrice * row.quantity;
    
    return {
      cart_id: row.cart_id,
      quantity: row.quantity,
      is_saved: row.is_saved,
      added_at: row.added_at,
      unit_price: unitPrice,
      line_total: lineTotal,
      product: {
        product_id: row.product_id,
        title: row.title,
        base_price: row.base_price,
        seller_name: row.seller_name,
        primary_image: row.primary_image,
        available_stock: row.available_stock,
      },
      variant: {
        variant_id: row.variant_id,
        sku: row.sku,
        price_adjustment: row.price_adjustment,
        attributes: row.attributes || {},
      }
    };
  });

  return {
    items: transformedItems,
    count: transformedItems.length,
  };
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
  addToCart,
  updateCartItem,
  removeCartItem,
  toggleSaveForLater,
};
