const router = require("express").Router();

const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const requireVerifiedSeller = require("../middleware/requireVerifiedSeller");
const { validateCreateProduct } = require("../validators/productValidator");
const {
  getHomeFeed,
  listProducts,
  getFeatured,
  getFlashDeals,
  getProduct,
  createProduct,
  listSellerProducts,
  getSellerProduct,
  updateProduct,
  deactivateProduct,
  updateVariant,
  updateVariantInventory,
  createReview,
  askProductQuestion,
  answerProductQuestion,
} = require("../controllers/productController");

router.get("/home", getHomeFeed);
router.get("/", listProducts);
router.get("/featured", getFeatured);
router.get("/deals", getFlashDeals);

router.get(
  "/seller/mine",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  listSellerProducts
);
router.get(
  "/seller/mine/:product_id",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  getSellerProduct
);

router.post(
  "/",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  validateCreateProduct,
  createProduct
);
router.put(
  "/:product_id",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  updateProduct
);
router.patch(
  "/:product_id/deactivate",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  deactivateProduct
);
router.put(
  "/variants/:variant_id",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  updateVariant
);
router.put(
  "/variants/:variant_id/inventory",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  updateVariantInventory
);

router.post(
  "/:product_id/reviews",
  authMiddleware,
  requireRole("user"),
  createReview
);
router.post(
  "/:product_id/questions",
  authMiddleware,
  requireRole("user"),
  askProductQuestion
);
router.post(
  "/questions/:question_id/answer",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  answerProductQuestion
);

router.get("/:product_id", getProduct);

module.exports = router;
