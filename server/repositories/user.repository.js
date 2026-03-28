const pool = require("../config/db");

const findByEmail = async (email) => {
  const result = await pool.query(
    "SELECT user_id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
};

const createUser = async ({ full_name, email, password_hash, phone_number, nearby_warehouse_id }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Guard against duplicate email within the transaction
    const existing = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      const err = new Error("User already exists");
      err.statusCode = 409;
      err.code = "DUPLICATE_EMAIL";
      await client.query("ROLLBACK");
      throw err;
    }

    const result = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, nearby_warehouse_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone_number, nearby_warehouse_id`,
      [full_name, email, password_hash, phone_number ?? null, nearby_warehouse_id ?? null]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const findById = async (userId) => {
  const result = await pool.query(
    `SELECT user_id, full_name, email, phone_number, nearby_warehouse_id
     FROM users
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Update allowed profile fields for a user.
 */
const updateProfile = async (userId, { full_name, phone_number, nearby_warehouse_id }) => {
  const setClauses = [];
  const params = [];

  if (full_name !== undefined) {
    params.push(full_name);
    setClauses.push(`full_name = $${params.length}`);
  }
  if (phone_number !== undefined) {
    params.push(phone_number ?? null);
    setClauses.push(`phone_number = $${params.length}`);
  }
  if (nearby_warehouse_id !== undefined) {
    params.push(nearby_warehouse_id ?? null);
    setClauses.push(`nearby_warehouse_id = $${params.length}`);
  }

  if (setClauses.length === 0) return null;

  params.push(userId);
  const result = await pool.query(
    `UPDATE users
     SET ${setClauses.join(", ")}
     WHERE user_id = $${params.length}
     RETURNING user_id, full_name, email, phone_number, nearby_warehouse_id`,
    params
  );
  return result.rows[0] || null;
};

module.exports = {
  findByEmail,
  createUser,
  findById,
  updateProfile,
};
