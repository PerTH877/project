const pool = require("../config/db");

module.exports = async function requireVerifiedSeller(req, res, next) {
  try {
    if (!req.user || req.user.role !== "seller") {
      return res.status(403).json({ error: "Forbidden: seller only" });
    }

    const { rows } = await pool.query(
      "SELECT is_verified FROM sellers WHERE seller_id = $1",
      [req.user.seller_id]
    );

    if (rows.length === 0) return res.status(401).json({ error: "Seller not found" });
    if (!rows[0].is_verified) return res.status(403).json({ error: "Seller not verified" });

    return next();
  } catch (err) {
    console.error("requireVerifiedSeller:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};