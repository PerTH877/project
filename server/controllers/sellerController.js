const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const registerSeller = async (req, res) => {
  const { company_name, contact_email, password, gst_number } = req.body;

  try {
    // Validation: ensure required fields are non-empty strings
    if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
      return res.status(400).json({ error: "company_name is required and must be a non-empty string" });
    }
    if (!contact_email || typeof contact_email !== 'string') {
      return res.status(400).json({ error: "contact_email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    const email = normalizeEmail(contact_email);

    // Check duplicate email
    const sellerCheck = await pool.query(
      'SELECT seller_id FROM Sellers WHERE contact_email = $1',
      [email]
    );

    if (sellerCheck.rows.length > 0) {
      return res.status(409).json({ error: "A seller with this email already exists" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const newSeller = await pool.query(
      `INSERT INTO Sellers (company_name, contact_email, password_hash, gst_number)
       VALUES ($1, $2, $3, $4)
       RETURNING seller_id, company_name, contact_email, gst_number, rating, is_verified, balance`,
      [company_name.trim(), email, password_hash, gst_number || null]
    );

    return res.status(201).json({
      message: "Seller registered successfully",
      seller: newSeller.rows[0],
    });
  } catch (err) {
    console.error("Register Seller Error:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "A seller with this email already exists" });
    }

    return res.status(500).send("Server Error");
  }
};

const loginSeller = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    const normalized = normalizeEmail(email);

    const seller = await pool.query(
      `SELECT seller_id, contact_email, password_hash, is_verified
       FROM Sellers
       WHERE contact_email = $1`,
      [normalized]
    );

    if (seller.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, seller.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!seller.rows[0].is_verified) {
      return res.status(403).json({ error: "Seller not verified" });
    }

    const token = jwt.sign(
      { seller_id: seller.rows[0].seller_id, role: "seller" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Login Seller Error:", err.message);
    return res.status(500).send("Server Error");
  }
};

module.exports = { registerSeller, loginSeller };