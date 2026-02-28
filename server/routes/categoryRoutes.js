const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { createCategory, listCategories } = require("../controllers/categoryController");

router.get("/", listCategories);

router.post("/", authMiddleware, requireRole("admin"), createCategory);

module.exports = router;