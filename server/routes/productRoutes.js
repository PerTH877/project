const router = require("express").Router();

const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const requireVerifiedSeller = require("../middleware/requireVerifiedSeller");
const { validateCreateProduct } = require("../validators/productValidator");

const { createProduct, listProducts, getProduct } = require("../controllers/productController");

// Public
router.get("/", listProducts);
router.get("/:product_id", getProduct);

router.post(
  "/",
  authMiddleware,
  requireRole("seller"),
  requireVerifiedSeller,
  validateCreateProduct,
  createProduct
);

module.exports = router;