const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const requireVerifiedSeller = require("../middleware/requireVerifiedSeller");
const {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
} = require("../controllers/order.controller");

router.get("/", authMiddleware, requireRole("user"), getUserOrders);
router.get("/:order_id", authMiddleware, requireRole("user"), getUserOrderDetail);

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

module.exports = router;
