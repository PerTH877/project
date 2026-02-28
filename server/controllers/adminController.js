const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: "Admin credentials are not configured on the server" });
    }

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "admin", email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("adminLogin:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const listPendingSellers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT seller_id, company_name, contact_email, gst_number, is_verified
       FROM Sellers
       WHERE is_verified = FALSE
       ORDER BY seller_id DESC`
    );

    return res.json({ sellers: result.rows });
  } catch (err) {
    console.error("listPendingSellers:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const verifySeller = async (req, res) => {
  try {
    const sellerId = Number(req.params.seller_id);
    if (!Number.isInteger(sellerId) || sellerId <= 0) {
      return res.status(400).json({ error: "seller_id must be a positive integer" });
    }

    const updated = await pool.query(
      `UPDATE Sellers
       SET is_verified = TRUE
       WHERE seller_id = $1
       RETURNING seller_id, company_name, contact_email, is_verified`,
      [sellerId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }

    return res.json({ message: "Seller verified", seller: updated.rows[0] });
  } catch (err) {
    console.error("verifySeller:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { adminLogin, listPendingSellers, verifySeller };