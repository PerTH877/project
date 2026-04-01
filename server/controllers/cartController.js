"use strict";

const pool = require("../config/db");
const { parseId } = require("../utils/marketplace");
const cartService = require("../services/cart.service");


const getCartItems = async (req, res, next) => {
  const userId = req.user?.user_id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = await cartService.getCartItems(pool, userId);
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};


const getCartTotal = async (req, res, next) => {
  const userId = req.user?.user_id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await cartService.getCartTotal(pool, userId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};


const addToCart = async (req, res, next) => {
  const userId = req.user?.user_id;
  const variantId = Number(req.body.variant_id);
  const quantity = Number(req.body.quantity);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

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
    return next(err);
  }
};


const updateCartItem = async (req, res, next) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);
  const quantity = Number(req.body.quantity);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!cartId) return res.status(400).json({ error: "cart_id must be a positive integer" });

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive integer" });
  }

  try {
    const result = await cartService.updateCartItem(pool, userId, cartId, quantity);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};


const removeCartItem = async (req, res, next) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!cartId) return res.status(400).json({ error: "cart_id must be a positive integer" });

  try {
    const result = await cartService.removeCartItem(pool, userId, cartId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};


const toggleSaveForLater = async (req, res, next) => {
  const userId = req.user?.user_id;
  const cartId = parseId(req.params.cart_id);
  const isSaved = req.body.is_saved === true;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!cartId) return res.status(400).json({ error: "cart_id must be a positive integer" });

  try {
    const result = await cartService.toggleSaveForLater(pool, userId, cartId, isSaved);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getCartItems,
  getCartTotal,
  addToCart,
  updateCartItem,
  removeCartItem,
  toggleSaveForLater,
  
};
