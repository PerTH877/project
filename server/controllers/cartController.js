

const pool = require("../config/db");
const { parseId } = require("../utils/marketplace");
const cartService = require("../services/cart.service");


const getCartItems = async (req, res) => {
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = await cartService.getCartItems(pool, userId);
    return res.json(payload);
  } catch (err) {
    console.error("getCartItems error:", err.message);
    return res.status(500).json({ error: "Failed to load cart" });
  }
};


const getCartTotal = async (req, res) => {
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await cartService.getCartTotal(pool, userId);
    return res.json(result);
  } catch (err) {
    console.error("getCartTotal error:", err.message);
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

  try {
    const result = await cartService.addToCart(pool, userId, variantId, quantity);
    return res.status(201).json(result);
  } catch (err) {
    console.error("addToCart error:", err.message);
    
    if (err.message.includes("not found") || err.message.includes("inactive")) {
      return res.status(404).json({ error: "Variant not found" });
    }
    if (err.message.includes("Insufficient stock")) {
      const match = err.message.match(/Only (\d+) unit\(s\)/);
      const available = match ? match[1] : 0;
      return res.status(409).json({
        error: `Only ${available} unit(s) are currently available for this variant`,
      });
    }
    
    return res.status(500).json({ error: "Failed to update cart" });
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

  try {
    const result = await cartService.updateCartItem(pool, userId, cartId, quantity);
    return res.json(result);
  } catch (err) {
    console.error("updateCartItem error:", err.message);
    
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    if (err.message.includes("Insufficient stock")) {
      const match = err.message.match(/Only (\d+) unit\(s\)/);
      const available = match ? match[1] : 0;
      return res.status(409).json({
        error: `Only ${available} unit(s) are currently available for this variant`,
      });
    }
    
    return res.status(500).json({ error: "Failed to update cart item" });
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

  try {
    const result = await cartService.removeCartItem(pool, userId, cartId);
    return res.json(result);
  } catch (err) {
    console.error("removeCartItem error:", err.message);
    
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    
    return res.status(500).json({ error: "Failed to remove cart item" });
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

  try {
    const result = await cartService.checkout(pool, userId, addressId, paymentMethod);
    return res.status(201).json(result);
  } catch (err) {
    console.error("checkout error:", err.message);
    
    if (err.message.includes("valid active address")) {
      return res.status(400).json({ error: "Please choose a valid active address" });
    }
    if (err.message.includes("Cart is empty")) {
      return res.status(400).json({ error: "Cart is empty. Add items before checkout." });
    }
    if (err.message.includes("Insufficient stock")) {
      const match = err.message.match(/Only (\d+) unit\(s\)/);
      const available = match ? match[1] : 0;
      return res.status(409).json({
        error: err.message.includes("Insufficient stock")
          ? err.message
          : `Only ${available} unit(s) remain.`,
      });
    }
    
    return res.status(500).json({ error: "Failed to complete checkout" });
  }
};

/**
 * PATCH /cart/:cart_id/save-for-later
 * Toggle save for later on a cart item
 * Body: { is_saved } (boolean)
 */
const toggleSaveForLater = async (req, res) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);
  const isSaved = req.body.is_saved === true;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!cartId) {
    return res.status(400).json({ error: "cart_id must be a positive integer" });
  }

  try {
    const result = await cartService.toggleSaveForLater(pool, userId, cartId, isSaved);
    return res.json(result);
  } catch (err) {
    console.error("toggleSaveForLater error:", err.message);
    
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    
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
