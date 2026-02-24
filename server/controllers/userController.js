const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
  const { full_name, email, password_hash, phone_number, nearby_warehouse_id } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userCheck.rows.length > 0) {
      return res.status(401).json("User already exists");
    }

    // hash password
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const bcryptPassword = await bcrypt.hash(password_hash, salt);

    const newUser = await pool.query(
      `INSERT INTO Users (full_name, email, password_hash, phone_number, nearby_warehouse_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone_number, nearby_warehouse_id`,
      [full_name, email, bcryptPassword, phone_number, nearby_warehouse_id]
    );

    res.status(201).json({ message: "User registered securely", user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // verify user existence
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // password match
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // jwt token
    const token = jwt.sign(
      { user_id: user.rows[0].user_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = { registerUser, loginUser };