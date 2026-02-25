const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const token = jwt.sign(
    { role: "admin", email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return res.json({ token });
};

const listPendingSellers = async (req, res) => {
  const result = await pool.query(
    `SELECT seller_id, company_name, contact_email, gst_number, is_verified
     FROM Sellers
     WHERE is_verified = FALSE
     ORDER BY seller_id DESC`
  );

  return res.json({ sellers: result.rows });
};

const verifySeller = async (req, res) => {
  const { seller_id } = req.params;

  const updated = await pool.query(
    `UPDATE Sellers
     SET is_verified = TRUE
     WHERE seller_id = $1
     RETURNING seller_id, company_name, contact_email, is_verified`,
    [seller_id]
  );

  if (updated.rows.length === 0) {
    return res.status(404).json({ error: "Seller not found" });
  }

  return res.json({ message: "Seller verified", seller: updated.rows[0] });
};

module.exports = { adminLogin, listPendingSellers, verifySeller };