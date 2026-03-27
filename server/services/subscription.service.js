const pool = require("../config/db");

const mapSubscriptionRow = (row) => ({
  subscription_id: row.subscription_id,
  user_id: row.user_id,
  plan_id: row.plan_id,
  start_date: row.start_date,
  end_date: row.end_date,
  status: row.status,
  auto_renew: row.auto_renew,
  plan: {
    name: row.plan_name,
    price: Number(row.plan_price),
    duration_days: Number(row.duration_days),
    benefits_description: row.benefits_description,
  },
});

const getAllPlans = async () => {
  const query = `
    SELECT
      plan_id,
      name,
      price,
      duration_days,
      benefits_description
    FROM Subscription_Plans
    ORDER BY price ASC, duration_days ASC
  `;

  const { rows } = await pool.query(query);
  return rows.map((row) => ({
    plan_id: row.plan_id,
    name: row.name,
    price: Number(row.price),
    duration_days: row.duration_days,
    benefits_description: row.benefits_description,
  }));
};

const getActiveSubscriptionByUserId = async (userId) => {
  const query = `
    SELECT
      us.subscription_id,
      us.user_id,
      us.plan_id,
      us.start_date,
      us.end_date,
      us.status,
      us.auto_renew,
      sp.name AS plan_name,
      sp.price AS plan_price,
      sp.duration_days,
      sp.benefits_description
    FROM User_Subscriptions us
    JOIN Subscription_Plans sp ON sp.plan_id = us.plan_id
    WHERE us.user_id = $1 AND us.status = 'Active'
    ORDER BY us.start_date DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] ? mapSubscriptionRow(rows[0]) : null;
};

const createSubscription = async (userId, planId, autoRenew = true) => {
  const query = `
    INSERT INTO User_Subscriptions (
      user_id,
      plan_id,
      start_date,
      end_date,
      status,
      auto_renew
    )
    SELECT
      $1,
      sp.plan_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + (sp.duration_days || ' days')::interval,
      'Active',
      $3
    FROM Subscription_Plans sp
    WHERE sp.plan_id = $2
    RETURNING
      subscription_id,
      user_id,
      plan_id,
      start_date,
      end_date,
      status,
      auto_renew
  `;

  try {
    const insertResult = await pool.query(query, [userId, planId, autoRenew]);

    if (!insertResult.rows.length) {
      const error = new Error("Subscription plan not found");
      error.code = "PLAN_NOT_FOUND";
      throw error;
    }

    const subscription = await getActiveSubscriptionByUserId(userId);
    return subscription || insertResult.rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const conflictError = new Error("User already has an active subscription");
      conflictError.code = "ACTIVE_SUBSCRIPTION_EXISTS";
      throw conflictError;
    }
    throw err;
  }
};

const cancelActiveSubscription = async (userId, cancelImmediately = false) => {
  const query = cancelImmediately
    ? `
      UPDATE User_Subscriptions
      SET
        status = 'Cancelled',
        auto_renew = FALSE,
        end_date = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status = 'Active'
      RETURNING
        subscription_id,
        user_id,
        plan_id,
        start_date,
        end_date,
        status,
        auto_renew
    `
    : `
      UPDATE User_Subscriptions
      SET auto_renew = FALSE
      WHERE user_id = $1 AND status = 'Active'
      RETURNING
        subscription_id,
        user_id,
        plan_id,
        start_date,
        end_date,
        status,
        auto_renew
    `;

  const { rows } = await pool.query(query, [userId]);
  if (!rows.length) {
    return null;
  }

  const subscription = await getActiveSubscriptionByUserId(userId);
  if (!cancelImmediately && subscription) {
    return subscription;
  }

  return rows[0];
};

module.exports = {
  getAllPlans,
  getActiveSubscriptionByUserId,
  createSubscription,
  cancelActiveSubscription,
};