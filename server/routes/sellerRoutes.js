const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const requireVerifiedSeller = require("../middleware/requireVerifiedSeller");
const {
  registerSeller,
  loginSeller,
  getSellerProfile,
  getSellerDashboard,
  getSellerAnalytics,
} = require("../controllers/sellerController");

router.post("/register", registerSeller);
router.post("/login", loginSeller);

router.get("/me", authMiddleware, requireRole("seller"), getSellerProfile);
router.get(
  "/dashboard",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  getSellerDashboard
);
router.get(
  "/analytics",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  getSellerAnalytics
);

module.exports = router;
