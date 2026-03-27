const subscriptionService = require("../services/subscription.service");

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    return res.json({ plans });
  } catch (err) {
    console.error("getSubscriptionPlans:", err.message);
    return res.status(500).json({ error: "Failed to load subscription plans" });
  }
};

const getMyActiveSubscription = async (req, res) => {
  const userId = req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await subscriptionService.getActiveSubscriptionByUserId(userId);

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    return res.json({ subscription });
  } catch (err) {
    console.error("getMyActiveSubscription:", err.message);
    return res.status(500).json({ error: "Failed to load subscription" });
  }
};

const subscribeUser = async (req, res) => {
  const userId = req.user?.user_id;
  const planId = Number(req.body?.plan_id);
  const autoRenew = req.body?.auto_renew === undefined ? true : Boolean(req.body.auto_renew);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!Number.isInteger(planId) || planId <= 0) {
    return res.status(400).json({ error: "plan_id must be a positive integer" });
  }

  try {
    const subscription = await subscriptionService.createSubscription(userId, planId, autoRenew);
    return res.status(201).json({
      message: "Subscription created successfully",
      subscription,
    });
  } catch (err) {
    console.error("subscribeUser:", err.message);

    if (err.code === "PLAN_NOT_FOUND") {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    if (err.code === "ACTIVE_SUBSCRIPTION_EXISTS") {
      return res.status(409).json({ error: "You already have an active subscription" });
    }

    return res.status(500).json({ error: "Failed to create subscription" });
  }
};

const cancelMySubscription = async (req, res) => {
  const userId = req.user?.user_id;
  const cancelImmediately = req.body?.cancel_immediately === true;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await subscriptionService.cancelActiveSubscription(userId, cancelImmediately);

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    return res.json({
      message: cancelImmediately
        ? "Subscription cancelled successfully"
        : "Auto-renew disabled for active subscription",
      subscription,
    });
  } catch (err) {
    console.error("cancelMySubscription:", err.message);
    return res.status(500).json({ error: "Failed to update subscription" });
  }
};

module.exports = {
  getSubscriptionPlans,
  getMyActiveSubscription,
  subscribeUser,
  cancelMySubscription,
};