const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const registerUser = async (req, res) => {
  const { full_name, email, password, phone_number, nearby_warehouse_id } = req.body;

  try {
    // Validate required fields
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      return res.status(400).json({ error: "full_name is required and must be a non-empty string" });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check for existing user
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Validate nearby_warehouse_id if provided – must be a positive integer
    let warehouseIdParam = null;
    if (nearby_warehouse_id !== undefined && nearby_warehouse_id !== null) {
      const wid = Number(nearby_warehouse_id);
      if (!Number.isInteger(wid) || wid <= 0) {
        return res.status(400).json({ error: "nearby_warehouse_id must be a positive integer" });
      }
      warehouseIdParam = wid;
    }

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, nearby_warehouse_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone_number, nearby_warehouse_id`,
      [full_name.trim(), normalizedEmail, password_hash, phone_number || null, warehouseIdParam]
    );

    return res.status(201).json({
      message: "User registered securely",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error("Register User Error:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }
    if (err.code === "23503") {
       return res.status(400).json({ error: "Invalid nearby_warehouse_id" });
    }

    return res.status(500).send("Server Error");
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "password is required and must be a string" });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await pool.query(
      'SELECT user_id, email, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { user_id: user.rows[0].user_id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Login User Error:", err.message);
    return res.status(500).send("Server Error");
  }
};

module.exports = { registerUser, loginUser };