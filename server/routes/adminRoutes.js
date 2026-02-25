const router = require("express").Router();
const { adminLogin, listPendingSellers, verifySeller } = require("../controllers/adminController");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);

router.get("/sellers/pending", authMiddleware, requireRole("admin"), listPendingSellers);
router.patch("/sellers/:seller_id/verify", authMiddleware, requireRole("admin"), verifySeller);

module.exports = router;