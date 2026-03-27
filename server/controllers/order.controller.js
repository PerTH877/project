const orderService = require("../services/order.service");
const { parseId } = require("../utils/marketplace");

const getUserOrders = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const orders = await orderService.getUserOrders(userId);
    return res.json({ orders });
  } catch (err) {
    console.error("getUserOrders:", err.message);
    return res.status(500).json({ error: "Failed to load orders" });
  }
};

const getUserOrderDetail = async (req, res) => {
  const userId = req.user?.user_id;
  const orderId = parseId(req.params.order_id);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!orderId) {
    return res.status(400).json({ error: "order_id must be a positive integer" });
  }

  try {
    const result = await orderService.getUserOrderDetail(userId, orderId);
    
    if (!result) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("getUserOrderDetail:", err.message);
    return res.status(500).json({ error: "Failed to load order details" });
  }
};

const getSellerOrders = async (req, res) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const orders = await orderService.getSellerOrders(sellerId);
    return res.json({ orders });
  } catch (err) {
    console.error("getSellerOrders:", err.message);
    return res.status(500).json({ error: "Failed to load seller orders" });
  }
};

const getSellerOrderDetail = async (req, res) => {
  const sellerId = req.user?.seller_id;
  const orderId = parseId(req.params.order_id);

  if (!sellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!orderId) {
    return res.status(400).json({ error: "order_id must be a positive integer" });
  }

  try {
    const result = await orderService.getSellerOrderDetail(sellerId, orderId);
    
    if (!result) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("getSellerOrderDetail:", err.message);
    return res.status(500).json({ error: "Failed to load seller order detail" });
  }
};

module.exports = {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
};
