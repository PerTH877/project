const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
  adminLogin,
  getCurrentAdmin,
  getAdminOverview,
  getCategoryPerformance,
  getGeographicDemand,
  getSellerPerformance,
  listPendingSellers,
  verifySeller,
  getOrderFulfillment,
} = require("../controllers/admin.controller");

router.post("/login", adminLogin);
router.get("/me", authMiddleware, requireRole("admin"), getCurrentAdmin);

router.get("/overview", authMiddleware, requireRole("admin"), getAdminOverview);
router.get("/sellers/pending", authMiddleware, requireRole("admin"), listPendingSellers);
router.put(
  "/sellers/:id/verify",
  authMiddleware,
  requireRole("admin"),
  verifySeller
);

router.get(
  "/analytics/seller-performance",
  authMiddleware,
  requireRole("admin"),
  getSellerPerformance
);
router.get(
  "/analytics/category-performance",
  authMiddleware,
  requireRole("admin"),
  getCategoryPerformance
);

router.get(
  "/analytics/geographic-demand",
  authMiddleware,
  requireRole("admin"),
  getGeographicDemand
);

router.get(
  "/analytics/order-fulfillment",
  authMiddleware,
  requireRole("admin"),
  getOrderFulfillment
);

module.exports = router;
