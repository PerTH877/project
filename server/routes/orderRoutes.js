const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const requireVerifiedSeller = require("../middleware/requireVerifiedSeller");
const {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
  updateOrderStatus,
} = require("../controllers/order.controller");

// User routes
router.get("/", authMiddleware, requireRole("user"), getUserOrders);
router.get("/:order_id", authMiddleware, requireRole("user"), getUserOrderDetail);

// Seller routes
router.get(
  "/seller/list",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  getSellerOrders
);
router.get(
  "/seller/:order_id",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  getSellerOrderDetail
);
router.patch(
  "/:order_id/status",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  updateOrderStatus
);

module.exports = router;
