const pool = require("../config/db");
const { parseId, fetchCartItems } = require("../utils/marketplace");

const getCartItems = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = await fetchCartItems(pool, userId);
    return res.json(payload);
  } catch (err) {
    console.error("getCartItems:", err.message);
    return res.status(500).json({ error: "Failed to load cart" });
  }
};

const getCartTotal = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await pool.query("SELECT get_cart_total($1) AS total", [userId]);
    const total = Number(result.rows[0]?.total ?? 0);
    return res.json({ total });
  } catch (err) {
    console.error("getCartTotal:", err.message);
    return res.status(500).json({ error: "Server error computing cart total" });
  }
};

const addToCart = async (req, res) => {
  const userId = req.user?.user_id;
  const variantId = Number(req.body.variant_id);
  const quantity = Number(req.body.quantity);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!Number.isInteger(variantId) || variantId <= 0) {
    return res.status(400).json({ error: "variant_id must be a positive integer" });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const variantResult = await client.query(
      `SELECT pv.variant_id, p.product_id, p.is_active, pv.is_active AS variant_is_active,
              COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
       FROM product_variants pv
       JOIN products p ON p.product_id = pv.product_id
       LEFT JOIN inventory i ON i.variant_id = pv.variant_id
       WHERE pv.variant_id = $1
       GROUP BY pv.variant_id, p.product_id, p.is_active, pv.is_active`,
      [variantId]
    );

    const variant = variantResult.rows[0];
    if (!variant || !variant.is_active || !variant.variant_is_active) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variant not found" });
    }

    const existingResult = await client.query(
      "SELECT cart_id, quantity FROM cart WHERE user_id = $1 AND variant_id = $2",
      [userId, variantId]
    );

    const nextQuantity =
      (existingResult.rows[0] ? Number(existingResult.rows[0].quantity) : 0) + quantity;

    if (Number(variant.available_stock ?? 0) < nextQuantity) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Only ${variant.available_stock} unit(s) are currently available for this variant`,
      });
    }

    let cartItem;
    if (existingResult.rows.length) {
      const updatedResult = await client.query(
        `UPDATE cart
         SET quantity = $1, added_at = NOW()
         WHERE cart_id = $2
         RETURNING *`,
        [nextQuantity, existingResult.rows[0].cart_id]
      );
      cartItem = updatedResult.rows[0];
    } else {
      const insertedResult = await client.query(
        `INSERT INTO cart (user_id, variant_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, variantId, quantity]
      );
      cartItem = insertedResult.rows[0];
    }

    await client.query("COMMIT");
    return res.status(201).json({ message: "Cart updated", item: cartItem });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("addToCart:", err.message);
    return res.status(500).json({ error: "Failed to update cart" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const updateCartItem = async (req, res) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);
  const quantity = Number(req.body.quantity);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!cartId) {
    return res.status(400).json({ error: "cart_id must be a positive integer" });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const cartResult = await client.query(
      `SELECT c.cart_id, c.user_id, c.variant_id,
              COALESCE(SUM(i.stock_quantity), 0)::int AS available_stock
       FROM cart c
       JOIN product_variants pv ON pv.variant_id = c.variant_id
       LEFT JOIN inventory i ON i.variant_id = pv.variant_id
       WHERE c.cart_id = $1
       GROUP BY c.cart_id`,
      [cartId]
    );

    const cartRow = cartResult.rows[0];
    if (!cartRow || cartRow.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (Number(cartRow.available_stock ?? 0) < quantity) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Only ${cartRow.available_stock} unit(s) are currently available for this variant`,
      });
    }

    const updatedResult = await client.query(
      `UPDATE cart
       SET quantity = $1, added_at = NOW()
       WHERE cart_id = $2
       RETURNING *`,
      [quantity, cartId]
    );

    await client.query("COMMIT");
    return res.json({ message: "Cart item updated", item: updatedResult.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("updateCartItem:", err.message);
    return res.status(500).json({ error: "Failed to update cart item" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const removeCartItem = async (req, res) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!cartId) {
    return res.status(400).json({ error: "cart_id must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const cartResult = await client.query(
      "SELECT cart_id, user_id FROM cart WHERE cart_id = $1",
      [cartId]
    );

    if (!cartResult.rows.length || cartResult.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cart item not found" });
    }

    await client.query("DELETE FROM cart WHERE cart_id = $1", [cartId]);
    await client.query("COMMIT");
    return res.json({ message: "Cart item removed" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("removeCartItem:", err.message);
    return res.status(500).json({ error: "Failed to remove cart item" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const checkout = async (req, res) => {
  const userId = req.user?.user_id;
  const addressId = parseId(req.body.address_id);
  const paymentMethod = String(req.body.payment_method || "Cash on Delivery").trim();

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!addressId) {
    return res.status(400).json({ error: "address_id must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const addressResult = await client.query(
      `SELECT address_id, city, is_active
       FROM addresses
       WHERE address_id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    if (!addressResult.rows.length || !addressResult.rows[0].is_active) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Please choose a valid active address" });
    }

    const cartResult = await client.query(
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

    if (!cartResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is empty. Add items before checkout." });
    }

    const cartTotalResult = await client.query("SELECT get_cart_total($1) AS total", [userId]);
    const cartSubtotal = Number(cartTotalResult.rows[0]?.total ?? 0);

    const allocations = [];
    for (const item of cartResult.rows) {
      const inventoryResult = await client.query(
        `SELECT inventory_id, warehouse_id, stock_quantity
         FROM inventory
         WHERE variant_id = $1
         ORDER BY stock_quantity DESC, warehouse_id ASC
         FOR UPDATE`,
        [item.variant_id]
      );

      const available = inventoryResult.rows.reduce(
        (sum, row) => sum + Number(row.stock_quantity),
        0
      );

      if (available < Number(item.quantity)) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Insufficient stock for ${item.title}. Only ${available} unit(s) remain.`,
        });
      }

      let remaining = Number(item.quantity);
      for (const inventoryRow of inventoryResult.rows) {
        if (remaining <= 0) {
          break;
        }

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

    await client.query("CALL proc_create_order($1, $2, NULL)", [userId, addressId]);
    const orderResult = await client.query(
      `SELECT order_id, total_amount, status, order_date
       FROM orders
       WHERE user_id = $1
       ORDER BY order_id DESC
       LIMIT 1`,
      [userId]
    );

    const order = orderResult.rows[0];

    for (const allocation of allocations) {
      await client.query(
        `UPDATE inventory
         SET stock_quantity = $1
         WHERE inventory_id = $2`,
        [allocation.new_stock_quantity, allocation.inventory_id]
      );
    }

    await client.query(
      `INSERT INTO payments (order_id, payment_method, status, amount)
       VALUES ($1, $2, 'Pending', $3)`,
      [order.order_id, paymentMethod, order.total_amount]
    );

    const trackingNumber = `BD-${order.order_id}-${Date.now().toString().slice(-6)}`;
    await client.query(
      `INSERT INTO shipments (order_id, tracking_number, carrier, estimated_arrival, status)
       VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '3 day', 'Processing')`,
      [order.order_id, trackingNumber, "Paruvo Express BD"]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Order created successfully",
      order: {
        order_id: order.order_id,
        status: order.status,
        total_amount: Number(order.total_amount),
        order_date: order.order_date,
        payment_method: paymentMethod,
        tracking_number: trackingNumber,
        address_city: addressResult.rows[0].city,
      },
      checkout_summary: {
        purchased_items: cartResult.rows.length,
        previous_cart_subtotal: cartSubtotal,
      },
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("checkout:", err.message);
    return res.status(500).json({ error: "Failed to complete checkout" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const toggleSaveForLater = async (req, res) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);
  const isSaved = req.body.is_saved === true; // true to save, false to move to active

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!cartId) {
    return res.status(400).json({ error: "cart_id must be a positive integer" });
  }

  try {
    const result = await pool.query(
      `UPDATE cart SET is_saved = $1 WHERE cart_id = $2 AND user_id = $3 RETURNING *`,
      [isSaved, cartId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    return res.json({
      message: isSaved ? "Item saved for later" : "Item moved to cart",
      item: result.rows[0]
    });
  } catch (err) {
    console.error("toggleSaveForLater:", err.message);
    return res.status(500).json({ error: "Failed to update item status" });
  }
};

module.exports = {
  getCartItems,
  getCartTotal,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkout,
  toggleSaveForLater,
};
