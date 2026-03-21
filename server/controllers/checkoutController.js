const pool = require("../config/db");
const { parseId } = require("../utils/marketplace");

// Multi-step checkout state: 1. Address -> 2. Payment -> 3. Review

// Step 1: Set Address
const setCheckoutAddress = async (req, res) => {
  const userId = req.user?.user_id;
  const addressId = parseId(req.body.address_id);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!addressId) return res.status(400).json({ error: "address_id is required" });

  try {
    const addressResult = await pool.query(
      `SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [addressId, userId]
    );

    if (!addressResult.rows.length) {
      return res.status(404).json({ error: "Active address not found" });
    }

    // In a real system, you might save this in a Checkout_Sessions table or Redis.
    // Here we just validate and return success to proceed to payment step.
    return res.json({ message: "Address selected", address: addressResult.rows[0] });
  } catch (err) {
    console.error("setCheckoutAddress:", err.message);
    return res.status(500).json({ error: "Failed to set address" });
  }
};

// Step 2: Set Payment Method
const setCheckoutPayment = async (req, res) => {
  const userId = req.user?.user_id;
  const paymentMethod = req.body.payment_method;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!paymentMethod) return res.status(400).json({ error: "payment_method is required" });

  // Validate payment method
  const validMethods = ["Cash on Delivery", "Credit Card", "bKash"];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: "Invalid payment method" });
  }

  return res.json({ message: "Payment method selected", payment_method: paymentMethod });
};

// Step 3: Review Order (Preview totals, taxes, shipping)
const reviewCheckoutSummary = async (req, res) => {
  const userId = req.user?.user_id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const cartResult = await pool.query(
      `SELECT c.quantity, p.base_price, pv.price_adjustment
       FROM cart c
       JOIN product_variants pv ON pv.variant_id = c.variant_id
       JOIN products p ON p.product_id = pv.product_id
       WHERE c.user_id = $1 AND (c.is_saved IS FALSE OR c.is_saved IS NULL)`,
      [userId]
    );

    let subtotal = 0;
    cartResult.rows.forEach((row) => {
      subtotal += Number(row.quantity) * (Number(row.base_price) + Number(row.price_adjustment || 0));
    });

    let shippingCost = 50.00; // Default

    // Check if Prime member
    const primeCheck = await pool.query(
      `SELECT 1 FROM User_Subscriptions us
       JOIN Subscription_Plans sp ON us.plan_id = sp.plan_id
       WHERE us.user_id = $1 AND us.status = 'Active' AND sp.is_prime = TRUE`,
      [userId]
    );

    if (primeCheck.rows.length > 0) {
      shippingCost = 0.00;
    }

    const total = subtotal + shippingCost;

    return res.json({
      summary: {
        subtotal,
        shipping_cost: shippingCost,
        tax: 0,
        total,
        is_prime: shippingCost === 0.00
      }
    });

  } catch (err) {
    console.error("reviewCheckoutSummary:", err.message);
    return res.status(500).json({ error: "Failed to generate checkout summary" });
  }
};

module.exports = {
  setCheckoutAddress,
  setCheckoutPayment,
  reviewCheckoutSummary,
};
