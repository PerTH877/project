const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
  adminLogin,
  getCurrentAdmin,
  getAdminOverview,
  getCategoryPerformance,
  getConversionSignals,
  getDemandOpportunities,
  getGeographicDemand,
  getInventoryRisk,
  getReturnsRisk,
  getSellerPerformance,
  getWarehousePressure,
  listPendingSellers,
  verifySeller,
  getTopCategories,
  getTopSellers,
  getTopProducts,
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
  "/analytics/demand-opportunities",
  authMiddleware,
  requireRole("admin"),
  getDemandOpportunities
);
router.get(
  "/analytics/warehouse-pressure",
  authMiddleware,
  requireRole("admin"),
  getWarehousePressure
);
router.get(
  "/analytics/geographic-demand",
  authMiddleware,
  requireRole("admin"),
  getGeographicDemand
);
router.get(
  "/analytics/returns-risk",
  authMiddleware,
  requireRole("admin"),
  getReturnsRisk
);
router.get(
  "/analytics/inventory-risk",
  authMiddleware,
  requireRole("admin"),
  getInventoryRisk
);
router.get(
  "/analytics/conversion-signals",
  authMiddleware,
  requireRole("admin"),
  getConversionSignals
);

router.get(
  "/analytics/top-categories",
  authMiddleware,
  requireRole("admin"),
  getTopCategories
);
router.get(
  "/analytics/top-sellers",
  authMiddleware,
  requireRole("admin"),
  getTopSellers
);
router.get(
  "/analytics/top-products",
  authMiddleware,
  requireRole("admin"),
  getTopProducts
);

router.get(
  "/analytics/order-fulfillment",
  authMiddleware,
  requireRole("admin"),
  getOrderFulfillment
);

module.exports = router;
