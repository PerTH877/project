const router = require("express").Router();
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
  getSubscriptionPlans,
  getMyActiveSubscription,
  subscribeUser,
  cancelMySubscription,
} = require("../controllers/subscriptionController");

router.get("/plans", getSubscriptionPlans);
router.get("/me", authMiddleware, requireRole("user"), getMyActiveSubscription);
router.post("/subscribe", authMiddleware, requireRole("user"), subscribeUser);
router.put("/cancel", authMiddleware, requireRole("user"), cancelMySubscription);

module.exports = router;