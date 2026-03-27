const orderService = require("../services/order.service");
const { parseId } = require("../utils/marketplace");

const getUserOrders = async (req, res, next) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const orders = await orderService.getUserOrders(userId);
    return res.json({ orders });
  } catch (err) {
    return next(err);
  }
};

const getUserOrderDetail = async (req, res, next) => {
  const userId = req.user?.user_id;
  const orderId = parseId(req.params.order_id);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!orderId) return res.status(400).json({ error: "order_id must be a positive integer" });

  try {
    const result = await orderService.getUserOrderDetail(userId, orderId);
    if (!result) return res.status(404).json({ error: "Order not found" });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const getSellerOrders = async (req, res, next) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const orders = await orderService.getSellerOrders(sellerId);
    return res.json({ orders });
  } catch (err) {
    return next(err);
  }
};

const getSellerOrderDetail = async (req, res, next) => {
  const sellerId = req.user?.seller_id;
  const orderId = parseId(req.params.order_id);

  if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
  if (!orderId) return res.status(400).json({ error: "order_id must be a positive integer" });

  try {
    const result = await orderService.getSellerOrderDetail(sellerId, orderId);
    if (!result) return res.status(404).json({ error: "Order not found" });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const sellerId = req.user?.seller_id;
  const orderId = parseId(req.params.order_id);
  const { status } = req.body;

  if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
  if (!orderId) return res.status(400).json({ error: "order_id must be a positive integer" });
  if (!status || typeof status !== "string") {
    return res.status(400).json({ error: "status is required" });
  }

  try {
    const result = await orderService.updateOrderStatus(sellerId, orderId, status.trim());
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
  updateOrderStatus,
};
