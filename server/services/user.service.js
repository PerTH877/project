const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const registerUser = async ({ full_name, email, password, phone_number, nearby_warehouse_id }) => {
  if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
    const err = new Error("full_name is required and must be a non-empty string");
    err.statusCode = 400;
    throw err;
  }
  if (!email || typeof email !== "string") {
    const err = new Error("email is required and must be a string");
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== "string") {
    const err = new Error("password is required and must be a string");
    err.statusCode = 400;
    throw err;
  }

  let warehouseIdParam = null;
  if (nearby_warehouse_id !== undefined && nearby_warehouse_id !== null) {
    const wid = Number(nearby_warehouse_id);
    if (!Number.isInteger(wid) || wid <= 0) {
      const err = new Error("nearby_warehouse_id must be a positive integer");
      err.statusCode = 400;
      throw err;
    }
    warehouseIdParam = wid;
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const user = await userRepository.createUser({
      full_name: full_name.trim(),
      email: normalizeEmail(email),
      password_hash,
      phone_number: phone_number || null,
      nearby_warehouse_id: warehouseIdParam,
    });
    return user;
  } catch (err) {
    // Map DB constraint codes to domain errors
    if (err.code === "23505" || err.code === "DUPLICATE_EMAIL") {
      const e = new Error("User already exists");
      e.statusCode = 409;
      throw e;
    }
    if (err.code === "23503") {
      const e = new Error("Invalid nearby_warehouse_id");
      e.statusCode = 400;
      throw e;
    }
    throw err;
  }
};

const loginUser = async ({ email, password }) => {
  if (!email || typeof email !== "string") {
    const err = new Error("email is required and must be a string");
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== "string") {
    const err = new Error("password is required and must be a string");
    err.statusCode = 400;
    throw err;
  }

  const user = await userRepository.findByEmail(normalizeEmail(email));
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { token };
};

const getCurrentUser = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Update allowed profile fields. At least one field must be provided.
 */
const updateProfile = async (userId, data) => {
  const { full_name, phone_number, nearby_warehouse_id } = data;

  const hasUpdate = full_name !== undefined || phone_number !== undefined || nearby_warehouse_id !== undefined;
  if (!hasUpdate) {
    const err = new Error("Provide at least one of: full_name, phone_number, nearby_warehouse_id");
    err.statusCode = 400;
    throw err;
  }

  if (nearby_warehouse_id !== undefined && nearby_warehouse_id !== null) {
    const wid = Number(nearby_warehouse_id);
    if (!Number.isInteger(wid) || wid <= 0) {
      const err = new Error("nearby_warehouse_id must be a positive integer");
      err.statusCode = 400;
      throw err;
    }
  }

  const updated = await userRepository.updateProfile(userId, {
    full_name: full_name ? String(full_name).trim() : undefined,
    phone_number: phone_number !== undefined ? (phone_number || null) : undefined,
    nearby_warehouse_id: nearby_warehouse_id !== undefined ? (nearby_warehouse_id || null) : undefined,
  });

  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
};
