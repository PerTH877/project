"use strict";

const pool = require("../config/db");
const { parseId } = require("../utils/marketplace");
const checkoutService = require("../services/checkout.service");


const setCheckoutAddress = async (req, res, next) => {
  const userId = req.user?.user_id;
  const addressId = parseId(req.body.address_id);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!addressId) return res.status(400).json({ error: "address_id is required" });

  try {
    const address = await checkoutService.validateAddress(pool, addressId, userId);
    return res.json({ message: "Address selected", address });
  } catch (err) {
    return next(err);
  }
};


const setCheckoutPayment = async (req, res, next) => {
  const userId = req.user?.user_id;
  const paymentMethod = req.body.payment_method;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!paymentMethod) return res.status(400).json({ error: "payment_method is required" });

  try {
    const validated = checkoutService.validatePaymentMethod(paymentMethod);
    return res.json({ message: "Payment method selected", payment_method: validated });
  } catch (err) {
    return next(err);
  }
};


const reviewCheckoutSummary = async (req, res, next) => {
  const userId = req.user?.user_id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const summary = await checkoutService.reviewCheckoutSummary(pool, userId);
    return res.json({ summary });
  } catch (err) {
    return next(err);
  }
};


const executeCheckout = async (req, res, next) => {
  const userId = req.user?.user_id;
  const addressId = parseId(req.body.address_id);
  const paymentMethod = String(req.body.payment_method || "Cash on Delivery").trim();

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!addressId) return res.status(400).json({ error: "address_id must be a positive integer" });

  try {
    const result = await checkoutService.executeCheckout(pool, userId, addressId, paymentMethod);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  setCheckoutAddress,
  setCheckoutPayment,
  reviewCheckoutSummary,
  executeCheckout,
};
