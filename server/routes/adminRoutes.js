const router = require("express").Router();
const {
  adminLogin,
  listPendingSellers,
  verifySeller,
  getTopCategories,
  getTopSellers,
  getTopProducts,
} = require("../controllers/adminController");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);

router.get("/sellers/pending", authMiddleware, requireRole("admin"), listPendingSellers);
router.patch("/sellers/:seller_id/verify", authMiddleware, requireRole("admin"), verifySeller);

// Analytics endpoints for administrators.  These provide aggregated
// statistics across the platform and are protected by the admin role.
router.get(
  "/analytics/top-categories",
  authMiddleware,
  requireRole("admin"),
  getTopCategories,
);
router.get(
  "/analytics/top-sellers",
  authMiddleware,
  requireRole("admin"),
  getTopSellers,
);
router.get(
  "/analytics/top-products",
  authMiddleware,
  requireRole("admin"),
  getTopProducts,
);

module.exports = router;